import unittest

from src.billing import invoice_total, tax


class BillingTest(unittest.TestCase):
    def test_tax(self):
        self.assertEqual(tax(100), 20.0)

    def test_total(self):
        self.assertEqual(invoice_total([(10, 2, "reduced")]), 21.0)
