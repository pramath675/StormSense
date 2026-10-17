"""
Test Suite: Aggregator Deduplication & KPI Computation
Verifies spatial (<150km) storm clustering, multi-agency wind preservation,
single-count critical alerts, and no double-counting of exposed populations.
"""

import unittest
from ingestion.aggregator import CycloneDataAggregator


class TestMergeLogic(unittest.TestCase):
    def test_spatial_deduplication_and_multi_agency_winds(self):
        """Verify that observations within 150 km merge into one storm with multi-agency wind data."""
        agg = CycloneDataAggregator(data_dir="data")

        storm_jtwc = {
            "id": "JTWC_29W_CHAMPI",
            "name": "Champi",
            "basin": "West Pacific",
            "agency_id": "29W",
            "lat": 12.5,
            "lon": 147.3,
            "max_wind_kmh": 213.0,
            "max_wind_kt": 115.0,
            "gust_kmh": 259.0,
            "gust_kt": 140.0,
            "min_pressure_hpa": 940.0,
            "movement_dir_deg": 280.0,
            "movement_speed_kmh": 24.1,
            "movement_speed_kt": 13.0,
            "category_native": "Typhoon",
            "category_sshws_equiv": "Category 4",
            "wind_averaging_period": "1-min",
            "wind_radii": {"gale_34kt": 200, "storm_force_50kt": 120, "hurricane_force_64kt": 70},
            "observed_track": [],
            "forecast_track": [{"hour": 12, "lat": 13.0, "lon": 144.8, "wind_kt": 130}],
            "source": "JTWC",
            "sources": ["JTWC"],
            "gdacs_alert_level": "None",
            "population_exposed": 0
        }

        storm_gdacs = {
            "id": "GDACS_1001338_CHAMPI",
            "name": "Champi",
            "basin": "West Pacific",
            "agency_id": "1001338",
            "lat": 12.4,   # ~15 km away
            "lon": 147.4,
            "max_wind_kmh": 241.0,
            "max_wind_kt": 130.1,
            "gust_kmh": 300.0,
            "gust_kt": 162.0,
            "min_pressure_hpa": 930.0,
            "movement_dir_deg": 280.0,
            "movement_speed_kmh": 20.0,
            "movement_speed_kt": 10.8,
            "category_native": "GDACS Red Alert",
            "category_sshws_equiv": "Category 4",
            "wind_averaging_period": "10-min",
            "wind_radii": {"gale_34kt": 220, "storm_force_50kt": 130, "hurricane_force_64kt": 80},
            "observed_track": [],
            "forecast_track": [],
            "source": "GDACS",
            "sources": ["GDACS"],
            "gdacs_alert_level": "Red",
            "population_exposed": 175254
        }

        merged = agg._deduplicate_and_merge([storm_jtwc, storm_gdacs])

        self.assertEqual(len(merged), 1, "Should merge into exactly 1 canonical storm")
        m = merged[0]
        self.assertEqual(m["name"], "Champi")
        self.assertEqual(set(m["sources"]), {"JTWC", "GDACS"})
        self.assertEqual(m["population_exposed"], 175254, "Should retain GDACS population exposure")
        self.assertEqual(m["gdacs_alert_level"], "Red", "Should retain GDACS Red alert level")

        # Verify multi-agency winds are preserved with distinct averaging periods
        self.assertIn("JTWC", m["multi_agency_winds"])
        self.assertIn("GDACS", m["multi_agency_winds"])
        self.assertEqual(m["multi_agency_winds"]["JTWC"]["averaging_period"], "1-min")
        self.assertEqual(m["multi_agency_winds"]["GDACS"]["averaging_period"], "10-min")

    def test_kpi_computation_rules(self):
        """Verify KPIs count each storm once for critical alerts and do not double-count population exposure."""
        agg = CycloneDataAggregator(data_dir="data")

        storms = [
            {
                "id": "STORM_1",
                "name": "Champi",
                "lat": 12.5,
                "lon": 147.3,
                "max_wind_kt": 115,  # Cat 4 -> Critical
                "category_native": "Typhoon",
                "gdacs_alert_level": "Red", # Red -> Critical
                "population_exposed": 175254
            },
            {
                "id": "STORM_2",
                "name": "Simon",
                "lat": 16.0,
                "lon": -108.0,
                "max_wind_kt": 30,
                "category_native": "GDACS Orange Alert",
                "gdacs_alert_level": "Orange", # Orange -> Critical
                "population_exposed": 62
            },
            {
                "id": "STORM_3",
                "name": "CalmOne",
                "lat": -10.0,
                "lon": 60.0,
                "max_wind_kt": 25,
                "category_native": "Tropical Depression",
                "gdacs_alert_level": "Green",
                "population_exposed": 0
            }
        ]

        kpis = agg._compute_kpis(storms)

        self.assertEqual(kpis["active_cyclones"], 3)
        # STORM_1 is Cat 4 AND Red alert, but must only be counted ONCE for critical alerts!
        # STORM_2 is Orange alert -> counted ONCE.
        # STORM_3 is Green / Cat 0 -> not critical.
        self.assertEqual(kpis["critical_alerts"], 2, "Each critical storm must be counted exactly once")

        # Population exposure must sum exactly without duplication
        self.assertEqual(kpis["people_at_risk"], 175254 + 62)
        self.assertEqual(kpis["people_at_risk_label"], "estimated exposure (GDACS)")


if __name__ == "__main__":
    unittest.main()
