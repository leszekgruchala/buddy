"""Protect generic code normalization."""

import unittest

from src.core.codes import normalize_code

MAX_LENGTH = 4

ACCEPTED = (
    ("trims and uppercases", " ab ", "AB"),
    ("accepts the length limit", "abcd", "ABCD"),
)

REJECTED = (
    ("not text", 7),
    ("blank", "   "),
    ("over the length limit", "abcde"),
)


def normalize(value):
    """Call normalize_code with the shared test limit."""
    return normalize_code(value, max_length=MAX_LENGTH)


class NormalizeCodeTests(unittest.TestCase):
    """Cover each accepted and rejected code behavior."""

    def test_accepted_codes(self):
        for name, value, expected in ACCEPTED:
            with self.subTest(name):
                self.assertEqual(normalize(value), expected)

    def test_rejected_codes(self):
        for name, value in REJECTED:
            with self.subTest(name):
                with self.assertRaises(ValueError):
                    normalize(value)


if __name__ == "__main__":
    unittest.main()
