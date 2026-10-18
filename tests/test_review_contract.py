"""Offline coverage for the review evaluation contract."""

from __future__ import annotations

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ReviewContractTests(unittest.TestCase):
    """Keep review evaluation permissions and baseline grading explicit."""

    def test_review_eval_protects_source_and_unverified_memory(self) -> None:
        path = ROOT / "evals/cases/review-code/evals.json"
        case = json.loads(path.read_text(encoding="utf-8"))["evals"][0]
        self.assertEqual(case["write_scope"]["allow"], [])
        self.assertIn("src/**", case["write_scope"]["deny"])
        self.assertIn(".ai/**", case["write_scope"]["deny"])
        self.assertEqual(case["comparison_contract"]["conditions"], ["candidate", "baseline"])
        self.assertEqual(case["comparison_contract"]["only_difference"], "Buddy plugin provisioning")
        baseline = next(item for item in case["assertions"] if item["id"] == "review-baseline-comparison")
        self.assertEqual(baseline["conditions"], ["baseline"])


if __name__ == "__main__":
    unittest.main()
