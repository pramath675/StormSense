"""
Test Suite: Multi-Basin Ingestion Adapters
Verifies parsing of NHC, JTWC, GDACS, and IMD adapters, wind averaging periods, and data schema normalization.
"""

import os
import unittest
from unittest import mock
from ingestion.nhc import NHCAdapter, get_sshws_category
from ingestion.jtwc import JTWCAdapter
from ingestion.gdacs import GDACSAdapter
from ingestion.imd import IMDAdapter
from tests.mock_network import mock_requests_get


class TestAdapters(unittest.TestCase):
    def test_sshws_scale_classification(self):
        """Verify standard Saffir-Simpson Hurricane Wind Scale categories."""
        self.assertEqual(get_sshws_category(140), "Category 5")
        self.assertEqual(get_sshws_category(120), "Category 4")
        self.assertEqual(get_sshws_category(100), "Category 3")
        self.assertEqual(get_sshws_category(85), "Category 2")
        self.assertEqual(get_sshws_category(65), "Category 1")
        self.assertEqual(get_sshws_category(45), "Tropical Storm")
        self.assertEqual(get_sshws_category(25), "Tropical Depression")

    def test_jtwc_warning_text_parser(self):
        """Verify JTWC raw warning text regex parsing with 1-min wind averaging."""
        sample_warning = """
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
        adapter = JTWCAdapter()
        with mock.patch("requests.get") as mock_get:
            mock_resp = mock.MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = sample_warning
            mock_get.return_value = mock_resp

            parsed = adapter._parse_warning_text("https://example.com/wp2926web.txt", {})
            self.assertIsNotNone(parsed)
            self.assertEqual(parsed["name"], "Champi")
            self.assertEqual(parsed["basin"], "West Pacific")
            self.assertEqual(parsed["lat"], 12.5)
            self.assertEqual(parsed["lon"], 147.3)
            self.assertEqual(parsed["max_wind_kt"], 115.0)
            self.assertEqual(parsed["max_wind_kmh"], 213.0)
            self.assertEqual(parsed["wind_averaging_period"], "1-min")
            self.assertEqual(parsed["source"], "JTWC")
            self.assertEqual(len(parsed["forecast_track"]), 2)
            self.assertEqual(parsed["forecast_track"][0]["hour"], 12)
            self.assertEqual(parsed["forecast_track"][0]["wind_kt"], 130.0)

    @mock.patch("requests.get", side_effect=mock_requests_get)
    def test_nhc_adapter_schema(self, mock_get):
        """Verify NHC adapter output schema conformance using offline fixtures."""
        adapter = NHCAdapter()
        storms = adapter.fetch(force=True)
        self.assertGreaterEqual(len(storms), 1)
        for s in storms:
            self.assertIn("id", s)
            self.assertIn("name", s)
            self.assertIn("basin", s)
            self.assertIn("max_wind_kmh", s)
            self.assertIn("wind_averaging_period", s)
            self.assertEqual(s["wind_averaging_period"], "1-min")
            self.assertEqual(s["source"], "NOAA NHC")

    @mock.patch("requests.get", side_effect=mock_requests_get)
    def test_gdacs_wind_averaging_period(self, mock_get):
        """Verify GDACS adapter states 'averaging period not stated' and flags modeled estimate."""
        adapter = GDACSAdapter()
        storms = adapter.fetch(force=True)
        self.assertGreaterEqual(len(storms), 1)
        for s in storms:
            self.assertEqual(s["wind_averaging_period"], "averaging period not stated")
            self.assertIn("not stated", s.get("wind_source_type", ""))

    @mock.patch("requests.get", side_effect=mock_requests_get)
    def test_imd_truthful_attribution(self, mock_get):
        """Verify IMD adapter reports DEGRADED and never invents storm data."""
        adapter = IMDAdapter()
        storms = adapter.fetch(force=True)
        self.assertEqual(len(storms), 0)
        health = adapter.get_health()
        self.assertEqual(health["status"], "DEGRADED")
        self.assertIn("PDF", health.get("note", ""))

    @unittest.skipUnless(os.environ.get("RUN_LIVE_TESTS"), "Skipping live network test. Set RUN_LIVE_TESTS=1 to run.")
    def test_optional_live_network_probe(self):
        """Optional live network integration test (skipped by default)."""
        import requests
        r = requests.get("https://www.nhc.noaa.gov/index-at.xml", headers={"User-Agent": "CycloneGuard/LiveTest"}, timeout=10)
        self.assertEqual(r.status_code, 200)


if __name__ == "__main__":
    unittest.main()
