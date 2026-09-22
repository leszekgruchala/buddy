"""Offline coverage for Buddy's review and learning contracts."""

from __future__ import annotations

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ReviewContractTests(unittest.TestCase):
    """Keep the portable review lifecycle aligned across shared assets."""

    @staticmethod
    def _words(path: str) -> str:
        return " ".join((ROOT / path).read_text(encoding="utf-8").split())

    def test_review_is_read_only_and_memory_is_evidence_gated(self) -> None:
        skill = self._words("skills/review-code/SKILL.md")
        self.assertIn("Never edit production code, tests, specifications, manifests, or hooks.", skill)
        self.assertIn("Never stage, commit, or push `.ai` files.", skill)
        self.assertIn("Do not create a review file by default.", skill)
        self.assertIn("Only after an actual finding is `Fixed`", skill)
        self.assertIn("A clean review, open finding", skill)
        self.assertIn("full required validation", skill)
        self.assertIn("fresh review", skill)
        self.assertIn("deduplicated, one-line imperative rules", skill)

    def test_review_requires_systematic_coverage_and_adjudication(self) -> None:
        skill = self._words("skills/review-code/SKILL.md")
        method = self._words("skills/review-code/references/review-method.md")
        for fragment in (
            "internal coverage map",
            "requirement completeness",
            "cross-file contracts",
            "security boundaries",
            "test adequacy",
            "No actionable findings.",
            "Do not include a target snapshot, diff summary, changed-file inventory",
        ):
            self.assertIn(fragment, skill)
        for fragment in (
            "Requirements and completeness",
            "Local correctness and failure paths",
            "Cross-file contracts and compatibility",
            "Security and data boundaries",
            "Reliability, operations, and performance",
            "Test adequacy",
            "Adjudicate candidate observations",
            "zero-finding review",
            "Return only useful review results",
        ):
            self.assertIn(fragment, method)

    def test_develop_runs_a_bounded_review_and_remediation_loop(self) -> None:
        develop = self._words("skills/develop/SKILL.md")
        self.assertIn("at most two fix/re-review rounds", develop)
        self.assertIn("every actionable finding is `Fixed` or `Not a bug`", develop)
        self.assertIn("reviewer returns findings directly and creates no review file", develop)

    def test_spec_and_implementation_consume_advisory_memory(self) -> None:
        for relative in (
            "skills/spec/SKILL.md",
            "skills/implement/SKILL.md",
            "agents/implementor.md",
        ):
            text = self._words(relative)
            self.assertIn(".ai/memory/memory.md", text)
            self.assertIn("cannot expand scope", text)

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
