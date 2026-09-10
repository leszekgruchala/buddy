"""Offline coverage for the paired evaluation planner and deterministic grader."""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from evals.graders.deterministic import grade_case
from scripts import run_skill_evaluations as runner


class SkillEvaluationRunnerTests(unittest.TestCase):
    def test_dry_run_validates_cases_without_subprocess_or_evidence_writes(self) -> None:
        run_id = "offline-plan-only"
        expected_root = runner.RUNS_ROOT / run_id
        with mock.patch.object(runner.subprocess, "run") as run:
            result = runner.main(["--dry-run", "--case", "research-facts-only", "--run-id", run_id])
        self.assertEqual(0, result)
        run.assert_not_called()
        self.assertFalse(expected_root.exists())

    def test_plan_keeps_both_conditions_identical(self) -> None:
        case = runner._load_cases({"archive-dry-run-collision"})[0]
        plan = runner.build_plan([case], "gpt-test", "high", "offline", None, 60)
        self.assertEqual(["candidate", "baseline"], plan["conditions"])
        self.assertEqual("gpt-test", plan["model"])
        self.assertEqual("high", plan["reasoning_effort"])
        self.assertEqual(60, plan["timeout_seconds"])
        self.assertIn("no Buddy provisioning", " ".join(plan["guarantees"]))

    def test_priority_suite_selects_research_spec_and_implement_cases(self) -> None:
        selected = runner._load_suite_case_ids({"priority"})
        cases = runner._load_cases(selected)
        self.assertEqual({"research", "spec", "implement"}, {case["skill_name"] for case in cases})
        self.assertEqual(selected, {case["id"] for case in cases})

    def test_auth_seed_copies_only_the_auth_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            destination = root / "destination"
            source.mkdir()
            (source / "auth.json").write_text('{"auth":"test"}', encoding="utf-8")
            (source / "config.toml").write_text('model = "not-copied"', encoding="utf-8")
            self.assertTrue(runner._seed_auth(source, destination))
            self.assertTrue((destination / "auth.json").is_file())
            self.assertFalse((destination / "config.toml").exists())

    def test_timeout_is_recorded_as_a_nonzero_condition_result(self) -> None:
        timeout = runner.subprocess.TimeoutExpired(["codex"], 1)
        with mock.patch.object(runner.subprocess, "run", side_effect=timeout):
            exit_code, _, stderr, _ = runner._run(["codex"], runner.ROOT, {}, 1)
        self.assertEqual(124, exit_code)
        self.assertIn("runner timeout after 1 seconds", stderr)

    def test_live_run_prints_condition_lifecycle_and_quiet_suppresses_it(self) -> None:
        case = runner._load_cases({"research-facts-only"})
        candidate = {"exit_code": 124, "duration_ms": 60_000}
        baseline = {"exit_code": 0, "duration_ms": 500}
        with tempfile.TemporaryDirectory() as temporary:
            with (
                mock.patch.object(runner, "RUNS_ROOT", Path(temporary)),
                mock.patch.object(runner, "_load_cases", return_value=case),
                mock.patch.object(runner, "_run_candidate", return_value=candidate),
                mock.patch.object(runner, "_run_baseline", return_value=baseline),
                mock.patch.object(runner, "_grade", return_value={"hard_gate_failed": False}),
                mock.patch("sys.stdout", new_callable=io.StringIO) as stdout,
            ):
                self.assertEqual(0, runner.main(["--case", "research-facts-only", "--run-id", "lifecycle"]))
            output = stdout.getvalue()
        self.assertIn("[skill-eval] starting case=research-facts-only condition=candidate", output)
        self.assertIn("[skill-eval] timed_out case=research-facts-only condition=candidate exit=124 duration=60.0s", output)
        self.assertIn("[skill-eval] completed case=research-facts-only condition=baseline exit=0 duration=0.5s", output)
        self.assertIn('"run_id": "lifecycle"', output)

        with tempfile.TemporaryDirectory() as temporary:
            with (
                mock.patch.object(runner, "RUNS_ROOT", Path(temporary)),
                mock.patch.object(runner, "_load_cases", return_value=case),
                mock.patch.object(runner, "_run_candidate", return_value=candidate),
                mock.patch.object(runner, "_run_baseline", return_value=baseline),
                mock.patch.object(runner, "_grade", return_value={"hard_gate_failed": False}),
                mock.patch("sys.stdout", new_callable=io.StringIO) as stdout,
            ):
                self.assertEqual(0, runner.main(["--case", "research-facts-only", "--run-id", "quiet", "--quiet"]))
            output = stdout.getvalue()
        self.assertNotIn("[skill-eval]", output)
        self.assertIn('"run_id": "quiet"', output)

    def test_disposable_plugin_copy_excludes_local_worklogs(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            destination = root / "destination"
            (source / "ai" / "worklog").mkdir(parents=True)
            (source / ".ai" / "worklog").mkdir(parents=True)
            (source / "skills").mkdir()
            (source / "ai" / "worklog" / "private.md").write_text("private", encoding="utf-8")
            (source / ".ai" / "worklog" / "private.md").write_text("private", encoding="utf-8")
            (source / "skills" / "SKILL.md").write_text("public", encoding="utf-8")
            runner._copytree(source, destination, ignore_runtime=True)
            self.assertFalse((destination / "ai").exists())
            self.assertFalse((destination / ".ai").exists())
            self.assertTrue((destination / "skills" / "SKILL.md").is_file())

    def test_relative_and_absolute_internal_symlinks_have_the_same_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            relative_root = root / "relative"
            absolute_root = root / "absolute"
            for directory in (relative_root, absolute_root):
                directory.mkdir()
                (directory / "target.txt").write_text("same", encoding="utf-8")
            (relative_root / "link.txt").symlink_to("target.txt")
            (absolute_root / "link.txt").symlink_to(absolute_root / "target.txt")
            self.assertEqual(runner._snapshot(relative_root), runner._snapshot(absolute_root))

    def test_copied_worklog_symlink_uses_its_fixture_relative_target(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            workspace = root / "workspace"
            (source / ".ai" / "worklog").mkdir(parents=True)
            (workspace / ".ai" / "worklog").mkdir(parents=True)
            target = source / ".ai" / "worklog" / "target"
            target.mkdir()
            (workspace / ".ai" / "worklog" / "link").symlink_to(target)
            entries = runner._snapshot(workspace)["entries"]
            link = next(item for item in entries if item["path"] == ".ai/worklog/link")
            self.assertEqual(".ai/worklog/target", link["target"])

    def test_condition_specific_hard_gate_is_not_applied_to_the_baseline(self) -> None:
        case = {
            "assertions": [
                {"id": "candidate-only", "class": "deterministic", "hard_gate": True, "conditions": ["candidate"], "check": "path_exists", "expected": "missing.txt"}
            ]
        }
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "initial-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "final-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "metadata.json").write_text('{"condition": "baseline"}', encoding="utf-8")
            result = grade_case(directory, case)
        self.assertFalse(result["hard_gate_failed"])
        self.assertEqual("not_applicable", result["assertions"][0]["status"])

    def test_directory_state_uses_descendant_snapshot_entries(self) -> None:
        case = {
            "assertions": [
                {"id": "moved", "class": "deterministic", "hard_gate": True, "check": "path_state", "expected": {"absent": "old", "present": "new"}},
                {"id": "newer", "class": "deterministic", "hard_gate": True, "check": "path_exists", "expected": "new"},
            ]
        }
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "initial-tree.json").write_text('{"entries": [{"path": "old/evidence.txt", "sha256": "old"}]}', encoding="utf-8")
            (directory / "final-tree.json").write_text('{"entries": [{"path": "new/evidence.txt", "sha256": "old"}]}', encoding="utf-8")
            result = grade_case(directory, case)
        self.assertFalse(result["hard_gate_failed"])
        self.assertEqual(["passed", "passed"], [item["status"] for item in result["assertions"]])


class DeterministicGraderTests(unittest.TestCase):
    def test_write_scope_and_path_state_are_graded_from_snapshots(self) -> None:
        case = {
            "write_scope": {"default": "deny", "allow": ["allowed.txt", "old.txt"], "deny": ["blocked.txt"]},
            "assertions": [
                {"id": "scope", "class": "deterministic", "hard_gate": True, "check": "write_scope_compliant", "expected": True},
                {"id": "state", "class": "deterministic", "hard_gate": True, "check": "path_state", "expected": {"absent": "old.txt", "present": "allowed.txt"}},
                {"id": "semantic", "class": "semantic", "hard_gate": False},
            ],
        }
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "initial-tree.json").write_text(json.dumps({"entries": [{"path": "old.txt", "sha256": "old"}]}), encoding="utf-8")
            (directory / "final-tree.json").write_text(json.dumps({"entries": [{"path": "allowed.txt", "sha256": "new"}]}), encoding="utf-8")
            result = grade_case(directory, case)
        self.assertFalse(result["hard_gate_failed"])
        self.assertEqual(["passed", "passed", "pending_human"], [item["status"] for item in result["assertions"]])

    def test_innovation_section_check_rejects_changes_outside_the_section(self) -> None:
        artifact = ".ai/worklog/20260910_resumable-coordination/research_resumable-coordination.md"
        case = {
            "assertions": [
                {
                    "id": "only-innovation",
                    "class": "deterministic",
                    "hard_gate": True,
                    "check": "markdown_section_only_changed",
                    "expected": {"path": artifact, "heading": "INNOVATION"},
                }
            ]
        }
        before = "# Research\n\n## FINDINGS\n\nStable facts.\n\n## INNOVATION\n\nNot run.\n"
        after = "# Research\n\n## FINDINGS\n\nChanged facts.\n\n## INNOVATION\n\n### Option 1\n\nValue: useful\n"
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            initial = directory / "inputs" / artifact
            output = directory / "outputs" / artifact
            initial.parent.mkdir(parents=True)
            output.parent.mkdir(parents=True)
            initial.write_text(before, encoding="utf-8")
            output.write_text(after, encoding="utf-8")
            (directory / "initial-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "final-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "metadata.json").write_text('{"condition": "candidate"}', encoding="utf-8")
            result = grade_case(directory, case)
        self.assertTrue(result["hard_gate_failed"])
        self.assertEqual("failed", result["assertions"][0]["status"])

    def test_innovation_option_structure_accepts_contract_fields(self) -> None:
        artifact = ".ai/worklog/20260910_resumable-coordination/research_resumable-coordination.md"
        case = {
            "assertions": [
                {
                    "id": "options",
                    "class": "deterministic",
                    "hard_gate": False,
                    "check": "innovation_option_structure",
                    "expected": {"path": artifact, "heading": "INNOVATION"},
                }
            ]
        }
        text = "# Research\n\n## INNOVATION\n\n### Option 1 — Lease\n\nValue: clear owner.\nCost: state.\nRisk: expiry.\nWhen it fits: one host.\n\nSimplest-viable recommendation: provisional lease.\n"
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            output = directory / "outputs" / artifact
            output.parent.mkdir(parents=True)
            output.write_text(text, encoding="utf-8")
            (directory / "initial-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "final-tree.json").write_text('{"entries": []}', encoding="utf-8")
            (directory / "metadata.json").write_text('{"condition": "candidate"}', encoding="utf-8")
            result = grade_case(directory, case)
        self.assertFalse(result["hard_gate_failed"])
        self.assertEqual("passed", result["assertions"][0]["status"])


if __name__ == "__main__":
    unittest.main()
