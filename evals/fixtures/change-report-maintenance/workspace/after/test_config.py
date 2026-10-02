import unittest

from config import POLL_INTERVAL_SECONDS


class ConfigTest(unittest.TestCase):
    def test_default_interval_is_one_minute(self):
        self.assertEqual(POLL_INTERVAL_SECONDS, 60)


if __name__ == "__main__":
    unittest.main()
