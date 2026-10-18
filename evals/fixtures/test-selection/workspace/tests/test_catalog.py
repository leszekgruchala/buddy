"""Existing coverage for successful imports and rejected first rows."""

import unittest

from src.catalog import import_rows


class CatalogTests(unittest.TestCase):
    """Protect existing records and validate incoming rows."""

    def test_successful_import_preserves_existing_records_and_values(self):
        catalog = {"seed": "Keep"}
        rows = [{"id": "one", "label": "First"}, {"id": "two", "label": " Second "}]
        self.assertEqual(import_rows(catalog, rows), 2)
        self.assertEqual(catalog, {"seed": "Keep", "one": "First", "two": " Second "})

    def test_rejected_batch_preserves_catalog(self):
        for row in (
            {"id": "", "label": "Invalid ID"},
            {"id": "new", "label": " "},
            {"id": "seed", "label": "Replacement"},
        ):
            with self.subTest(row=row):
                catalog = {"seed": "Keep"}
                with self.assertRaises(ValueError):
                    import_rows(catalog, [row])
                self.assertEqual(catalog, {"seed": "Keep"})


if __name__ == "__main__":
    unittest.main()
