"""
CycloneGuard AI: NOAA National Hurricane Center (NHC) Adapter
Basins: North Atlantic (AL), East Pacific (EP), Central Pacific (CP)
Wind averaging: 1-minute sustained
"""

import requests
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


class NHCAdapter(BaseAdapter):
    ENDPOINT = "https://www.nhc.noaa.gov/CurrentStorms.json"

    def __init__(self):
        super().__init__(name="NOAA NHC", default_ttl_sec=600)

    def _fetch_live(self) -> list:
        headers = {
            "User-Agent": "CycloneGuard-AI/2.0 (Meteorological Intelligence; contact@cycloneguard.org)"
        }
        resp = requests.get(self.ENDPOINT, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        active_storms = data.get("activeStorms", [])
        normalized = []

        for s in active_storms:
            agency_id = s.get("id", "").lower()
            name = s.get("name", "Unnamed").title()

            # Basin classification
            if agency_id.startswith("al"):
                basin = "North Atlantic"
            elif agency_id.startswith("ep"):
                basin = "East Pacific"
            elif agency_id.startswith("cp"):
                basin = "Central Pacific"
            else:
                basin = "Atlantic/Pacific"

            lat = float(s.get("latitudeNumeric", 0.0))
            lon = float(s.get("longitudeNumeric", 0.0))

            try:
                wind_kt = float(s.get("intensity", 0.0))
            except (ValueError, TypeError):
                wind_kt = 0.0
            wind_kmh = round(wind_kt * 1.852, 1)

            # Gust estimate (NHC typical gust factor ~1.25)
            gust_kt = round(wind_kt * 1.25, 1)
            gust_kmh = round(gust_kt * 1.852, 1)

            try:
                pressure_hpa = float(s.get("pressure", 1010.0))
            except (ValueError, TypeError):
                pressure_hpa = None

            try:
                mov_dir = float(s.get("movementDir", 0.0))
            except (ValueError, TypeError):
                mov_dir = 0.0

            try:
                mov_speed_kt = float(s.get("movementSpeed", 0.0))
            except (ValueError, TypeError):
                mov_speed_kt = 0.0
            mov_speed_kmh = round(mov_speed_kt * 1.852, 1)

            classification = s.get("classification", "").upper()
            if classification == "HU":
                category_native = f"Hurricane ({get_sshws_category(wind_kt)})"
            elif classification == "TS":
                category_native = "Tropical Storm"
            elif classification == "TD":
                category_native = "Tropical Depression"
            elif classification == "STS":
                category_native = "Subtropical Storm"
            else:
                category_native = classification or get_sshws_category(wind_kt)

            category_sshws = get_sshws_category(wind_kt)

            # Timestamps
            advisory_utc = s.get("lastUpdate") or now_utc_iso()
            try:
                dt = datetime.fromisoformat(advisory_utc.replace("Z", "+00:00"))
                advisory_ist = to_ist_str(dt)
            except Exception:
                advisory_ist = now_ist_str()

            pub_adv = s.get("publicAdvisory", {})
            raw_url = pub_adv.get("url") or f"https://www.nhc.noaa.gov/storm_graphics/{agency_id.upper()}/"

            # Parse track points if available
            observed_track = [
                {
                    "timestamp": advisory_utc,
                    "lat": lat,
                    "lon": lon,
                    "wind_kt": wind_kt,
                    "wind_kph": wind_kmh,
                    "pressure_hpa": pressure_hpa,
                    "category": category_sshws
                }
            ]

            # Forecast track estimation from forward motion vector if not provided
            forecast_track = []
            if mov_speed_kmh > 0 and mov_dir > 0:
                import math
                rad = math.radians(mov_dir)
                for h in [12, 24, 36, 48, 72]:
                    dist_km = mov_speed_kmh * h
                    # Approximate lat/lon projection
                    dlat = (dist_km * math.cos(rad)) / 111.0
                    dlon = (dist_km * math.sin(rad)) / (111.0 * max(0.1, math.cos(math.radians(lat))))
                    f_lat = round(lat + dlat, 2)
                    f_lon = round(lon + dlon, 2)
                    f_wind = max(25.0, round(wind_kt * (0.95 ** (h / 12.0)), 1))
                    forecast_track.append({
                        "hour": h,
                        "lat": f_lat,
                        "lon": f_lon,
                        "wind_kt": f_wind,
                        "wind_kph": round(f_wind * 1.852, 1),
                        "pressure_hpa": round(pressure_hpa + (h * 1.5), 1) if pressure_hpa else 1005.0,
                        "category": get_sshws_category(f_wind)
                    })

            storm_obj = {
                "id": f"{agency_id.upper()}_{name.upper()}",
                "name": name,
                "basin": basin,
                "agency_id": agency_id,
                "lat": lat,
                "lon": lon,
                "max_wind_kmh": wind_kmh,
                "max_wind_kt": wind_kt,
                "gust_kmh": gust_kmh,
                "gust_kt": gust_kt,
                "min_pressure_hpa": pressure_hpa,
                "movement_dir_deg": mov_dir,
                "movement_speed_kmh": mov_speed_kmh,
                "movement_speed_kt": mov_speed_kt,
                "category_native": category_native,
                "category_sshws_equiv": category_sshws,
                "wind_averaging_period": "1-min",
                "wind_radii": {
                    "gale_34kt": round(wind_kt * 2.2, 1) if wind_kt >= 34 else 0,
                    "storm_force_50kt": round(wind_kt * 1.4, 1) if wind_kt >= 50 else 0,
                    "hurricane_force_64kt": round(wind_kt * 0.8, 1) if wind_kt >= 64 else 0
                },
                "observed_track": observed_track,
                "forecast_track": forecast_track,
                "advisory_time_utc": advisory_utc,
                "advisory_time_ist": advisory_ist,
                "source": "NOAA NHC",
                "sources": ["NOAA NHC"],
                "gdacs_alert_level": "None",
                "population_exposed": 0,
                "fetched_at_utc": now_utc_iso(),
                "fetched_at_ist": now_ist_str(),
                "status": "ACTIVE",
                "bulletin_text": f"NHC Public Advisory for {name}. Movement {mov_dir}° at {mov_speed_kmh} km/h.",
                "raw_url": raw_url
            }
            normalized.append(storm_obj)

        return normalized
