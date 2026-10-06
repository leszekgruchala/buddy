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
        for fragment in (
            "internal coverage map",
            "Establish the target and contract",
            "Build the coverage map",
            "Requirements and completeness",
            "Local correctness and failure paths",
            "Cross-file contracts and compatibility",
            "Security and data boundaries",
            "Reliability, operations, and performance",
            "Test adequacy",
            "Verify without modifying product files",
            "Adjudicate candidate observations",
            "zero-finding review",
            "No actionable findings.",
            "Do not include a target snapshot, diff summary, changed-file inventory",
        ):
            self.assertIn(fragment, skill)

    def test_develop_runs_a_bounded_review_and_remediation_loop(self) -> None:
        develop = self._words("skills/develop/SKILL.md")
        self.assertIn("at most two fix/re-review rounds", develop)
        self.assertIn("every actionable finding is `Fixed` or `Not a bug`", develop)
        self.assertIn("reviewer returns findings directly and creates no review file", develop)
        self.assertIn("select a concrete model under `review-code` and the shared selection rules", develop)
        self.assertIn("Failed or unavailable validation does not waive review", develop)
        self.assertIn("dispatch a fresh reviewer with the selected review model", develop)
        selection = self._words("skills/develop/model-selection.md")
        self.assertIn("Review is a role with a `frontier` default", selection)
        self.assertIn("fresh independent reviewer with a concrete selected model", self._words("skills/review-code/SKILL.md"))
        self.assertIn("skills/develop/model-selection.md", self._words("agents/code-reviewer.md"))
        for path in ("skills/review-code/SKILL.md", "agents/code-reviewer.md"):
            self.assertIn("return `blocked`", self._words(path).lower())
        agent = self._words("agents/developer.md")
        self.assertIn("fresh independent reviewer", agent)
        self.assertIn("Failed validation does not waive review", agent)

    def test_model_selection_honors_scoped_requests_without_profiles(self) -> None:
        selection = self._words("skills/develop/model-selection.md")
        for fragment in (
            "Honor explicit user agent, tier, model, and effort requests",
            "Carry an invocation-wide request into every worker",
            "a more specific stage request takes precedence",
            "They override Buddy recommendations, even for lower capability.",
            "A concrete model request wins over a tier recommendation",
            "Never silently substitute an explicit agent, tier, model, or effort.",
            "select autonomously",
            "without routine user questions",
            "Do not read or write Buddy model profiles",
        ):
            self.assertIn(fragment, selection)
        for name in ("model-policy", "configure-models"):
            self.assertFalse((ROOT / "skills" / name).exists(), name)
    def test_model_selection_defaults_are_shared_with_two_frontier_exceptions(self) -> None:
        selection = self._words("skills/develop/model-selection.md")
        self.assertIn("Default to `balanced`. Only `spec` and `review-code` default to `frontier`.", selection)
        self.assertIn("The caller judges the work", selection)
        self.assertIn("Declared phase runner/tier settings are recommendations too.", selection)
        for name in ("archive-worklogs", "brainstorm", "change-report", "innovate", "research", "test-runner"):
            text = self._words(f"skills/{name}/SKILL.md")
            self.assertIn("[model selection](../develop/model-selection.md)", text)
            self.assertIn("recommend `balanced`", text)
        for name in ("spec", "review-code"):
            self.assertIn("recommend `frontier`", self._words(f"skills/{name}/SKILL.md"))
        self.assertIn("Recommend `balanced` for direct work", self._words("skills/implement/SKILL.md"))
        self.assertIn("Apply [model selection](model-selection.md) to host reasoning and every worker", self._words("skills/develop/SKILL.md"))

    def test_user_selection_reaches_phase_briefs_and_repairs_without_extra_authority(self) -> None:
        selection = self._words("skills/develop/model-selection.md")
        self.assertIn("Give the selected runner the active skill and effective brief; selection grants no extra authority.", selection)
        self.assertIn("an agent request does not replace a separate model or effort request", selection)
        implement = self._words("skills/implement/SKILL.md")
        self.assertIn("the selected runner/tier", implement)
        self.assertIn("Apply scoped user selection without changing phase instructions or discretion.", implement)
        self.assertIn("the current selection, subject to scoped user overrides", implement)
        self.assertIn("broader ownership or a changed decision always requires one", implement)
        self.assertIn("Runner/tier settings recommend capability", self._words("skills/spec/reference.md"))

    def test_model_selection_preserves_main_phase_mutation_ownership(self) -> None:
        implement = self._words("skills/implement/SKILL.md")
        self.assertIn("Run `agent: Main` locally and retain its mutation ownership.", implement)
        self.assertIn("read-only reasoning assistance without mutation authority", implement)
        selection = self._words("skills/develop/model-selection.md")
        self.assertIn("A phase assigned to `Main` keeps local mutation ownership", selection)

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
