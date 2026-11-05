"""Protect invoice code rules."""

import unittest

from src.billing.invoices import invoice_code


class InvoiceCodeTests(unittest.TestCase):
    """Cover invoice-specific rules only."""

    def test_accepts_invoice_prefix(self):
        self.assertEqual(invoice_code(" inv-42 "), "INV-42")

    def test_rejects_other_prefix(self):
        with self.assertRaises(ValueError):
            invoice_code("ORD-42")


if __name__ == "__main__":
    unittest.main()
