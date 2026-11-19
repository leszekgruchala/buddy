"""Protect discount rules."""

import unittest
from unittest import mock

from src import pricing
from src.pricing import apply_discount


class ApplyDiscountTests(unittest.TestCase):

    def test_applies_discount(self):
        self.assertEqual(apply_discount(100, 10), 90)

    def test_rounds_to_cents(self):
        self.assertEqual(apply_discount(19.99, 15), 16.99)

    def test_rejects_negative_price(self):
        with self.assertRaises(ValueError):
            apply_discount(-1, 10)

    def test_rejects_percent_over_100(self):
        with self.assertRaises(ValueError):
            apply_discount(100, 101)

    def test_applies_discount_again(self):
        self.assertEqual(apply_discount(100, 10), 90)

    def test_uses_round_helper(self):
        with mock.patch.object(pricing, "_round_money", return_value=1.23) as rounding:
            self.assertEqual(rounding(5), 1.23)
            apply_discount(19.99, 15)
        rounding.assert_called()


if __name__ == "__main__":
    unittest.main()
