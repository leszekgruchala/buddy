"""Protect quantity parsing."""

import unittest

from src.quantities import parse_quantity


class ParseQuantityTests(unittest.TestCase):

    def test_parses_three(self):
        self.assertEqual(parse_quantity("3"), 3)

    def test_parses_seven(self):
        self.assertEqual(parse_quantity("7"), 7)

    def test_parses_twelve(self):
        self.assertEqual(parse_quantity("12"), 12)

    def test_parses_twelve_copy(self):
        self.assertEqual(parse_quantity("12"), 12)

    def test_parses_large_copy(self):
        self.assertEqual(parse_quantity("999"), 999)

    def test_rejects_blank(self):
        with self.assertRaises(ValueError):
            parse_quantity("   ")

    def test_rejects_zero(self):
        with self.assertRaises(ValueError):
            parse_quantity("0")

    def test_rejects_large(self):
        with self.assertRaises(ValueError):
            parse_quantity("5000")

    def test_rejects_text(self):
        with self.assertRaises(ValueError):
            parse_quantity("ten")


if __name__ == "__main__":
    unittest.main()
