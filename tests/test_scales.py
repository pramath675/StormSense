"""
Unit Tests for Basin-Correct Meteorological Intensity Scales
Verifies:
- IMD Scale (North Indian Ocean)
- SSHWS Scale (Atlantic, Eastern Pacific)
- JMA/JTWC Scale (Western Pacific)
- BoM Scale (Southern Hemisphere / Australia)
- SSHWS Approximate Equivalent Badge
- Wind Averaging Periods
"""

import unittest
from ingestion.scales import classify_storm_intensity, get_wind_averaging_period


class TestBasinIntensityScales(unittest.TestCase):

    def test_imd_scale_north_indian_ocean(self):
        # Super Cyclonic Storm (>= 120 kt)
        cat, equiv, badge = classify_storm_intensity("North Indian Ocean", 125.0)
        self.assertIn("Super Cyclonic Storm", cat)
        self.assertIn("Category 4", badge)

        # Extremely Severe Cyclonic Storm (90 - 119 kt)
        cat, equiv, badge = classify_storm_intensity("Bay of Bengal", 100.0)
        self.assertIn("Extremely Severe Cyclonic Storm", cat)
        self.assertIn("Category 3", badge)

        # Very Severe Cyclonic Storm (64 - 89 kt)
        cat, equiv, badge = classify_storm_intensity("Arabian Sea", 70.0)
        self.assertIn("Very Severe Cyclonic Storm", cat)
        self.assertIn("Category 1", badge)

        # Severe Cyclonic Storm (48 - 63 kt)
        cat, equiv, badge = classify_storm_intensity("North Indian Ocean", 55.0)
        self.assertIn("Severe Cyclonic Storm", cat)
        self.assertIn("Tropical Storm", badge)

        # Cyclonic Storm (34 - 47 kt)
        cat, equiv, badge = classify_storm_intensity("Bay of Bengal", 40.0)
        self.assertIn("Cyclonic Storm", cat)

        # Deep Depression (28 - 33 kt)
        cat, equiv, badge = classify_storm_intensity("North Indian Ocean", 30.0)
        self.assertIn("Deep Depression", cat)

        # Depression (17 - 27 kt)
        cat, equiv, badge = classify_storm_intensity("North Indian Ocean", 22.0)
        self.assertIn("Depression", cat)

    def test_sshws_scale_atlantic_and_east_pacific(self):
        # Category 5 (>= 137 kt)
        cat, equiv, badge = classify_storm_intensity("North Atlantic", 140.0)
        self.assertIn("Category 5", cat)
        self.assertIn("Category 5", badge)

        # Category 4 (113 - 136 kt)
        cat, equiv, badge = classify_storm_intensity("Eastern Pacific", 120.0)
        self.assertIn("Category 4", cat)
        self.assertIn("Category 4", badge)

        # Category 1 (64 - 82 kt)
        cat, equiv, badge = classify_storm_intensity("North Atlantic", 70.0)
        self.assertIn("Category 1", cat)

        # Tropical Storm (34 - 63 kt)
        cat, equiv, badge = classify_storm_intensity("North Atlantic", 45.0)
        self.assertEqual(cat, "Tropical Storm")

    def test_west_pacific_scale(self):
        # Super Typhoon (>= 130 kt)
        cat, equiv, badge = classify_storm_intensity("Western Pacific", 135.0)
        self.assertEqual(cat, "Super Typhoon")
        self.assertIn("Category 4", badge)

        # Typhoon (64 - 129 kt)
        cat, equiv, badge = classify_storm_intensity("West Pacific", 75.0)
        self.assertEqual(cat, "Typhoon")

        # Severe Tropical Storm (48 - 63 kt)
        cat, equiv, badge = classify_storm_intensity("Western North Pacific", 52.0)
        self.assertIn("Severe Tropical Storm", cat)

    def test_bom_scale_southern_hemisphere(self):
        # Category 5 Severe Tropical Cyclone (>= 107 kt)
        cat, equiv, badge = classify_storm_intensity("South Pacific", 110.0)
        self.assertEqual(cat, "Category 5 Severe Tropical Cyclone")

        # Category 3 Severe Tropical Cyclone (64 - 85 kt)
        cat, equiv, badge = classify_storm_intensity("South Indian Ocean", 75.0)
        self.assertEqual(cat, "Category 3 Severe Tropical Cyclone")

        # Category 1 Tropical Cyclone (34 - 47 kt)
        cat, equiv, badge = classify_storm_intensity("Australian Region", 40.0)
        self.assertEqual(cat, "Category 1 Tropical Cyclone")

    def test_wind_averaging_period(self):
        self.assertEqual(get_wind_averaging_period("NOAA NHC"), "1-minute sustained")
        self.assertEqual(get_wind_averaging_period("JTWC"), "1-minute sustained")
        self.assertEqual(get_wind_averaging_period("IMD"), "3-minute sustained")
        self.assertEqual(get_wind_averaging_period("GDACS"), "10-minute sustained")
        self.assertEqual(get_wind_averaging_period("JMA"), "10-minute sustained")


if __name__ == "__main__":
    unittest.main()
