"""Grade deterministic skill-evaluation assertions from retained evidence.

This module intentionally has no Codex dependency. It receives snapshots and
sanitized command events written by the runner, so tests can exercise the
same grading logic without an account, network access, or a local Codex home.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import re
from pathlib import Path
from typing import Callable


def _read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _snapshot_paths(snapshot: object) -> dict[str, dict[str, object]]:
    if not isinstance(snapshot, dict):
        return {}
    entries = snapshot.get("entries", [])
    if not isinstance(entries, list):
        return {}
    result: dict[str, dict[str, object]] = {}
    for entry in entries:
        if isinstance(entry, dict) and isinstance(entry.get("path"), str):
            result[entry["path"]] = entry
    return result


def _matching_paths(paths: dict[str, dict[str, object]], pattern: str) -> list[str]:
    return sorted(path for path in paths if fnmatch.fnmatchcase(path, pattern))


def _path_present(paths: dict[str, dict[str, object]], expected: str) -> bool:
    return expected in paths or any(path.startswith(f"{expected}/") for path in paths)


def _changed_paths(before: dict[str, dict[str, object]], after: dict[str, dict[str, object]]) -> list[str]:
    return sorted(
        path
        for path in set(before) | set(after)
        if path not in before or path not in after or before[path].get("sha256") != after[path].get("sha256")
    )


def _read_events(run_directory: Path) -> list[dict[str, object]]:
    path = run_directory / "events.jsonl"
    if not path.is_file():
        return []
    events: list[dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            events.append(value)
    return events


def _condition(run_directory: Path) -> str | None:
    metadata_path = run_directory / "metadata.json"
    if not metadata_path.is_file():
        return None
    metadata = _read_json(metadata_path)
    condition = metadata.get("condition") if isinstance(metadata, dict) else None
    return condition if isinstance(condition, str) else None


def _command_text(event: dict[str, object]) -> str:
    for key in ("command", "cmd", "input", "output", "stderr"):
        value = event.get(key)
        if isinstance(value, str):
            return value
    return ""


def _command_events(run_directory: Path) -> list[dict[str, object]]:
    return [event for event in _read_events(run_directory) if "command" in event or "cmd" in event]


def _all_command_output(run_directory: Path) -> tuple[str, str]:
    stdout: list[str] = []
    stderr: list[str] = []
    for event in _command_events(run_directory):
        for key, target in (("output", stdout), ("stdout", stdout), ("stderr", stderr)):
            value = event.get(key)
            if isinstance(value, str):
                target.append(value)
    return "\n".join(stdout), "\n".join(stderr)


def _research_schema(run_directory: Path, after: dict[str, dict[str, object]], expected: object) -> tuple[bool, str]:
    if not isinstance(expected, dict):
        return False, "expected schema is not an object"
    expected_sections = expected.get("sections", [])
    if not isinstance(expected_sections, list):
        return False, "expected sections is not a list"
    candidates = [
        path
        for path in after
        if fnmatch.fnmatchcase(path, ".ai/worklog/*_retry-mismatch/research_retry-mismatch.md")
    ]
    if len(candidates) != 1:
        return False, f"expected one research artifact, found {len(candidates)}"
    artifact = run_directory / "outputs" / candidates[0]
    if not artifact.is_file():
        return False, f"retained artifact is missing: {candidates[0]}"
    text = artifact.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text:
        return False, "artifact has no YAML frontmatter"
    frontmatter, body = text.split("---", 2)[1:]
    if "model_slug:" not in frontmatter or not frontmatter.split("model_slug:", 1)[1].strip():
        return False, "artifact has no concrete model_slug"
    missing = [section for section in expected_sections if f"## {section}" not in body]
    if missing:
        return False, f"artifact is missing sections: {', '.join(map(str, missing))}"
    return True, f"artifact schema is valid: {candidates[0]}"


def _write_scope(case: dict[str, object], before: dict[str, dict[str, object]], after: dict[str, dict[str, object]]) -> tuple[bool, str]:
    scope = case.get("write_scope")
    if not isinstance(scope, dict):
        return False, "case has no write_scope"
    allow = scope.get("allow", [])
    deny = scope.get("deny", [])
    if not isinstance(allow, list) or not isinstance(deny, list):
        return False, "write_scope patterns are invalid"
    changed = _changed_paths(before, after)
    violations = []
    for path in changed:
        denied = any(fnmatch.fnmatchcase(path, str(pattern)) for pattern in deny)
        allowed = any(fnmatch.fnmatchcase(path, str(pattern)) for pattern in allow)
        if denied or (scope.get("default") == "deny" and not allowed):
            violations.append(path)
    if violations:
        return False, f"write scope violations: {', '.join(violations)}"
    return True, "all changed paths comply with write_scope"


def _process_exit(run_directory: Path, expected: object) -> tuple[bool, str]:
    matching = [event for event in _command_events(run_directory) if "archive_worklogs.py" in _command_text(event)]
    if not matching:
        return False, "no retained archive_worklogs.py command event"
    actual = matching[-1].get("exit_code")
    return actual == expected, f"archive_worklogs.py exit code was {actual!r}"


def _hash_before_after(before: dict[str, dict[str, object]], after: dict[str, dict[str, object]], expected: object) -> tuple[bool, str]:
    if not isinstance(expected, dict):
        return False, "expected content hash mapping is invalid"
    source = expected.get("before")
    destination = expected.get("after")
    if not isinstance(source, str) or not isinstance(destination, str):
        return False, "expected before/after paths are invalid"
    source_hash = before.get(source, {}).get("sha256")
    destination_hash = after.get(destination, {}).get("sha256")
    return source_hash is not None and source_hash == destination_hash, "content hashes compared"


def _paths_unchanged(before: dict[str, dict[str, object]], after: dict[str, dict[str, object]], expected: object) -> tuple[bool, str]:
    if not isinstance(expected, list):
        return False, "expected paths is not a list"
    changed = []
    for path in expected:
        if not isinstance(path, str):
            continue
        matching_before = {key: value for key, value in before.items() if key == path or key.startswith(f"{path}/")}
        matching_after = {key: value for key, value in after.items() if key == path or key.startswith(f"{path}/")}
        if matching_before != matching_after:
            changed.append(path)
    return not changed, "unchanged paths: " + (", ".join(map(str, expected)) if not changed else ", ".join(changed))


def _changed_paths_equal(before: dict[str, dict[str, object]], after: dict[str, dict[str, object]], expected: object) -> tuple[bool, str]:
    if not isinstance(expected, list) or not all(isinstance(path, str) for path in expected):
        return False, "expected changed paths is not a string list"
    actual = _changed_paths(before, after)
    return actual == sorted(expected), f"changed paths: {actual}"


def _markdown_section(text: str, heading: str) -> tuple[str, str, str] | None:
    marker = re.compile(rf"^## {re.escape(heading)}[ \t]*\r?$", re.MULTILINE)
    matches = list(marker.finditer(text))
    if len(matches) != 1:
        return None
    section_start = matches[0].start()
    following = re.search(r"^## [^#].*$", text[matches[0].end():], re.MULTILINE)
    section_end = matches[0].end() + following.start() if following else len(text)
    return text[:section_start], text[section_start:section_end], text[section_end:]


def _markdown_section_only_changed(run_directory: Path, expected: object) -> tuple[bool, str]:
    if not isinstance(expected, dict):
        return False, "expected section check is not an object"
    path, heading = expected.get("path"), expected.get("heading")
    if not isinstance(path, str) or not isinstance(heading, str):
        return False, "expected section check requires path and heading"
    before_path = run_directory / "inputs" / path
    after_path = run_directory / "outputs" / path
    if not before_path.is_file() or not after_path.is_file():
        return False, f"retained before/after artifact is missing: {path}"
    before = _markdown_section(before_path.read_text(encoding="utf-8"), heading)
    after = _markdown_section(after_path.read_text(encoding="utf-8"), heading)
    if before is None or after is None:
        return False, f"expected exactly one ## {heading} section before and after"
    if before[0] != after[0] or before[2] != after[2]:
        return False, f"content outside ## {heading} changed"
    if before[1] == after[1] or not after[1].removeprefix(f"## {heading}").strip():
        return False, f"## {heading} did not gain nonempty content"
    return True, f"only ## {heading} changed in {path}"


def _innovation_option_structure(run_directory: Path, expected: object) -> tuple[bool, str]:
    if not isinstance(expected, dict):
        return False, "expected innovation structure is not an object"
    path, heading = expected.get("path"), expected.get("heading")
    if not isinstance(path, str) or not isinstance(heading, str):
        return False, "expected innovation structure requires path and heading"
    artifact = run_directory / "outputs" / path
    if not artifact.is_file():
        return False, f"retained artifact is missing: {path}"
    section = _markdown_section(artifact.read_text(encoding="utf-8"), heading)
    if section is None:
        return False, f"expected exactly one ## {heading} section"
    text = section[1]
    option_markers = list(re.finditer(r"^### (?:Option )?\d+[^\n]*$", text, re.MULTILINE))
    if not 1 <= len(option_markers) <= 3:
        return False, f"expected one to three option headings, found {len(option_markers)}"
    headings = [match.group(0).casefold().strip() for match in option_markers]
    if len(set(headings)) != len(headings):
        return False, "option headings are not distinct"
    required_fields = ("value", "cost", "risk", "when it fits")
    missing: list[str] = []
    for index, marker in enumerate(option_markers):
        end = option_markers[index + 1].start() if index + 1 < len(option_markers) else len(text)
        option_text = text[marker.end():end].casefold()
        missing.extend(field for field in required_fields if field not in option_text)
    if missing:
        return False, f"option fields missing: {', '.join(sorted(set(missing)))}"
    if "simplest-viable recommendation" not in text.casefold():
        return False, "missing simplest-viable recommendation"
    return True, f"structured innovation options: {len(option_markers)}"


def grade_case(run_directory: Path, case: dict[str, object]) -> dict[str, object]:
    """Grade one condition and return only deterministic evidence.

    Semantic assertions intentionally remain pending for the repository owner.
    """
    before = _snapshot_paths(_read_json(run_directory / "initial-tree.json"))
    after = _snapshot_paths(_read_json(run_directory / "final-tree.json"))
    condition = _condition(run_directory)
    results: list[dict[str, object]] = []
    for assertion in case.get("assertions", []):
        if not isinstance(assertion, dict):
            continue
        assertion_class = assertion.get("class")
        assertion_id = str(assertion.get("id", "unnamed-assertion"))
        conditions = assertion.get("conditions")
        if isinstance(conditions, list) and condition not in conditions:
            results.append({"id": assertion_id, "status": "not_applicable", "hard_gate": False, "evidence": f"assertion applies only to: {', '.join(map(str, conditions))}"})
            continue
        if assertion_class == "semantic":
            results.append({"id": assertion_id, "status": "pending_human", "hard_gate": bool(assertion.get("hard_gate")), "evidence": "semantic rubric requires a human score"})
            continue
        check = assertion.get("check")
        expected = assertion.get("expected")
        passed = False
        evidence = f"unsupported check: {check}"
        if check == "fixture_tree_hash_equal":
            passed = before == after
            evidence = "initial and final snapshots are equal" if passed else "initial and final snapshots differ"
        elif check == "single_path_matches" and isinstance(expected, str):
            matches = _matching_paths(after, expected)
            passed, evidence = len(matches) == 1, f"matched paths: {matches}"
        elif check == "research_artifact_schema":
            passed, evidence = _research_schema(run_directory, after, expected)
        elif check == "write_scope_compliant":
            passed, evidence = _write_scope(case, before, after)
        elif check == "stdout_contains" and isinstance(expected, str):
            stdout, _ = _all_command_output(run_directory)
            passed, evidence = expected in stdout, f"stdout contains expected text: {expected!r}"
        elif check == "stdout_contains_all" and isinstance(expected, list):
            stdout, _ = _all_command_output(run_directory)
            missing = [value for value in expected if isinstance(value, str) and value not in stdout]
            passed, evidence = not missing, f"missing stdout text: {missing}"
        elif check == "stderr_contains" and isinstance(expected, str):
            _, stderr = _all_command_output(run_directory)
            passed, evidence = expected in stderr, f"stderr contains expected text: {expected!r}"
        elif check == "process_exit_code":
            passed, evidence = _process_exit(run_directory, expected)
        elif check == "path_state" and isinstance(expected, dict):
            absent, present = expected.get("absent"), expected.get("present")
            passed = isinstance(absent, str) and isinstance(present, str) and not _path_present(after, absent) and _path_present(after, present)
            evidence = f"absent={absent!r}, present={present!r}"
        elif check == "content_hash_equal":
            passed, evidence = _hash_before_after(before, after, expected)
        elif check == "path_exists" and isinstance(expected, str):
            passed, evidence = _path_present(after, expected), f"path exists: {expected!r}"
        elif check == "paths_exist_and_hash_distinct" and isinstance(expected, list) and len(expected) == 2:
            first, second = expected
            first_hash = after.get(str(first), {}).get("sha256")
            second_hash = after.get(str(second), {}).get("sha256")
            passed, evidence = first_hash is not None and second_hash is not None and first_hash != second_hash, "paths exist with distinct hashes"
        elif check == "paths_unchanged":
            passed, evidence = _paths_unchanged(before, after, expected)
        elif check == "changed_paths_equal":
            passed, evidence = _changed_paths_equal(before, after, expected)
        elif check == "markdown_section_only_changed":
            passed, evidence = _markdown_section_only_changed(run_directory, expected)
        elif check == "innovation_option_structure":
            passed, evidence = _innovation_option_structure(run_directory, expected)
        elif assertion_class == "trace":
            evidence = "trace assertion is retained for human review; no stable event schema is assumed"
            results.append({"id": assertion_id, "status": "unverified", "hard_gate": bool(assertion.get("hard_gate")), "evidence": evidence})
            continue
        results.append({"id": assertion_id, "status": "passed" if passed else "failed", "hard_gate": bool(assertion.get("hard_gate")), "evidence": evidence})
    hard_gate_failed = any(item["hard_gate"] and item["status"] not in {"passed", "not_applicable"} for item in results)
    return {"hard_gate_failed": hard_gate_failed, "assertions": results}


def file_sha256(path: Path) -> str:
    """Return a SHA-256 digest used by snapshot and fixture checks."""
    return hashlib.sha256(path.read_bytes()).hexdigest()
