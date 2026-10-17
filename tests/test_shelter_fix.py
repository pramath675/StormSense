"""
Test Suite: Shelter Facilities NameError Resolution
Ensures get_shelter_facilities() is defined, callable, and handles unseeded cache states safely.
"""

import unittest
import server


class TestShelterFix(unittest.TestCase):
    def test_get_shelter_facilities_defined(self):
        """Verify get_shelter_facilities is callable and returns non-empty list."""
        self.assertTrue(hasattr(server, "get_shelter_facilities"), "get_shelter_facilities must be defined in server.py")
        shelters = server.get_shelter_facilities()
        self.assertIsInstance(shelters, list)
        self.assertGreater(len(shelters), 0)
        self.assertIn("name", shelters[0])
        self.assertIn("total_capacity", shelters[0])

    def test_get_shelter_facilities_empty_cache_recovery(self):
        """Verify that when CACHE['shelters'] is empty, get_shelter_facilities recovers without NameError."""
        server.CACHE["shelters"] = []
        shelters = server.get_shelter_facilities()
        self.assertIsInstance(shelters, list)
        self.assertGreater(len(shelters), 0, "Should re-seed shelters on demand")

    def test_ai_chat_endpoint_with_empty_shelters(self):
        """Verify /api/ai/chat can execute without NameError even if CACHE['shelters'] is empty."""
        server.CACHE["shelters"] = []
        client = server.app.test_client()
        resp = client.post("/api/ai/chat", json={"message": "Where are the nearest shelters?"})
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("reply", data)


if __name__ == "__main__":
    unittest.main()
