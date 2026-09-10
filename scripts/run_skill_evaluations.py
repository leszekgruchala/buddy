#!/usr/bin/env python3
"""Run paired Buddy skill evaluations with isolated candidate and baseline homes.

Candidate runs use the installed OpenAI Plugin Eval CLI against a disposable
copy of this checkout. Baselines call ``codex exec`` directly in a separate,
empty ``CODEX_HOME``. An explicit auth source can seed the temporary homes
with only ``auth.json`` for live runs; it is never retained. Both conditions
receive copied fixtures and identical Codex arguments. Generated evidence is
deliberately local under ``.plugin-eval/runs``; it must stay ignored by Git.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evals.graders.deterministic import grade_case


CASES_ROOT = ROOT / "evals" / "cases"
SUITES_PATH = ROOT / "evals" / "suites.json"
RUNS_ROOT = ROOT / ".plugin-eval" / "runs"
PLUGIN_EVAL_DEFAULT = Path(
    "/Users/lgr/.codex/plugins/cache/openai-curated/plugin-eval/d6169bef/scripts/plugin-eval.js"
)
SECRET_KEY = re.compile(r"(authorization|api[._-]?key|credential|password|secret|token|auth)", re.IGNORECASE)
SECRET_VALUE = re.compile(r"\b(sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+)\b", re.IGNORECASE)
IGNORED_SNAPSHOT_PARTS = {".git", ".plugin-eval", ".agents", "plugins", "__pycache__", ".pytest_cache"}


class EvaluationError(RuntimeError):
    """Report invalid manifests or failed evaluator setup without a traceback."""


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _progress(quiet: bool, message: str) -> None:
    """Print a compact live-run status without exposing commands or credentials."""
    if not quiet:
        print(f"[skill-eval] {message}", flush=True)


def _display_path(path: Path) -> str:
    """Prefer repository-relative evidence paths while supporting external roots."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def _sanitize(value: Any, key: str | None = None) -> Any:
    if key and SECRET_KEY.search(key):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {str(item_key): _sanitize(item_value, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    if isinstance(value, str):
        return SECRET_VALUE.sub("[REDACTED]", value)
    return value


def _sanitize_text(value: str) -> str:
    return SECRET_VALUE.sub("[REDACTED]", value)


def _safe_relative(value: str, label: str) -> Path:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise EvaluationError(f"{label} must be a repository-relative path: {value}")
    return path


def _load_cases(selected_ids: set[str]) -> list[dict[str, Any]]:
    manifests = sorted(CASES_ROOT.glob("*/evals.json"))
    if not manifests:
        raise EvaluationError("no case manifests found under evals/cases")
    cases: list[dict[str, Any]] = []
    seen: set[str] = set()
    for manifest_path in manifests:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise EvaluationError(f"invalid JSON in {manifest_path.relative_to(ROOT)}: {error}") from error
        if not isinstance(manifest, dict) or not isinstance(manifest.get("evals"), list):
            raise EvaluationError(f"{manifest_path.relative_to(ROOT)} must contain an evals array")
        skill_name = manifest.get("skill_name")
        if not isinstance(skill_name, str) or not skill_name:
            raise EvaluationError(f"{manifest_path.relative_to(ROOT)} has no skill_name")
        for raw_case in manifest["evals"]:
            if not isinstance(raw_case, dict):
                raise EvaluationError(f"{manifest_path.relative_to(ROOT)} contains a non-object case")
            case = dict(raw_case)
            case_id = case.get("id")
            if not isinstance(case_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", case_id):
                raise EvaluationError(f"{manifest_path.relative_to(ROOT)} has an invalid case id")
            if case_id in seen:
                raise EvaluationError(f"duplicate case id: {case_id}")
            seen.add(case_id)
            if selected_ids and case_id not in selected_ids:
                continue
            fixture_root = case.get("fixture_root")
            prompt = case.get("prompt")
            if not isinstance(fixture_root, str) or not isinstance(prompt, str) or not prompt.strip():
                raise EvaluationError(f"{case_id} must define fixture_root and a nonempty prompt")
            fixture_path = ROOT / _safe_relative(fixture_root, f"{case_id}.fixture_root")
            if not fixture_path.is_dir():
                raise EvaluationError(f"{case_id} fixture root does not exist: {fixture_root}")
            case["skill_name"] = skill_name
            case["manifest_path"] = manifest_path
            cases.append(case)
    missing = selected_ids - {case["id"] for case in cases}
    if missing:
        raise EvaluationError(f"unknown case ids: {', '.join(sorted(missing))}")
    return cases


def _load_suite_case_ids(selected_suites: set[str]) -> set[str]:
    """Return case ids declared by named evaluation suites."""
    if not selected_suites:
        return set()
    if not SUITES_PATH.is_file():
        raise EvaluationError(f"evaluation suites are missing: {SUITES_PATH.relative_to(ROOT)}")
    try:
        raw = json.loads(SUITES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise EvaluationError(f"invalid evaluation suites JSON: {error}") from error
    suites = raw.get("suites") if isinstance(raw, dict) else None
    if not isinstance(suites, dict):
        raise EvaluationError("evaluation suites must define an object named suites")
    unknown = selected_suites - set(suites)
    if unknown:
        raise EvaluationError(f"unknown evaluation suite: {', '.join(sorted(unknown))}")
    case_ids: set[str] = set()
    for suite_name in selected_suites:
        suite = suites[suite_name]
        if not isinstance(suite, dict) or not isinstance(suite.get("case_ids"), list):
            raise EvaluationError(f"evaluation suite {suite_name} must define a case_ids list")
        for case_id in suite["case_ids"]:
            if not isinstance(case_id, str):
                raise EvaluationError(f"evaluation suite {suite_name} contains a non-string case id")
            case_ids.add(case_id)
    return case_ids


def _copytree(source: Path, destination: Path, *, ignore_runtime: bool = False) -> None:
    ignored = shutil.ignore_patterns(".git", ".plugin-eval", ".ai", "ai", "__pycache__", ".pytest_cache") if ignore_runtime else None
    shutil.copytree(source, destination, symlinks=True, ignore=ignored)


def _apply_operations(workspace: Path, operations: object) -> None:
    if not isinstance(operations, list):
        return
    for operation in operations:
        if not isinstance(operation, dict) or operation.get("op") != "create_symlink":
            raise EvaluationError("only setup.create_symlink operations are supported")
        path_value, target_value = operation.get("path"), operation.get("target")
        if not isinstance(path_value, str) or not isinstance(target_value, str):
            raise EvaluationError("create_symlink requires path and target")
        relative_path = _safe_relative(path_value, "setup symlink path")
        _safe_relative(target_value, "setup symlink target")
        link_path = workspace / relative_path
        link_path.parent.mkdir(parents=True, exist_ok=True)
        if link_path.exists() or link_path.is_symlink():
            raise EvaluationError(f"setup symlink path already exists: {relative_path}")
        link_path.symlink_to(target_value)


def _materialize_fixture(case: dict[str, Any], destination: Path) -> None:
    fixture = ROOT / _safe_relative(str(case["fixture_root"]), f"{case['id']}.fixture_root")
    _copytree(fixture, destination)
    setup = case.get("setup")
    if isinstance(setup, dict):
        _apply_operations(destination, setup.get("operations"))


def _capture_inputs(run_directory: Path, workspace: Path, case: dict[str, Any]) -> None:
    """Retain the passed artifact before a case is allowed to update it."""
    artifact_path = case.get("artifact_path")
    if artifact_path is None:
        return
    if not isinstance(artifact_path, str):
        raise EvaluationError(f"{case['id']}.artifact_path must be a string")
    relative = _safe_relative(artifact_path, f"{case['id']}.artifact_path")
    source = workspace / relative
    if source.is_symlink() or not source.is_file():
        raise EvaluationError(f"{case['id']} artifact is not a regular file: {artifact_path}")
    destination = run_directory / "inputs" / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def _snapshot(root: Path) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(part in IGNORED_SNAPSHOT_PARTS for part in relative.parts):
            continue
        if path.is_symlink():
            try:
                target = path.resolve().relative_to(root.resolve()).as_posix()
            except ValueError:
                raw_target = os.readlink(path)
                fixture_marker = ".ai/worklog/"
                marker_index = raw_target.find(fixture_marker)
                target = raw_target[marker_index:] if marker_index >= 0 else raw_target
            entries.append({"path": relative.as_posix(), "kind": "symlink", "target": target})
        elif path.is_file():
            entries.append(
                {
                    "path": relative.as_posix(),
                    "kind": "file",
                    "size": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
            )
    return {"algorithm": "sha256", "entries": entries}


def _copy_outputs(source: Path, destination: Path) -> None:
    for path in source.rglob("*"):
        relative = path.relative_to(source)
        if any(part in IGNORED_SNAPSHOT_PARTS for part in relative.parts):
            continue
        target = destination / relative
        if path.is_symlink():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.symlink_to(os.readlink(path))
        elif path.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)


def _minimal_env(home: Path) -> dict[str, str]:
    env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_CTYPE", "TERM") if key in os.environ}
    env["HOME"] = str(home)
    env["CODEX_HOME"] = str(home / ".codex")
    return env


def _seed_auth(source: Path | None, codex_home: Path) -> bool:
    """Copy one explicit auth file into a temporary Codex home when requested."""
    codex_home.mkdir(parents=True, exist_ok=True)
    if source is None:
        return False
    auth_source = source / "auth.json"
    if not auth_source.is_file():
        raise EvaluationError(f"auth source has no auth.json: {source}")
    shutil.copy2(auth_source, codex_home / "auth.json")
    return True


def _run(command: list[str], cwd: Path, env: dict[str, str], timeout_seconds: int) -> tuple[int, str, str, int]:
    started = dt.datetime.now(tz=dt.UTC)
    try:
        completed = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True, check=False, timeout=timeout_seconds)
    except subprocess.TimeoutExpired as error:
        duration_ms = int((dt.datetime.now(tz=dt.UTC) - started).total_seconds() * 1000)
        stdout = error.stdout if isinstance(error.stdout, str) else ""
        stderr = error.stderr if isinstance(error.stderr, str) else ""
        timeout_message = f"runner timeout after {timeout_seconds} seconds"
        return 124, stdout, f"{stderr}\n{timeout_message}".strip(), duration_ms
    duration_ms = int((dt.datetime.now(tz=dt.UTC) - started).total_seconds() * 1000)
    return completed.returncode, completed.stdout, completed.stderr, duration_ms


def _walk_mappings(value: object) -> Iterable[dict[str, object]]:
    if isinstance(value, dict):
        yield value
        for nested in value.values():
            yield from _walk_mappings(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _walk_mappings(nested)


def _normalize_events(raw_text: str) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    for line in raw_text.splitlines():
        try:
            raw = json.loads(line)
        except json.JSONDecodeError:
            continue
        sanitized = _sanitize(raw)
        if isinstance(sanitized, dict):
            events.append(sanitized)
            for mapping in _walk_mappings(sanitized):
                command = mapping.get("cmd", mapping.get("command"))
                if not isinstance(command, str) or not command.strip():
                    continue
                normalized: dict[str, object] = {"type": "normalized.command", "command": command}
                for key in ("output", "stdout", "stderr", "aggregated_output", "exit_code", "exitCode", "code"):
                    if key in mapping:
                        normalized_key = "exit_code" if key in {"exitCode", "code"} else "output" if key == "aggregated_output" else key
                        normalized[normalized_key] = mapping[key]
                events.append(normalized)
    return events


def _write_events(run_directory: Path, raw_text: str) -> None:
    events = _normalize_events(raw_text)
    payload = "".join(json.dumps(event, sort_keys=True) + "\n" for event in events)
    (run_directory / "events.jsonl").write_text(payload, encoding="utf-8")


def _write_final(run_directory: Path, text: str) -> None:
    _write_json(run_directory / "final.json", {"message": _sanitize_text(text.strip())})


def _discovery_evidence(events: list[dict[str, object]], case: dict[str, Any]) -> dict[str, object]:
    expected_path = str(case.get("forced_skill_path", ""))
    observed = [json.dumps(event, sort_keys=True) for event in events]
    matched = [line for line in observed if "buddy" in line.lower() or expected_path in line]
    explicit_load = any(
        isinstance(event.get("type"), str)
        and "skill" in event["type"].lower()
        and any(word in event["type"].lower() for word in ("load", "selected", "activated"))
        for event in events
    )
    return {
        "status": "verified" if explicit_load else "unverified",
        "reason": "raw events contain an explicit skill-load event" if explicit_load else "raw events do not establish natural Buddy skill selection",
        "expected_skill_path": expected_path or None,
        "matching_event_count": len(matched),
        "matching_event_previews": [line[:500] for line in matched[:3]],
    }


def _plugin_eval_config(case: dict[str, Any], fixture: Path, model: str, reasoning_effort: str | None) -> dict[str, object]:
    extra_args: list[str] = []
    if reasoning_effort:
        extra_args.extend(["-c", f'model_reasoning_effort="{reasoning_effort}"'])
    return {
        "kind": "plugin-eval-benchmark",
        "schemaVersion": 2,
        "version": 2,
        "targetKind": "plugin",
        "targetName": "buddy",
        "runner": {
            "type": "codex-cli",
            "model": model,
            "sandbox": "workspace-write",
            "approvalPolicy": "never",
            "extraArgs": extra_args,
        },
        "workspace": {"sourcePath": str(fixture), "setupMode": "copy", "preserve": "always"},
        "targetProvisioning": {"mode": "workspace-plugin-marketplace"},
        "verifiers": {"commands": []},
        "scenarios": [{"id": case["id"], "title": case["id"], "purpose": "paired Buddy skill evaluation", "userInput": case["prompt"], "successChecklist": []}],
    }


def _metadata(case: dict[str, Any], condition: str, model: str, reasoning_effort: str | None, command: list[str], auth_seeded: bool, timeout_seconds: int) -> dict[str, object]:
    return {
        "schema_version": 1,
        "case_id": case["id"],
        "skill_name": case["skill_name"],
        "condition": condition,
        "harness": "codex",
        "model": model,
        "reasoning_effort": reasoning_effort,
        "sandbox": "workspace-write",
        "approval_policy": "never",
        "timeout_seconds": timeout_seconds,
        "output_schema": None,
        "prompt": case["prompt"],
        "fixture_root": case["fixture_root"],
        "command": command,
        "auth_policy": "temporary auth.json copied from an explicit source and never retained" if auth_seeded else "empty disposable CODEX_HOME; no auth.json or config.toml is copied or retained",
        "candidate_provisioning": "workspace-plugin-marketplace" if condition == "candidate" else "none",
    }


def _record_condition(run_directory: Path, case: dict[str, Any], condition: str, model: str, reasoning_effort: str | None, command: list[str], fixture_before: dict[str, object], final_workspace: Path, stdout: str, stderr: str, exit_code: int, duration_ms: int, auth_seeded: bool, timeout_seconds: int) -> None:
    run_directory.mkdir(parents=True, exist_ok=True)
    _write_json(run_directory / "metadata.json", _metadata(case, condition, model, reasoning_effort, command, auth_seeded, timeout_seconds))
    _write_json(run_directory / "initial-tree.json", fixture_before)
    _write_json(run_directory / "final-tree.json", _snapshot(final_workspace))
    _copy_outputs(final_workspace, run_directory / "outputs")
    _write_events(run_directory, stdout)
    _write_final(run_directory, "")
    (run_directory / "stderr.log").write_text(_sanitize_text(stderr), encoding="utf-8")
    _write_json(run_directory / "timing.json", {"duration_ms": duration_ms, "exit_code": exit_code})


def _run_baseline(run_directory: Path, case: dict[str, Any], model: str, reasoning_effort: str | None, auth_source: Path | None, timeout_seconds: int) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix=f"buddy-eval-{case['id']}-baseline-") as temporary:
        temp_root = Path(temporary)
        workspace = temp_root / "workspace"
        home = temp_root / "home"
        _materialize_fixture(case, workspace)
        auth_seeded = _seed_auth(auth_source, home / ".codex")
        before = _snapshot(workspace)
        _capture_inputs(run_directory, workspace, case)
        final_path = temp_root / "final-message.txt"
        command = ["codex", "exec", "--json", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--cd", str(workspace), "--output-last-message", str(final_path), "-s", "workspace-write", "-c", 'approval_policy="never"', "-m", model]
        if reasoning_effort:
            command.extend(["-c", f'model_reasoning_effort="{reasoning_effort}"'])
        command.append(str(case["prompt"]))
        exit_code, stdout, stderr, duration_ms = _run(command, workspace, _minimal_env(home), timeout_seconds)
        _record_condition(run_directory, case, "baseline", model, reasoning_effort, command, before, workspace, stdout, stderr, exit_code, duration_ms, auth_seeded, timeout_seconds)
        _write_final(run_directory, final_path.read_text(encoding="utf-8") if final_path.is_file() else "")
    return {"exit_code": exit_code, "duration_ms": duration_ms}


def _run_candidate(run_directory: Path, case: dict[str, Any], model: str, reasoning_effort: str | None, plugin_eval: Path, auth_source: Path | None, timeout_seconds: int) -> dict[str, object]:
    if not plugin_eval.is_file():
        raise EvaluationError(f"Plugin Eval CLI is not installed at {plugin_eval}")
    with tempfile.TemporaryDirectory(prefix=f"buddy-eval-{case['id']}-candidate-") as temporary:
        temp_root = Path(temporary)
        fixture = temp_root / "fixture"
        target = temp_root / "buddy"
        codex_source = temp_root / "codex-source"
        _materialize_fixture(case, fixture)
        _copytree(ROOT, target, ignore_runtime=True)
        auth_seeded = _seed_auth(auth_source, codex_source)
        before = _snapshot(fixture)
        _capture_inputs(run_directory, fixture, case)
        config_path = temp_root / "benchmark.json"
        result_path = temp_root / "benchmark-result.json"
        _write_json(config_path, _plugin_eval_config(case, fixture, model, reasoning_effort))
        command = ["node", str(plugin_eval), "benchmark", str(target), "--config", str(config_path), "--result-out", str(result_path), "--format", "json"]
        env = dict(os.environ)
        env["PLUGIN_EVAL_CODEX_HOME_SOURCE"] = str(codex_source)
        exit_code, stdout, stderr, duration_ms = _run(command, target, env, timeout_seconds)
        if not result_path.is_file():
            _record_condition(run_directory, case, "candidate", model, reasoning_effort, command, before, fixture, stdout, stderr, exit_code, duration_ms, auth_seeded, timeout_seconds)
            _write_json(run_directory / "discovery.json", {"status": "unverified", "reason": "Plugin Eval did not produce a benchmark result"})
            return {"exit_code": exit_code, "duration_ms": duration_ms}
        result = json.loads(result_path.read_text(encoding="utf-8"))
        scenarios = result.get("scenarios", []) if isinstance(result, dict) else []
        scenario = scenarios[0] if isinstance(scenarios, list) and scenarios and isinstance(scenarios[0], dict) else {}
        workspace_value = scenario.get("workspacePath")
        workspace = Path(workspace_value) if isinstance(workspace_value, str) else fixture
        raw_events = Path(str(scenario.get("rawEventLogPath", "")))
        final_path = Path(str(scenario.get("finalMessagePath", "")))
        raw_text = raw_events.read_text(encoding="utf-8") if raw_events.is_file() else ""
        _record_condition(run_directory, case, "candidate", model, reasoning_effort, command, before, workspace, raw_text, stderr, exit_code, duration_ms, auth_seeded, timeout_seconds)
        _write_final(run_directory, final_path.read_text(encoding="utf-8") if final_path.is_file() else "")
        events = _normalize_events(raw_text)
        _write_json(run_directory / "discovery.json", _discovery_evidence(events, case))
    return {"exit_code": exit_code, "duration_ms": duration_ms}


def _grade(run_directory: Path, case: dict[str, Any]) -> dict[str, object]:
    grading = grade_case(run_directory, case)
    _write_json(run_directory / "grading.json", grading)
    return grading


def build_plan(cases: list[dict[str, Any]], model: str, reasoning_effort: str | None, run_id: str, auth_source: Path | None, timeout_seconds: int) -> dict[str, object]:
    """Return a side-effect-free plan suitable for ``--dry-run`` and tests."""
    return {
        "run_id": run_id,
        "runs_root": str(RUNS_ROOT / run_id),
        "model": model,
        "reasoning_effort": reasoning_effort,
        "timeout_seconds": timeout_seconds,
        "conditions": ["candidate", "baseline"],
        "cases": [{"id": case["id"], "skill_name": case["skill_name"], "fixture_root": case["fixture_root"]} for case in cases],
        "guarantees": [
            "candidate uses Plugin Eval with workspace-plugin-marketplace provisioning",
            "baseline uses codex exec with no Buddy provisioning and an empty or explicitly auth-seeded temporary CODEX_HOME",
            "fixtures, prompt, model, effort, sandbox, approval policy, and final-message output shape match",
            "normalized evidence excludes copied auth.json and config.toml",
        ],
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", action="append", default=[], help="case id to run; repeat for multiple cases")
    parser.add_argument("--suite", action="append", default=[], help="named suite to run; repeat to combine suites")
    parser.add_argument("--model", default="gpt-5.4", help="exact Codex model for both conditions")
    parser.add_argument("--reasoning-effort", help="optional exact effort for both conditions")
    parser.add_argument("--run-id", help="stable local evidence directory name")
    parser.add_argument("--dry-run", action="store_true", help="validate manifests and print the plan without live calls or writes")
    parser.add_argument("--plugin-eval", type=Path, default=PLUGIN_EVAL_DEFAULT, help="installed Plugin Eval CLI entrypoint")
    parser.add_argument("--auth-source", type=Path, help="directory whose auth.json is copied only into automatically removed temporary Codex homes")
    parser.add_argument("--timeout-seconds", type=int, default=600, help="maximum duration for each candidate or baseline condition")
    parser.add_argument("--quiet", action="store_true", help="suppress live progress messages and emit only the final JSON result")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        run_id = args.run_id or dt.datetime.now(tz=dt.UTC).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", run_id):
            raise EvaluationError("run id may contain only letters, numbers, dots, underscores, and hyphens")
        cases = _load_cases(set(args.case) | _load_suite_case_ids(set(args.suite)))
        if args.timeout_seconds < 1:
            raise EvaluationError("timeout seconds must be positive")
        plan = build_plan(cases, args.model, args.reasoning_effort, run_id, args.auth_source, args.timeout_seconds)
        if args.dry_run:
            print(json.dumps(plan, indent=2, sort_keys=True))
            return 0
        summary: list[dict[str, object]] = []
        _progress(args.quiet, f"run={run_id} cases={len(cases)} model={args.model} effort={args.reasoning_effort or 'default'} timeout={args.timeout_seconds}s")
        for case in cases:
            for condition in ("candidate", "baseline"):
                directory = RUNS_ROOT / run_id / str(case["id"]) / condition
                _progress(args.quiet, f"starting case={case['id']} condition={condition}")
                result = _run_candidate(directory, case, args.model, args.reasoning_effort, args.plugin_eval, args.auth_source, args.timeout_seconds) if condition == "candidate" else _run_baseline(directory, case, args.model, args.reasoning_effort, args.auth_source, args.timeout_seconds)
                grading = _grade(directory, case)
                item = {"case_id": case["id"], "condition": condition, **result, "hard_gate_failed": grading["hard_gate_failed"]}
                summary.append(item)
                outcome = "timed_out" if item["exit_code"] == 124 else "completed"
                _progress(args.quiet, f"{outcome} case={case['id']} condition={condition} exit={item['exit_code']} duration={int(item['duration_ms']) / 1000:.1f}s hard_gate_failed={str(item['hard_gate_failed']).lower()} evidence={_display_path(directory)}")
        _write_json(RUNS_ROOT / run_id / "summary.json", {"plan": plan, "runs": summary})
        _progress(args.quiet, f"finished run={run_id} evidence={_display_path(RUNS_ROOT / run_id)}")
        print(json.dumps({"run_id": run_id, "runs": summary}, indent=2, sort_keys=True))
        return 0
    except EvaluationError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
