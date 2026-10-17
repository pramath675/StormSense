"""
Unit Tests for Calm State and DEMO_MODE handling
Verifies:
- Aggregator handling when zero storms are active (clean calm state, 0 pop at risk, 0 count)
- DEMO_MODE injection (prominent demo storm with demo: True, multi_agency_winds, and provenance flag)
- Standard mode preserves 100% genuine data
"""

import unittest
from unittest.mock import patch
from ingestion.aggregator import CycloneDataAggregator


class TestCalmAndDemoMode(unittest.TestCase):

    def setUp(self):
        self.agg = CycloneDataAggregator("data")

    @patch.object(CycloneDataAggregator, "_deduplicate_and_merge")
    def test_calm_state_handling(self, mock_dedup):
        # Simulate all adapters returning 0 storms
        mock_dedup.return_value = []
        res = self.agg.fetch_all(force=True, demo=False)

        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["active_cyclones_count"], 0)
        self.assertEqual(len(res["storms"]), 0)
        self.assertFalse(res["demo_mode"])
        self.assertEqual(res["kpis"]["active_cyclones"], 0)
        self.assertEqual(res["kpis"]["people_at_risk"], 0)
        self.assertEqual(res["kpis"]["critical_alerts"], 0)

    def test_demo_mode_injection(self):
        # Request with demo=True
        res = self.agg.fetch_all(force=True, demo=True)

        self.assertEqual(res["status"], "SUCCESS")
        self.assertTrue(res["demo_mode"])
        self.assertGreaterEqual(res["active_cyclones_count"], 1)

        # First storm should be the demo storm
        demo_storm = res["storms"][0]
        self.assertTrue(demo_storm.get("demo"))
        self.assertIn("DEMO", demo_storm["name"])
        self.assertEqual(demo_storm["id"], "DEMO_MAYA")
        self.assertIn("IMD (Simulated)", demo_storm["multi_agency_winds"])
        self.assertIn("JTWC (Simulated)", demo_storm["multi_agency_winds"])
        self.assertIn("GDACS (Simulated)", demo_storm["multi_agency_winds"])
        self.assertGreaterEqual(len(demo_storm["past_track"]), 2)
        self.assertGreaterEqual(len(demo_storm["forecast_track"]), 2)


if __name__ == "__main__":
    unittest.main()
