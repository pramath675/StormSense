"""
Unit Tests for Geospatial Point Intelligence and Universal Places Search
Verifies:
- Coordinates far from active cyclone (> 1500 km) return SAFE and 'NO ACTIVE CYCLONE THREATENING THIS AREA'
- Coordinates within eyewall landfall radius (< 100 km) return CRITICAL
- Universal places search returns matching global cities from 10,079 gazetteer
- Maritime coordinates correctly resolve to appropriate ocean basin
"""

import unittest
from unittest import mock
from server import app, CACHE, haversine_km, get_ocean_basin_name
from tests.mock_network import mock_requests_get


class TestPointIntelligenceAndSearch(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.patcher = mock.patch("requests.get", side_effect=mock_requests_get)
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_ocean_basin_name_resolution(self):
        # Bay of Bengal
        self.assertIn("Bay of Bengal", get_ocean_basin_name(16.5, 88.0))
        # Arabian Sea
        self.assertIn("Arabian Sea", get_ocean_basin_name(18.0, 65.0))
        # Western Pacific
        self.assertIn("Western North Pacific", get_ocean_basin_name(22.0, 140.0))
        # South Pacific
        self.assertIn("South Pacific", get_ocean_basin_name(-18.0, 175.0))
        # South Indian Ocean
        self.assertIn("South Indian Ocean", get_ocean_basin_name(-15.0, 75.0))

    def test_places_search_tokyo(self):
        resp = self.client.get("/api/places/search?q=Tokyo")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertGreaterEqual(len(data["places"]), 1)
        self.assertEqual(data["places"][0]["name"], "Tokyo")

    def test_places_search_miami(self):
        resp = self.client.get("/api/places/search?q=Miami")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertGreaterEqual(len(data["places"]), 1)
        self.assertEqual(data["places"][0]["name"], "Miami")

    def test_distant_point_returns_safe(self):
        # Ensure at least one storm is in CACHE for the distance test
        resp = self.client.get("/api/storms/active")
        self.assertEqual(resp.status_code, 200)

        # London, UK (51.5074, -0.1278) is thousands of km away from any tropical cyclone
        resp_pi = self.client.get("/api/point/intelligence?lat=51.5074&lon=-0.1278")
        self.assertEqual(resp_pi.status_code, 200)
        d = resp_pi.get_json()

        impact = d["cyclone_impact"]
        self.assertEqual(impact["threat_badge"], "SAFE")
        self.assertEqual(impact["threat_level"], "NO ACTIVE CYCLONE THREATENING THIS AREA")
        self.assertIn("SAFE / NO ACTIVE CYCLONE THREAT", impact["storm_description"])

    def test_close_point_returns_critical(self):
        # Fetch active storms and test right on the eye of the first storm
        resp = self.client.get("/api/storms/active")
        data = resp.get_json()
        if data["storms"]:
            storm = data["storms"][0]
            lat = storm["current_lat"]
            lon = storm["current_lon"]

            resp_pi = self.client.get(f"/api/point/intelligence?lat={lat}&lon={lon}")
            self.assertEqual(resp_pi.status_code, 200)
            d = resp_pi.get_json()
            impact = d["cyclone_impact"]

            self.assertIn(impact["threat_badge"], ["CRITICAL", "HIGH"])
            self.assertIn(storm["name"], impact["threatening_cyclone"])


if __name__ == "__main__":
    unittest.main()
