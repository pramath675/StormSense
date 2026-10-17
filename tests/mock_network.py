"""
CycloneGuard AI: Mock Network Fixture Router
Intercepts requests.get calls and serves saved real feeds from tests/fixtures/.
Ensures test suite is 100% deterministic, offline, and instant (<0.5s execution).
"""

import os
import json
from unittest.mock import MagicMock

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def mock_requests_get(url, *args, **kwargs):
    """Routes requests.get to local fixture files."""
    url_str = str(url).lower()
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    if "currentstorms.json" in url_str:
        path = os.path.join(FIXTURES_DIR, "nhc_current_storms.json")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
        mock_resp.json = lambda: json.loads(content)
    elif "nhc.noaa.gov/index-at.xml" in url_str:
        path = os.path.join(FIXTURES_DIR, "nhc_at.xml")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
    elif "nhc.noaa.gov/index-ep.xml" in url_str:
        path = os.path.join(FIXTURES_DIR, "nhc_ep.xml")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
    elif "jtwc.rss" in url_str:
        path = os.path.join(FIXTURES_DIR, "jtwc.rss")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
    elif ".txt" in url_str and ("jtwc" in url_str or "metoc" in url_str):
        mock_resp.text = """
WTPN32 PGTW 170900
MSGID/GENADMIN/JOINT TYPHOON WRNCEN PEARL HARBOR HI//
SUBJ/TYPHOON 29W (CHAMPI) WARNING NR 012//
RMKS/
1. TYPHOON 29W (CHAMPI) WARNING NR 012
   WARNING POSITION:
   170600Z --- NEAR 12.5N 147.3E
     MOVEMENT PAST SIX HOURS - 280 DEGREES AT 13 KTS
   PRESENT WIND DISTRIBUTION:
   MAX SUSTAINED WINDS - 115 KT, GUSTS 140 KT
   RADIUS OF 064 KT WINDS - 045 NM NORTHEAST QUADRANT
   RADIUS OF 050 KT WINDS - 055 NM NORTHEAST QUADRANT
   RADIUS OF 034 KT WINDS - 110 NM NORTHEAST QUADRANT
    ---
   12 HRS, VALID AT:
   171800Z --- 13.0N 144.8E
   MAX SUSTAINED WINDS - 130 KT, GUSTS 160 KT
    ---
   24 HRS, VALID AT:
   180600Z --- 13.4N 142.5E
   MAX SUSTAINED WINDS - 140 KT, GUSTS 170 KT
"""
        mock_resp.content = mock_resp.text.encode("utf-8")
    elif "gdacs.org/xml/rss.xml" in url_str:
        path = os.path.join(FIXTURES_DIR, "gdacs_rss.xml")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
    elif "gdacs.org/gdacsapi/api/events" in url_str:
        path = os.path.join(FIXTURES_DIR, "gdacs_events.json")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
        mock_resp.json = lambda: json.loads(content)
    elif "rsmcnewdelhi.imd.gov.in" in url_str:
        path = os.path.join(FIXTURES_DIR, "imd_homepage.html")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
    elif "geocoding-api.open-meteo.com" in url_str:
        name = "Miami" if "miami" in url_str else "Tokyo"
        lat = 25.7617 if name == "Miami" else 35.6895
        lon = -80.1918 if name == "Miami" else 139.6917
        country = "United States" if name == "Miami" else "Japan"
        geo_data = {
            "results": [
                {
                    "name": name,
                    "country": country,
                    "latitude": lat,
                    "longitude": lon
                }
            ]
        }
        mock_resp.json = lambda: geo_data
        mock_resp.text = json.dumps(geo_data)
        mock_resp.content = mock_resp.text.encode("utf-8")
    elif "api.open-meteo.com" in url_str:
        path = os.path.join(FIXTURES_DIR, "open_meteo_forecast.json")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        mock_resp.text = content
        mock_resp.content = content.encode("utf-8")
        mock_resp.json = lambda: json.loads(content)
    elif "gibs.earthdata.nasa.gov" in url_str:
        mock_resp.text = "<WMS_Capabilities></WMS_Capabilities>"
        mock_resp.content = mock_resp.text.encode("utf-8")
    else:
        mock_resp.text = "{}"
        mock_resp.content = b"{}"
        mock_resp.json = lambda: {}

    return mock_resp
