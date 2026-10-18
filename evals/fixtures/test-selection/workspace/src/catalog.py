"""Import catalog records with unique IDs and nonempty labels."""


def import_rows(catalog, rows):
    """Add rows to catalog and return their count; reject invalid or duplicate rows."""
    for row in rows:
        item_id, label = row["id"], row["label"]
        if not isinstance(item_id, str) or not item_id.strip():
            raise ValueError("ID must be a nonempty string")
        if not isinstance(label, str) or not label.strip():
            raise ValueError("Label must be a nonempty string")
        if item_id in catalog:
            raise ValueError("Duplicate ID")
        catalog[item_id] = label
    return len(rows)
