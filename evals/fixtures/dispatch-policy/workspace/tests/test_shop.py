import importlib
import unittest

from src.inventory.reserve import reserve
from src.pricing.discount import apply_discount


class ShopTest(unittest.TestCase):
    def test_discount_whole(self):
        self.assertEqual(apply_discount(1000, 10), 900)

    def test_reserve_available(self):
        stock = {"a": 5}
        self.assertEqual(reserve(stock, "a", 2), 3)

    def test_reports_format(self):
        for i in range(1, 25):
            module = importlib.import_module(f"src.reports.report_{i:02d}")
            self.assertEqual(getattr(module, f"line_{i:02d}")("x", 1234), "x: $12.34")


if __name__ == "__main__":
    unittest.main()
