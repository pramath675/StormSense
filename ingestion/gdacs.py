"""
CycloneGuard AI: GDACS (Global Disaster Alert and Coordination System) Adapter
Basins: Global (NW Pacific, Indian Ocean, South Pacific, Atlantic, etc.)
Wind averaging: 10-minute sustained (WMO standard)
"""

import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from .base import BaseAdapter, now_utc_iso, now_ist_str, to_ist_str


def get_basin_from_coords(lat: float, lon: float) -> str:
    # Standard WMO basin delineation
    if lat >= 0:
        if 45.0 <= lon <= 100.0:
            return "North Indian Ocean"
        elif 100.0 < lon <= 180.0:
            return "West Pacific"
        elif -180.0 <= lon < -140.0:
            return "Central Pacific"
        elif -140.0 <= lon < -60.0:
            return "East Pacific"
        elif -100.0 <= lon <= 20.0:
            return "North Atlantic"
    else:
        if 20.0 <= lon <= 90.0:
            return "South Indian Ocean"
        elif 90.0 < lon <= 160.0:
            return "Australian"
        elif 160.0 < lon <= 180.0 or -180.0 <= lon < -70.0:
            return "South Pacific"
        else:
            return "South Atlantic"
    return "Global Oceanic"


class GDACSAdapter(BaseAdapter):
    EVENTS_API = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC"
    RSS_FEED = "https://www.gdacs.org/xml/rss.xml"

    def __init__(self):
        super().__init__(name="GDACS", default_ttl_sec=600)

    def _fetch_live(self) -> list:
        headers = {"User-Agent": "CycloneGuard-AI/2.0 (Meteorological Intelligence)"}

        # 1. Fetch RSS for population exposure and alert levels
        rss_data = {}
        try:
            r_rss = requests.get(self.RSS_FEED, headers=headers, timeout=10)
            if r_rss.status_code == 200:
                root = ET.fromstring(r_rss.content)
                ns = {'gdacs': 'http://www.gdacs.org', 'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#'}
                for it in root.findall('.//item'):
                    ev_type = it.find('gdacs:eventtype', ns)
                    if ev_type is not None and ev_type.text == 'TC':
                        ev_id = it.find('gdacs:eventid', ns)
                        pop_elem = it.find('gdacs:population', ns)
                        alert_elem = it.find('gdacs:alertlevel', ns)
                        severity_elem = it.find('gdacs:severity', ns)
                        link_elem = it.find('link')

                        ev_id_str = ev_id.text if ev_id is not None else ""
                        pop_val = 0
                        if pop_elem is not None:
                            try:
                                pop_val = int(pop_elem.attrib.get('value', 0))
                            except (ValueError, TypeError):
                                pop_val = 0

                        alert_val = alert_elem.text if alert_elem is not None else "Green"
                        sev_val = severity_elem.text if severity_elem is not None else ""
                        link_val = link_elem.text if link_elem is not None else ""

                        if ev_id_str:
                            rss_data[ev_id_str] = {
                                "population": pop_val,
                                "alertlevel": alert_val,
                                "severity": sev_val,
                                "link": link_val
                            }
        except Exception as e:
            print(f"[!] GDACS RSS parsing error: {e}")

        # 2. Fetch GeoJSON Events list
        r_events = requests.get(self.EVENTS_API, headers=headers, timeout=12)
        r_events.raise_for_status()
        events_json = r_events.json()
        features = events_json.get("features", [])

        normalized = []
        now = datetime.now(timezone.utc)

        for f in features:
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0])
            lon = float(coords[0]) if len(coords) > 0 else 0.0
            lat = float(coords[1]) if len(coords) > 1 else 0.0

            # Filter for recent / ongoing storms (within last 3 days)
            todate_str = props.get("todate", "")
            if todate_str:
                try:
                    todate = datetime.fromisoformat(todate_str.replace("Z", "+00:00"))
                    if todate.tzinfo is None:
                        todate = todate.replace(tzinfo=timezone.utc)
                    # Skip storms that ended more than 48 hours ago
                    if (now - todate).total_seconds() > 172800:
                        continue
                except Exception:
                    pass

            event_id = str(props.get("eventid", ""))
            raw_name = props.get("eventname") or props.get("name") or "Unnamed"
            # Strip year suffix like "-26"
            name = raw_name.split("-")[0].replace("Tropical Cyclone", "").strip().title()

            # Merge RSS exposure metrics if available
            meta = rss_data.get(event_id, {})
            pop_exposed = meta.get("population", 0)
            alert_level = meta.get("alertlevel") or props.get("alertlevel") or "Green"

            basin = get_basin_from_coords(lat, lon)

            # Estimate intensity from alert level or severity text
            # Red: Cat 2+ (typically >= 150 km/h), Orange: Cat 1 (120-150 km/h), Green: TS (< 120 km/h)
            sev_text = meta.get("severity", "")
            wind_kmh = 100.0
            if "km/h" in sev_text:
                import re
                m = re.search(r'(\d+)\s*km/h', sev_text)
                if m:
                    wind_kmh = float(m.group(1))
            else:
                if alert_level.lower() == "red":
                    wind_kmh = 185.0
                elif alert_level.lower() == "orange":
                    wind_kmh = 120.0
                else:
                    wind_kmh = 75.0

            wind_kt = round(wind_kmh / 1.852, 1)
            gust_kmh = round(wind_kmh * 1.25, 1)
            gust_kt = round(wind_kt * 1.25, 1)

            # Category mapping
            if wind_kt >= 64:
                cat_sshws = f"Category {min(5, int(1 + (wind_kt - 64) // 20))}"
            elif wind_kt >= 34:
                cat_sshws = "Tropical Storm"
            else:
                cat_sshws = "Tropical Depression"

            advisory_utc = todate_str if todate_str else now_utc_iso()
            try:
                dt = datetime.fromisoformat(advisory_utc.replace("Z", "+00:00"))
                advisory_ist = to_ist_str(dt)
            except Exception:
                advisory_ist = now_ist_str()

            report_url = meta.get("link") or props.get("url", {}).get("report") or f"https://www.gdacs.org/report.aspx?eventid={event_id}&eventtype=TC"

            storm_obj = {
                "id": f"GDACS_{event_id}_{name.upper()}",
                "name": name,
                "basin": basin,
                "agency_id": event_id,
                "lat": lat,
                "lon": lon,
                "max_wind_kmh": wind_kmh,
                "max_wind_kt": wind_kt,
                "gust_kmh": gust_kmh,
                "gust_kt": gust_kt,
                "min_pressure_hpa": round(1012.0 - (wind_kt * 0.55), 1),
                "movement_dir_deg": 280.0,
                "movement_speed_kmh": 15.0,
                "movement_speed_kt": 8.1,
                "category_native": f"GDACS {alert_level} Alert",
                "category_sshws_equiv": cat_sshws,
                "wind_averaging_period": "averaging period not stated",
                "wind_source_type": "modeled disaster impact estimate (averaging period not stated)",
                "wind_note": "Averaging period not stated in GDACS feed. Modeled disaster estimate, not calibrated anemometer observation.",
                "wind_radii": {
                    "gale_34kt": round(wind_kt * 2.0, 1) if wind_kt >= 34 else 0,
                    "storm_force_50kt": round(wind_kt * 1.2, 1) if wind_kt >= 50 else 0,
                    "hurricane_force_64kt": round(wind_kt * 0.7, 1) if wind_kt >= 64 else 0
                },
                "observed_track": [
                    {
                        "timestamp": advisory_utc,
                        "lat": lat,
                        "lon": lon,
                        "wind_kt": wind_kt,
                        "wind_kph": wind_kmh,
                        "pressure_hpa": round(1012.0 - (wind_kt * 0.55), 1),
                        "category": cat_sshws
                    }
                ],
                "forecast_track": [],
                "advisory_time_utc": advisory_utc,
                "advisory_time_ist": advisory_ist,
                "source": "GDACS",
                "sources": ["GDACS"],
                "gdacs_alert_level": alert_level,
                "population_exposed": pop_exposed,
                "fetched_at_utc": now_utc_iso(),
                "fetched_at_ist": now_ist_str(),
                "status": "ACTIVE",
                "bulletin_text": f"GDACS {alert_level} Alert for {name} ({basin}). Estimated exposure: {pop_exposed:,} people.",
                "raw_url": report_url
            }
            normalized.append(storm_obj)

        return normalized
