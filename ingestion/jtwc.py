"""
CycloneGuard AI: JTWC (Joint Typhoon Warning Center) Adapter
Basins: NW Pacific (WP), North Indian Ocean (IO/BB/AA), South Indian Ocean (SH/SI), South Pacific (SP/P), Central/East Pacific (CP/EP)
Wind averaging: 1-minute sustained
Parses live ATCF warning text bulletins directly from JTWC.
"""

import requests
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from .base import BaseAdapter, now_utc_iso, now_ist_str, to_ist_str


def get_sshws_category(wind_kt: float) -> str:
    if wind_kt >= 137:
        return "Category 5"
    elif wind_kt >= 113:
        return "Category 4"
    elif wind_kt >= 96:
        return "Category 3"
    elif wind_kt >= 83:
        return "Category 2"
    elif wind_kt >= 64:
        return "Category 1"
    elif wind_kt >= 34:
        return "Tropical Storm"
    else:
        return "Tropical Depression"


def get_basin_from_code(code: str, lat: float, lon: float) -> str:
    code = code.upper()
    if "W" in code:
        return "West Pacific"
    elif any(k in code for k in ["B", "A", "IO"]):
        return "North Indian Ocean"
    elif any(k in code for k in ["S", "SH", "SI"]):
        return "South Indian Ocean"
    elif any(k in code for k in ["P", "SP"]):
        return "South Pacific"
    elif "E" in code or "EP" in code:
        return "East Pacific"
    elif "C" in code or "CP" in code:
        return "Central Pacific"
    # Coordinate fallback
    if lat >= 0 and 45 <= lon <= 100:
        return "North Indian Ocean"
    elif lat >= 0 and 100 < lon <= 180:
        return "West Pacific"
    elif lat < 0:
        return "South Indian Ocean" if 20 <= lon <= 120 else "South Pacific"
    return "Global Oceanic"


class JTWCAdapter(BaseAdapter):
    RSS_URL = "https://www.metoc.navy.mil/jtwc/rss/jtwc.rss"

    def __init__(self):
        super().__init__(name="JTWC", default_ttl_sec=600)

    def _fetch_live(self) -> list:
        headers = {"User-Agent": "CycloneGuard-AI/2.0 (Meteorological Intelligence)"}
        resp = requests.get(self.RSS_URL, headers=headers, timeout=10)
        resp.raise_for_status()

        root = ET.fromstring(resp.content)
        normalized = []

        for item in root.findall(".//item"):
            desc = item.find("description")
            if desc is None or not desc.text:
                continue

            desc_text = desc.text
            # Look for links to warning text files (e.g. wp2926web.txt, ep2126web.txt, sh0127web.txt)
            txt_links = re.findall(r"href=['\"]([^'\"]+web\.txt)['\"]", desc_text)
            for link in txt_links:
                try:
                    storm_data = self._parse_warning_text(link, headers)
                    if storm_data:
                        normalized.append(storm_data)
                except Exception as e:
                    print(f"[!] Error parsing JTWC warning {link}: {e}")

        return normalized

    def _parse_warning_text(self, url: str, headers: dict) -> dict:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            return None
        text = r.text

        # 1. Subject line (e.g. SUBJ/TYPHOON 29W (CHAMPI) WARNING NR 012//)
        subj_m = re.search(r"SUBJ/([^/]+)//", text)
        title = subj_m.group(1).strip() if subj_m else "JTWC Tropical Cyclone Warning"

        # Extract name & code
        name = "Unnamed"
        code = "TC"
        name_m = re.search(r"(?:TYPHOON|HURRICANE|TROPICAL CYCLONE|TROPICAL DEPRESSION|SUPER TYPHOON)\s+([\w\d]+)\s*\(([\w\s\d]+)\)", title, re.IGNORECASE)
        if name_m:
            code = name_m.group(1).strip()
            name = name_m.group(2).strip().title()
        else:
            # Alternate pattern
            code_m = re.search(r"(\d+[A-Z])", title)
            if code_m:
                code = code_m.group(1)
                name = code

        # 2. Warning Position
        pos_m = re.search(r"WARNING POSITION:\s*\n\s*(\w+)\s*---\s*NEAR\s*([\d\.]+)([NS])\s*([\d\.]+)([EW])", text)
        if not pos_m:
            return None

        time_tag = pos_m.group(1)
        lat = float(pos_m.group(2)) * (1 if pos_m.group(3) == "N" else -1)
        lon = float(pos_m.group(4)) * (1 if pos_m.group(5) == "E" else -1)

        # 3. Movement
        mov_dir = 0.0
        mov_speed_kt = 0.0
        mov_m = re.search(r"MOVEMENT PAST SIX HOURS\s*-\s*(\d+)\s*DEGREES\s*AT\s*(\d+)\s*KTS", text)
        if mov_m:
            mov_dir = float(mov_m.group(1))
            mov_speed_kt = float(mov_m.group(2))
        mov_speed_kmh = round(mov_speed_kt * 1.852, 1)

        # 4. Sustained Winds & Gusts
        wind_kt = 35.0
        gust_kt = 45.0
        wind_m = re.search(r"MAX SUSTAINED WINDS\s*-\s*(\d+)\s*KT,\s*GUSTS\s*(\d+)\s*KT", text)
        if wind_m:
            wind_kt = float(wind_m.group(1))
            gust_kt = float(wind_m.group(2))
        wind_kmh = round(wind_kt * 1.852, 1)
        gust_kmh = round(gust_kt * 1.852, 1)

        # 5. Wind Radii
        r64, r50, r34 = 0, 0, 0
        r64_m = re.search(r"RADIUS OF 064 KT WINDS\s*-\s*(\d+)\s*NM", text)
        if r64_m:
            r64 = int(round(float(r64_m.group(1)) * 1.852))
        r50_m = re.search(r"RADIUS OF 050 KT WINDS\s*-\s*(\d+)\s*NM", text)
        if r50_m:
            r50 = int(round(float(r50_m.group(1)) * 1.852))
        r34_m = re.search(r"RADIUS OF 034 KT WINDS\s*-\s*(\d+)\s*NM", text)
        if r34_m:
            r34 = int(round(float(r34_m.group(1)) * 1.852))

        # 6. Forecast Points
        forecast_track = []
        f_matches = re.findall(
            r"(\d+)\s*HRS,\s*VALID AT:\s*\n\s*(\w+)\s*---\s*([\d\.]+)([NS])\s*([\d\.]+)([EW]).*?MAX SUSTAINED WINDS\s*-\s*(\d+)\s*KT,\s*GUSTS\s*(\d+)\s*KT",
            text,
            re.DOTALL
        )
        for fm in f_matches:
            f_hr = int(fm[0])
            f_lat = float(fm[2]) * (1 if fm[3] == "N" else -1)
            f_lon = float(fm[4]) * (1 if fm[5] == "E" else -1)
            f_wkt = float(fm[6])
            f_gkt = float(fm[7])
            forecast_track.append({
                "hour": f_hr,
                "lat": round(f_lat, 2),
                "lon": round(f_lon, 2),
                "wind_kt": f_wkt,
                "wind_kph": round(f_wkt * 1.852, 1),
                "gust_kph": round(f_gkt * 1.852, 1),
                "pressure_hpa": round(1012.0 - (f_wkt * 0.6), 1),
                "category": get_sshws_category(f_wkt)
            })

        basin = get_basin_from_code(code, lat, lon)
        category_sshws = get_sshws_category(wind_kt)

        # Native classification for JTWC: Typhoon / Super Typhoon for WP; Tropical Cyclone for SH/IO; Hurricane for EP
        if "WP" in code or basin == "West Pacific":
            category_native = "Super Typhoon" if wind_kt >= 130 else "Typhoon" if wind_kt >= 64 else category_sshws
        elif "EP" in code or basin == "East Pacific":
            category_native = f"Hurricane ({category_sshws})" if wind_kt >= 64 else category_sshws
        else:
            category_native = f"Tropical Cyclone ({category_sshws})"

        advisory_utc = now_utc_iso()
        advisory_ist = now_ist_str()

        # Estimated pressure based on Atkinson-Holliday wind-pressure relation
        est_pressure = round(1012.0 - (wind_kt * 0.62), 1)

        return {
            "id": f"JTWC_{code}_{name.upper()}",
            "name": name,
            "basin": basin,
            "agency_id": code,
            "lat": lat,
            "lon": lon,
            "max_wind_kmh": wind_kmh,
            "max_wind_kt": wind_kt,
            "gust_kmh": gust_kmh,
            "gust_kt": gust_kt,
            "min_pressure_hpa": est_pressure,
            "movement_dir_deg": mov_dir,
            "movement_speed_kmh": mov_speed_kmh,
            "movement_speed_kt": mov_speed_kt,
            "category_native": category_native,
            "category_sshws_equiv": category_sshws,
            "wind_averaging_period": "1-min",
            "wind_radii": {
                "gale_34kt": r34 or round(wind_kt * 2.1, 1),
                "storm_force_50kt": r50 or round(wind_kt * 1.3, 1),
                "hurricane_force_64kt": r64 or round(wind_kt * 0.75, 1)
            },
            "observed_track": [
                {
                    "timestamp": advisory_utc,
                    "lat": lat,
                    "lon": lon,
                    "wind_kt": wind_kt,
                    "wind_kph": wind_kmh,
                    "pressure_hpa": est_pressure,
                    "category": category_sshws
                }
            ],
            "forecast_track": forecast_track,
            "advisory_time_utc": advisory_utc,
            "advisory_time_ist": advisory_ist,
            "source": "JTWC",
            "sources": ["JTWC"],
            "gdacs_alert_level": "None",
            "population_exposed": 0,
            "fetched_at_utc": now_utc_iso(),
            "fetched_at_ist": now_ist_str(),
            "status": "ACTIVE",
            "bulletin_text": f"JTWC Warning for {title}. Sustained winds: {wind_kmh} km/h, heading {mov_dir}° at {mov_speed_kmh} km/h.",
            "raw_url": url
        }
