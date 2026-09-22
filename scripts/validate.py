# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6,<7"]
# ///
"""Validate Buddy's shared assets and all harness adapters."""

from __future__ import annotations

import ast
import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CURSOR_NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$")
STANDARD_SKILL_FIELDS = {
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
}
AGENT_FIELDS = {"name", "description"}
CODEX_MANIFEST_FIELDS = {
    "id",
    "name",
    "version",
    "description",
    "skills",
    "apps",
    "mcpServers",
    "interface",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
}
CURSOR_MANIFEST_FIELDS = {
    "name",
    "displayName",
    "description",
    "version",
    "author",
    "publisher",
    "homepage",
    "repository",
    "license",
    "logo",
    "keywords",
    "category",
    "tags",
    "commands",
    "agents",
    "skills",
    "rules",
    "hooks",
    "mcpServers",
}
BRAND_COLORS = {"#18243D", "#63D6C0"}
VISUAL_METADATA_FIELDS = {
    "icon",
    "logo",
    "brandColor",
    "composerIcon",
    "logoDark",
    "screenshots",
}
PLUGIN_VERSION = "1.1.5"
PLUGIN_DESCRIPTION = (
    "Plan the work. Control the context. Ship with proof. Buddy is a coding "
    "companion for developers that carries engineering work from research and "
    "planning through implementation and verification."
)
PLUGIN_LONG_DESCRIPTION_BASE = (
    "Buddy is a coding companion for developers who want a focused path from "
    "an engineering need to verified code. Reusable skills and agents keep "
    "research, decisions, planning, implementation, and verification connected"
)
CODEX_LONG_DESCRIPTION = f"{PLUGIN_LONG_DESCRIPTION_BASE} in Codex."
CLAUDE_LONG_DESCRIPTION = f"{PLUGIN_LONG_DESCRIPTION_BASE} in Claude Code."
CURSOR_LONG_DESCRIPTION = f"{PLUGIN_LONG_DESCRIPTION_BASE} in Cursor."
PLUGIN_AUTHOR_URL = "https://gruchala.eu"
PLUGIN_HOMEPAGE = "https://github.com/leszekgruchala/buddy"
PLUGIN_REPOSITORY = "https://github.com/leszekgruchala/buddy"
PLUGIN_LICENSE = "Elastic-2.0"
PLUGIN_KEYWORDS = (
    "coding",
    "developer-tools",
    "workflow",
    "research",
    "planning",
    "implementation",
    "verification",
    "ai-sdlc",
)
SHARED_HOOK_MATCHER = "Bash|Shell|local_shell|shell|shell_command|exec_command"
HOOK_DIRECTORY = ROOT / "hooks/block-destructive-commands"
PHASE_LOCK_SKILLS = {
    "archive-worklogs",
    "configure-models",
    "implement",
    "innovate",
    "research",
    "review-code",
    "spec",
    "test-runner",
}
PHASE_LOCK_DESCRIPTION = (
    "Remain active for follow-ups until an explicit user request or the calling "
    "`develop` orchestrator selects another skill."
)
PHASE_LOCK_BODY = (
    "Remain in this skill for follow-ups. Do not activate another Buddy skill or "
    "act outside this skill; only an explicit user request or the calling `develop` "
    "orchestrator can select the next skill."
)


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_local_ai_paths_are_untracked(errors: list[str]) -> None:
    """Reject local AI work files that are present in the Git index."""
    if not (ROOT / ".git").exists():
        return
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        output = result.stderr.strip()
        fail(errors, f"Git index validation failed: {output}")
        return
    tracked = sorted(
        path
        for path in result.stdout.split("\0")
        if path and path.split("/", 1)[0] in {".ai", "ai"}
    )
    for path in tracked:
        fail(errors, f"{path}: local AI work files must not be tracked")


def load_json(path: Path, errors: list[str]) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(errors, f"{path.relative_to(ROOT)}: invalid JSON: {error}")
        return {}
    if not isinstance(value, dict):
        fail(errors, f"{path.relative_to(ROOT)}: root must be an object")
        return {}
    return value


def frontmatter(path: Path, errors: list[str]) -> tuple[dict[str, object], str]:
    text = path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) != 3 or parts[0].strip():
        fail(errors, f"{path.relative_to(ROOT)}: missing YAML frontmatter")
        return {}, text
    try:
        value = yaml.safe_load(parts[1])
    except yaml.YAMLError as error:
        fail(errors, f"{path.relative_to(ROOT)}: invalid YAML: {error}")
        return {}, parts[2]
    if not isinstance(value, dict):
        fail(errors, f"{path.relative_to(ROOT)}: frontmatter must be a mapping")
        return {}, parts[2]
    return value, parts[2]


def validate_skills(errors: list[str]) -> None:
    for directory in sorted(path for path in (ROOT / "skills").iterdir() if path.is_dir()):
        path = directory / "SKILL.md"
        if not path.is_file():
            fail(errors, f"{directory.relative_to(ROOT)}: missing exact-case SKILL.md")
            continue
        data, body = frontmatter(path, errors)
        unknown = sorted(set(data) - STANDARD_SKILL_FIELDS)
        if unknown:
            fail(errors, f"{path.relative_to(ROOT)}: nonstandard fields: {', '.join(unknown)}")
        name = data.get("name")
        description = data.get("description")
        if not isinstance(name, str) or not NAME_RE.fullmatch(name):
            fail(errors, f"{path.relative_to(ROOT)}: invalid Agent Skills name")
        elif name != directory.name:
            fail(errors, f"{path.relative_to(ROOT)}: name must match parent directory")
        if not isinstance(description, str) or not 1 <= len(description) <= 1024:
            fail(errors, f"{path.relative_to(ROOT)}: description must contain 1-1024 characters")
        if not body.strip():
            fail(errors, f"{path.relative_to(ROOT)}: instruction body is empty")
        if len(path.read_text(encoding="utf-8").splitlines()) > 500:
            fail(errors, f"{path.relative_to(ROOT)}: exceeds the 500-line progressive-disclosure limit")
        if name != "develop" and "Do not activate another Buddy skill" not in body:
            fail(errors, f"{path.relative_to(ROOT)}: missing explicit cross-skill gate")
        if name in PHASE_LOCK_SKILLS:
            if PHASE_LOCK_DESCRIPTION not in description:
                fail(errors, f"{path.relative_to(ROOT)}: missing phase-lock description boundary")
            if PHASE_LOCK_BODY not in body:
                fail(errors, f"{path.relative_to(ROOT)}: missing phase-lock body lock")


def validate_worklog_contract(errors: list[str]) -> None:
    required = {
        ROOT / "skills/archive-worklogs/SKILL.md",
        ROOT / "skills/archive-worklogs/scripts/archive_worklogs.py",
    }
    for path in required:
        if not path.is_file():
            fail(errors, f"{path.relative_to(ROOT)}: required by the worklog archive contract")

    legacy_roots = (".ai/" + "research/", ".ai/" + "plans/", ".ai/" + "trash/")
    contracts = [
        *(ROOT / "skills").glob("**/*.md"),
        *(ROOT / "agents").glob("*.md"),
        ROOT / "README.md",
    ]
    for path in contracts:
        text = path.read_text(encoding="utf-8")
        for legacy_root in legacy_roots:
            if legacy_root in text:
                fail(errors, f"{path.relative_to(ROOT)}: obsolete artifact root {legacy_root}")

    expected = {
        ROOT / "skills/develop/SKILL.md": (
            ".ai/worklog/<yyyyMMdd>_<work-name>/",
            "research_<work-name>.md",
            "spec_<work-name>.md",
            "review_<work-name>.md",
            "trash/",
        ),
        ROOT / "skills/research/SKILL.md": (
            ".ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md",
            ".ai/worklog/<yyyyMMdd>_<work-name>/trash/",
            "Reuse the relevant passed worklog and research artifact",
            "Do not create, hand off, or leave a scaffold-only research file",
            "## OUTCOME",
            "model_slug",
            "top YAML front matter",
        ),
        ROOT / "skills/spec/SKILL.md": (
            ".ai/worklog/<yyyyMMdd>_<work-name>/",
            "spec_<work-name>.md",
            "model_slug",
            "exact runtime model slug",
        ),
        ROOT / "skills/implement/SKILL.md": (
            ".ai/worklog/<yyyyMMdd>_<work-name>/",
            "trash/",
            "spec_<work-name>.md",
            "## AGENT LOG",
        ),
        ROOT / "skills/review-code/SKILL.md": (
            ".ai/worklog/<yyyyMMdd>_<work-name>/review_<work-name>.md",
            ".ai/memory/memory.md",
            "| ID | Severity | Location | Bug | Evidence | Remediation | Status |",
        ),
        ROOT / "skills/archive-worklogs/SKILL.md": (
            ".ai/worklog/archive/<yyyy>/",
            "--older-than",
            "--apply",
            "Dry-run",
        ),
    }
    for path, fragments in expected.items():
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for fragment in fragments:
            if fragment not in text:
                fail(errors, f"{path.relative_to(ROOT)}: missing worklog contract {fragment}")

    script = ROOT / "skills/archive-worklogs/scripts/archive_worklogs.py"
    if script.is_file():
        try:
            ast.parse(script.read_text(encoding="utf-8"), filename=str(script))
        except SyntaxError as error:
            fail(errors, f"{script.relative_to(ROOT)}: invalid Python: {error}")


def validate_implement_goal_contract(errors: list[str]) -> None:
    skill_path = ROOT / "skills/implement/SKILL.md"
    worker_path = ROOT / "agents/implementor.md"
    missing = False
    for path in (skill_path, worker_path):
        if not path.is_file():
            fail(errors, f"{path.relative_to(ROOT)}: missing Goal contract file")
            missing = True
    if missing:
        return

    skill = skill_path.read_text(encoding="utf-8")
    host_goal = skill.partition("## Host Goal")[2].partition("## Engineering rules")[0]
    required_skill_fragments = (
        "Before editing any deliverable or dispatching a worker",
        "remaining phase titles in dependency order",
        "omitting phases marked `SUCCESS`",
        "working brief's one-sentence outcome",
        "native Goal/task-list capability",
        "Represent both the objective and every high-level item",
        "retain every returned native identifier",
        "Fallback is allowed only",
        "partial native state exists",
        "Goal (harness fallback)",
        "Do not edit or dispatch until this gate passes.",
        "Goal gate: native` or `Goal gate: fallback",
        "mark the corresponding native item in progress",
        "Complete the whole Goal only after all phases and final verification pass",
    )
    if not host_goal:
        fail(errors, "skills/implement/SKILL.md: missing Host Goal contract")
    for fragment in required_skill_fragments:
        if fragment not in host_goal:
            fail(errors, f"skills/implement/SKILL.md: missing Goal contract {fragment!r}")

    worker = worker_path.read_text(encoding="utf-8")
    required_worker_fragments = (
        "Goal gate: native` or `Goal gate: fallback",
        "return `BLOCKED` without editing",
        "Never create, update, replace, or complete the host Goal.",
    )
    for fragment in required_worker_fragments:
        if fragment not in worker:
            fail(errors, f"agents/implementor.md: missing Goal worker gate {fragment!r}")


def validate_review_contract(errors: list[str]) -> None:
    """Keep review, remediation, and prevention-memory contracts aligned."""
    required_fragments = {
        ROOT / "skills/review-code/SKILL.md": (
            "Do not activate another Buddy skill",
            "Never edit production code, tests, specifications, manifests, or hooks.",
            "Never stage, commit, or push `.ai` files.",
            "references/review-method.md",
            "Build a coverage map",
            "requirement completeness",
            "cross-file contracts",
            "security boundaries",
            "Status: COMPLETE",
            "## Uncertainties",
            "## Coverage",
            "## Verification",
            "## Limits",
            "correctness, security, regression, or test-adequacy",
            "style, preferences, speculative risk, optional hardening, or pre-existing",
            "Critical",
            "High",
            "Medium",
            "Low",
            "| ID | Severity | Location | Bug | Evidence | Remediation | Status |",
            "`Open`, `Fixed`, `Blocked`, or `Not a bug`",
            "A clean review has the findings header and no finding rows.",
            ".ai/memory/memory.md",
            "deduplicated, one-line imperative rules",
            "full required validation",
            "fresh review",
        ),
        ROOT / "skills/review-code/references/review-method.md": (
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
        ),
        ROOT / "agents/code-reviewer.md": (
            "skills/review-code/SKILL.md",
            "independent reviewer",
            "Never edit production code or tests",
        ),
        ROOT / "skills/develop/SKILL.md": (
            "`review-code` after implementation validation",
            "fresh independent reviewer",
            "at most two\n   fix/re-review rounds",
            "Each round must close at least one finding or add concrete\n   evidence",
            "every actionable finding is `Fixed` or `Not a bug`",
        ),
        ROOT / "agents/developer.md": (
            "independent review and required remediation loop pass",
        ),
        ROOT / "skills/model-policy/SKILL.md": (
            "| review code | `balanced` | fresh independent reviewer |",
        ),
        ROOT / "skills/spec/SKILL.md": (
            ".ai/memory/memory.md",
            "cannot\n   expand scope",
        ),
        ROOT / "skills/implement/SKILL.md": (
            ".ai/memory/memory.md",
            "Apply only\n   relevant rules",
        ),
        ROOT / "agents/implementor.md": (
            ".ai/memory/memory.md",
            "Apply only\nrelevant rules",
        ),
        ROOT / "README.md": (
            "## Review and learning",
            "`review_<work-name>.md`",
            ".ai/memory/memory.md",
            "at most two\nrounds",
        ),
    }
    for path, fragments in required_fragments.items():
        if not path.is_file():
            fail(errors, f"{path.relative_to(ROOT)}: missing review contract file")
            continue
        text = " ".join(path.read_text(encoding="utf-8").split())
        for fragment in fragments:
            if " ".join(fragment.split()) not in text:
                fail(errors, f"{path.relative_to(ROOT)}: missing review contract {fragment!r}")

def validate_adaptive_workflow_contract(errors: list[str]) -> None:
    """Validate stable fragments and examples of the compact phase contract."""
    required_fragments = {
        ROOT / "skills/model-policy/SKILL.md": (
            "Tier names select profile mappings; they do not promise relative cost or capability.",
            "This policy resolves that selected tier",
            "declared phase tier",
        ),
        ROOT / "skills/spec/SKILL.md": (
            "shared contract is self-contained, repository-relative, decision-complete",
            "Use [reference.md](reference.md) to write one shared contract",
            "fewest coherent phase deltas",
            "Every success criterion is named by at least one verification entry.",
            "Every phase, including `fast`, `balanced`, and `frontier`",
            "only the success criteria it establishes at completion",
            "every check linked to a phase is runnable when that phase completes",
            "Optional fields only narrow, route, or make that work deterministic",
            "no phase text authorizes an unreferenced outcome",
            "nothing already implied by the resolved shared contract",
            "listed order does not already express it",
            "State each fact once",
            "Balanced and frontier workers discover local details through disposable runtime plans",
            "Every exact path has a contract, immutable-input, safety, or parallel-ownership reason.",
        ),
        ROOT / "skills/spec/reference.md": (
            "`REQUIREMENTS` — atomic items with stable IDs",
            "`SUCCESS CRITERIA` — observable integrated-revision results with IDs",
            "Every phase contains `id`, `goal`, non-empty `requirements`, and non-empty `success_criteria`.",
            "Write each as `V1 [SC1, SC2]: ...`",
            "Express a later-lifecycle recheck as a distinct terminal criterion.",
            "not related criteria inherited from earlier phases",
            "They never add deliverables, behavior, acceptance conditions, or shared-contract restrictions.",
            "Do not restate that a phase follows the phase immediately before it.",
            "remove it when the resolved shared contract already implies it",
            "default `balanced`",
            "deterministic transformation",
            "Balanced and frontier runtime plans are disposable.",
            "The host materializes an effective brief",
        ),
        ROOT / "skills/implement/SKILL.md": (
            "The shared contract is authoritative",
            "materializes an effective brief",
            "every verification entry that names those criteria",
            "Run every verification entry that names the phase's success criteria",
            "disposable runtime plan",
            "A later write invalidates affected evidence.",
            "one bounded attempt",
            "evidence:",
            "repair_hint:",
            "never a raw validation transcript",
            "## Bounded continuation",
            "at most one fresh repair attempt",
            "new evidence or a materially different causal hypothesis",
            "retains the declared phase tier and mutation ownership",
            "stronger tier, broader ownership, or changed decision",
            "continuation mechanisms callable in the current harness",
            "integrated success criteria pass and its Agent Log entry is written",
            "all phases and final verification pass",
        ),
        ROOT / "skills/implement/reference.md": (
            "current shared contract plus one phase delta",
            "verification entries that name those criteria",
            "disposable runtime plan",
            "outside its persisted mutation ownership or across a protected boundary",
            "Otherwise proceed autonomously.",
        ),
        ROOT / "agents/implementor.md": (
            "Load and follow the Buddy `implement` skill before acting.",
            "Make one bounded attempt for one phase.",
            "Do not spawn agents or authorize repair or continuation.",
            "Return the concise result required by the skill",
            "resolved requirements, success criteria, verification",
            "Do not persist a runtime plan or raw transcript.",
            "never a raw validation transcript",
        ),
        ROOT / "README.md": (
            "Balanced is the normal implementation tier.",
            "Fast is only for deterministic transformations",
            "Compact phase deltas reference that contract",
            "every worker still receives its applicable requirements, success criteria",
            "every criterion is named by at least one verification entry",
            "later-lifecycle rechecks use distinct terminal criteria",
            "optional fields may only narrow, route, or make that work deterministic",
            "Fast phases add a deterministic anchor or procedure",
            "runtime plans are disposable",
            "A phase Goal item completes after its integrated criteria pass",
        ),
        ROOT / "skills/develop/SKILL.md": (
            "phase boundaries are unsettled",
            "materializes each effective brief",
            "persisted phase records give disjoint mutation ownership",
            "failure-only bounded continuation policy",
        ),
        ROOT / "docs/harness-compatibility.md": (
            "current shared contract and one compact phase delta",
            "the criteria it establishes at completion plus the verification entries that name those criteria",
            "Phase references cover all work authorized by the delta without repeating inherited contract content.",
            "runtime plans",
            "persisted boundaries and mutation ownership remain authoritative",
        ),
    }
    for path, fragments in required_fragments.items():
        if not path.is_file():
            fail(errors, f"{path.relative_to(ROOT)}: missing adaptive workflow contract file")
            continue
        text = path.read_text(encoding="utf-8")
        for fragment in fragments:
            if fragment not in text:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: missing adaptive workflow contract {fragment!r}",
                )

    obsolete_paths = (ROOT / "skills/implement/references/continuation.md",)
    for path in obsolete_paths:
        if path.exists():
            fail(errors, f"{path.relative_to(ROOT)}: obsolete adaptive workflow file")

    prohibited_fragments = {
        ROOT / "skills/model-policy/SKILL.md": (
            "tier_rationale",
            "fast-default",
            "low-risk",
            "remaining implementation reasoning, not from the existence of a specification",
        ),
        ROOT / "skills/spec/reference.md": (
            "files_touched",
            "ordered `steps`",
            "reasoning_effort",
            "scope.include",
            "scope.protect",
            "The phase record is the worker brief.",
            "Every tier uses this same schema.",
            "parallel_with: []",
            "depends_on: []",
        ),
        ROOT / "skills/implement/SKILL.md": (
            "validation_result:",
            "failure_class:",
            "failure_signature:",
            "next_hypothesis:",
            "## Host continuation",
        ),
        ROOT / "skills/implement/reference.md": (
            "files_touched",
            "TODO",
        ),
        ROOT / "agents/implementor.md": (
            "skills/implement/SKILL.md",
            "validation_result:",
            "failure_class:",
            "failure_signature:",
            "next_hypothesis:",
        ),
        ROOT / "skills/develop/SKILL.md": (
            "After a command fails twice",
            "exact implementation mapping",
        ),
        ROOT / "README.md": (
            "files_touched",
            "ordered `steps`",
            "one fresh repair attempt",
            "Every tier uses the same scope contract.",
            "The record is the worker brief.",
        ),
    }
    for path, fragments in prohibited_fragments.items():
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for fragment in fragments:
            if fragment in text:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: retains obsolete adaptive workflow contract {fragment!r}",
                )

    compact_example_paths = (
        ROOT / "skills/spec/reference.md",
        ROOT / "README.md",
    )
    legacy_phase_keys = {
        "files_touched",
        "guidelines",
        "out_of_scope",
        "reasoning_effort",
        "scope",
        "steps",
        "why",
    }
    for path in compact_example_paths:
        text = path.read_text(encoding="utf-8")
        declared_requirement_ids = set(re.findall(r"^- (R\d+):", text, flags=re.MULTILINE))
        declared_success_ids = set(re.findall(r"^- (SC\d+):", text, flags=re.MULTILINE))
        referenced_requirement_ids: set[str] = set()
        referenced_success_ids: set[str] = set()
        blocks = re.findall(r"```yaml\n(.*?)\n```", text, flags=re.DOTALL)
        if not blocks:
            fail(errors, f"{path.relative_to(ROOT)}: missing compact phase YAML example")
            continue
        for index, block in enumerate(blocks, start=1):
            try:
                phase = yaml.safe_load(block)
            except yaml.YAMLError as error:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: invalid compact phase example {index}: {error}",
                )
                continue
            if not isinstance(phase, dict):
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example {index} must be a mapping",
                )
                continue
            missing = {"id", "goal", "requirements", "success_criteria"} - phase.keys()
            if missing:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example {index} misses {sorted(missing)}",
                )
            for key, prefix in (("requirements", "R"), ("success_criteria", "SC")):
                values = phase.get(key)
                if not isinstance(values, list) or not values:
                    fail(
                        errors,
                        f"{path.relative_to(ROOT)}: compact phase example {index} needs non-empty {key}",
                    )
                    continue
                if any(not isinstance(value, str) or not value.startswith(prefix) for value in values):
                    fail(
                        errors,
                        f"{path.relative_to(ROOT)}: compact phase example {index} has invalid {key} IDs",
                    )
                elif key == "requirements":
                    referenced_requirement_ids.update(values)
                else:
                    referenced_success_ids.update(values)
            present_legacy = legacy_phase_keys & phase.keys()
            if present_legacy:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example {index} uses legacy keys {sorted(present_legacy)}",
                )
            if phase.get("agent") == "implementor" or phase.get("tier") == "balanced":
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example {index} must omit default routing",
                )
            for key, value in phase.items():
                if value is None or value == "" or value == [] or value == {}:
                    fail(
                        errors,
                        f"{path.relative_to(ROOT)}: compact phase example {index} has empty optional field {key!r}",
                    )
            tier = phase.get("tier")
            if tier in {"fast", "frontier"} and not phase.get("tier_rationale"):
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example {index} needs tier_rationale for {tier}",
                )

        for label, referenced, declared in (
            ("requirement", referenced_requirement_ids, declared_requirement_ids),
            ("success criterion", referenced_success_ids, declared_success_ids),
        ):
            unknown = referenced - declared
            if unknown:
                fail(
                    errors,
                    f"{path.relative_to(ROOT)}: compact phase example references undeclared {label} IDs {sorted(unknown)}",
                )

        verification_mappings = re.findall(
            r"^- V\d+ \[([^\]]+)\]:", text, flags=re.MULTILINE
        )
        covered_success_ids = {
            value.strip()
            for mapping in verification_mappings
            for value in mapping.split(",")
            if value.strip()
        }
        invalid_coverage_ids = {
            value for value in covered_success_ids if not re.fullmatch(r"SC\d+", value)
        }
        if invalid_coverage_ids:
            fail(
                errors,
                f"{path.relative_to(ROOT)}: verification example has invalid success criterion IDs {sorted(invalid_coverage_ids)}",
            )
        unknown_coverage_ids = covered_success_ids - declared_success_ids
        if unknown_coverage_ids:
            fail(
                errors,
                f"{path.relative_to(ROOT)}: verification example covers undeclared success criterion IDs {sorted(unknown_coverage_ids)}",
            )
        missing_coverage = declared_success_ids - covered_success_ids
        if missing_coverage:
            fail(
                errors,
                f"{path.relative_to(ROOT)}: verification example does not cover {sorted(missing_coverage)}",
            )


def validate_agents(errors: list[str]) -> None:
    expected_skill_references = {
        "code-reviewer": "skills/review-code/SKILL.md",
        "developer": "skills/develop/SKILL.md",
        "implementor": "Buddy `implement` skill",
        "innovator": "skills/innovate/SKILL.md",
        "researcher": "skills/research/SKILL.md",
        "test-runner": "skills/test-runner/SKILL.md",
    }
    for path in sorted((ROOT / "agents").glob("*.md")):
        data, body = frontmatter(path, errors)
        unknown = sorted(set(data) - AGENT_FIELDS)
        if unknown:
            fail(errors, f"{path.relative_to(ROOT)}: nonportable agent fields: {', '.join(unknown)}")
        name = data.get("name")
        description = data.get("description")
        if name != path.stem or not isinstance(name, str) or not NAME_RE.fullmatch(name):
            fail(errors, f"{path.relative_to(ROOT)}: name must match the filename")
        if not isinstance(description, str) or not description.strip():
            fail(errors, f"{path.relative_to(ROOT)}: description is required")
        skill_reference = expected_skill_references.get(path.stem)
        if skill_reference is None or skill_reference not in body:
            fail(errors, f"{path.relative_to(ROOT)}: must point to its shared skill contract")


def validate_brand_assets(errors: list[str]) -> None:
    path = ROOT / "assets/buddy.svg"
    if not path.is_file():
        fail(errors, "assets/buddy.svg: missing required brand asset")
        return
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError) as error:
        fail(errors, f"assets/buddy.svg: invalid XML: {error}")
        return

    if root.tag.rsplit("}", 1)[-1] != "svg":
        fail(errors, "assets/buddy.svg: root element must be svg")
    if root.get("viewBox") != "0 0 1024 1024":
        fail(errors, "assets/buddy.svg: viewBox must be 0 0 1024 1024")

    colors = {
        color.upper()
        for element in root.iter()
        for value in element.attrib.values()
        for color in re.findall(r"#[0-9A-Fa-f]{6}\b", value)
    }
    missing_colors = sorted(BRAND_COLORS - colors)
    unexpected_colors = sorted(colors - BRAND_COLORS)
    if missing_colors:
        fail(errors, f"assets/buddy.svg: missing palette colors: {', '.join(missing_colors)}")
    if unexpected_colors:
        fail(errors, f"assets/buddy.svg: unsupported hex colors: {', '.join(unexpected_colors)}")

    forbidden_elements = {
        "text",
        "image",
        "filter",
        "linearGradient",
        "radialGradient",
        "script",
        "style",
    }
    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag in forbidden_elements:
            fail(errors, f"assets/buddy.svg: unsupported {tag} element")
        if tag != "rect":
            continue
        try:
            x = float(element.get("x", "0"))
            y = float(element.get("y", "0"))
            width = float(element.attrib["width"])
            height = float(element.attrib["height"])
        except (KeyError, ValueError):
            continue
        if x <= 0 and y <= 0 and x + width >= 1024 and y + height >= 1024:
            fail(errors, "assets/buddy.svg: must not contain a full-canvas rectangle")


def validate_license(errors: list[str]) -> None:
    path = ROOT / "LICENSE"
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        fail(errors, f"LICENSE: missing Elastic License 2.0 text: {error}")
        return
    expected_header = "Elastic License 2.0 (ELv2)\n\nCopyright 2026 Leszek Gruchała\n"
    if not text.startswith(expected_header):
        fail(errors, "LICENSE: expected Elastic License 2.0 and Leszek Gruchała copyright")
    if "hosted or managed\nservice" not in text:
        fail(errors, "LICENSE: missing Elastic License 2.0 hosted-service limitation")


def validate_manifests(errors: list[str]) -> None:
    codex = load_json(ROOT / ".codex-plugin/plugin.json", errors)
    claude = load_json(ROOT / ".claude-plugin/plugin.json", errors)
    cursor = load_json(ROOT / ".cursor-plugin/plugin.json", errors)
    for label, manifest in (("Codex", codex), ("Claude", claude), ("Cursor", cursor)):
        if manifest.get("name") != "buddy":
            fail(errors, f"{label} manifest: plugin name must be buddy")
        expected_metadata = {
            "version": PLUGIN_VERSION,
            "description": PLUGIN_DESCRIPTION,
            "homepage": PLUGIN_HOMEPAGE,
            "repository": PLUGIN_REPOSITORY,
            "license": PLUGIN_LICENSE,
            "keywords": list(PLUGIN_KEYWORDS),
        }
        for field, expected in expected_metadata.items():
            if manifest.get(field) != expected:
                fail(errors, f"{label} manifest: {field} must be {expected!r}")
        if manifest.get("skills") != "./skills/":
            fail(errors, f"{label} manifest: skills must point to ./skills/")
    expected_web_author = {"name": "Leszek Gruchała", "url": PLUGIN_AUTHOR_URL}
    if codex.get("author") != expected_web_author:
        fail(errors, "Codex manifest: author must contain Leszek Gruchała and the homepage")
    if claude.get("author") != expected_web_author:
        fail(errors, "Claude manifest: author must contain Leszek Gruchała and the homepage")
    if cursor.get("author") != {"name": "Leszek Gruchała"}:
        fail(errors, "Cursor manifest: author must contain only Leszek Gruchała")
    if "agents" in claude or cursor.get("agents") != "./agents/":
        fail(errors, "Claude must use root agent discovery; Cursor must point agents to ./agents/")
    if cursor.get("rules") != "./rules/":
        fail(errors, "Cursor manifest: rules must point to ./rules/")
    interface = codex.get("interface")
    if not isinstance(interface, dict):
        fail(errors, "Codex manifest: interface must be an object")
    else:
        expected_interface = {
            "displayName": "buddy",
            "shortDescription": "Plan the work. Control the context. Ship with proof.",
            "longDescription": CODEX_LONG_DESCRIPTION,
            "developerName": "Leszek Gruchała",
            "category": "Productivity",
            "brandColor": "#18243D",
            "composerIcon": "./assets/buddy.svg",
            "logo": "./assets/buddy.svg",
            "websiteURL": PLUGIN_HOMEPAGE,
        }
        for field, expected in expected_interface.items():
            if interface.get(field) != expected:
                fail(errors, f"Codex manifest: interface.{field} must be {expected}")
    if cursor.get("logo") != "assets/buddy.svg":
        fail(errors, "Cursor manifest: logo must be assets/buddy.svg")
    if cursor.get("displayName") != "buddy":
        fail(errors, "Cursor manifest: displayName must be buddy")
    if cursor.get("category") != "Developer Tools":
        fail(errors, "Cursor manifest: category must be Developer Tools")
    if "hooks" in codex:
        fail(errors, "Codex manifest: must use default root hooks/hooks.json discovery")
    for label, manifest in (("Claude", claude), ("Cursor", cursor)):
        if manifest.get("hooks") != "./hooks/hooks.json":
            fail(errors, f"{label} manifest: hooks must point to ./hooks/hooks.json")
    unsupported_claude_visuals = sorted(set(claude) & VISUAL_METADATA_FIELDS)
    if unsupported_claude_visuals:
        fail(
            errors,
            "Claude manifest: unsupported visual metadata: "
            + ", ".join(unsupported_claude_visuals),
        )
    unknown_codex = sorted(set(codex) - CODEX_MANIFEST_FIELDS)
    unknown_cursor = sorted(set(cursor) - CURSOR_MANIFEST_FIELDS)
    if unknown_codex:
        fail(errors, f"Codex manifest: unsupported fields: {', '.join(unknown_codex)}")
    if unknown_cursor:
        fail(errors, f"Cursor manifest: unsupported fields: {', '.join(unknown_cursor)}")
    if not CURSOR_NAME_RE.fullmatch(str(cursor.get("name", ""))):
        fail(errors, "Cursor manifest: invalid name")


def validate_cursor_goal_rule(errors: list[str]) -> None:
    path = ROOT / "rules/buddy-goal.mdc"
    if not path.is_file():
        fail(errors, "rules/buddy-goal.mdc: required for Cursor native Goal guidance")
        return
    data, body = frontmatter(path, errors)
    if set(data) != {"description", "alwaysApply"}:
        fail(errors, "rules/buddy-goal.mdc: frontmatter must contain description and alwaysApply")
    if not isinstance(data.get("description"), str) or not data["description"].strip():
        fail(errors, "rules/buddy-goal.mdc: description must be non-empty")
    if data.get("alwaysApply") is not True:
        fail(errors, "rules/buddy-goal.mdc: must always apply so Goal guidance is available")
    required = (
        "main agent",
        "Buddy's `implement` skill",
        "Unless the user explicitly opts out of Goal tracking",
        "create and maintain exactly one native Goal",
        "Do not create a Goal for any other work or change any other external state",
        "persistent guidance, not authorization",
        "does not override native Goal tool policy",
        "harness fallback",
    )
    for fragment in required:
        if fragment not in body:
            fail(errors, f"rules/buddy-goal.mdc: missing Goal boundary {fragment}")


def validate_hooks(errors: list[str]) -> None:
    shared_hooks = load_json(ROOT / "hooks/hooks.json", errors)
    expected_shared_hooks = {
        "hooks": {
            "PreToolUse": [
                {
                    "matcher": SHARED_HOOK_MATCHER,
                    "hooks": [
                        {
                            "type": "command",
                            "command": (
                                '/bin/zsh "${CLAUDE_PLUGIN_ROOT}/hooks/'
                                'run-pretooluse.zsh"'
                            ),
                            "timeout": 5,
                        }
                    ],
                }
            ]
        },
    }
    if shared_hooks != expected_shared_hooks:
        fail(
            errors,
            "hooks/hooks.json: shared Codex, Claude Code, and Cursor hook contract "
            "is invalid",
        )

    cursor_hook_directory = ROOT / "hooks/cursor"
    if cursor_hook_directory.is_dir() and any(cursor_hook_directory.iterdir()):
        fail(
            errors,
            "hooks/cursor: Cursor must use the shared root hooks/hooks.json contract",
        )

    shared_launcher = ROOT / "hooks/run-pretooluse.zsh"
    production_hooks = [
        shared_launcher,
        HOOK_DIRECTORY / "block-destructive-shell.zsh",
        HOOK_DIRECTORY / "block-destructive-shell-pretooluse.zsh",
    ]
    validator = HOOK_DIRECTORY / "validate-block-destructive-shell.zsh"
    hook_files = [*production_hooks, validator]
    for path in hook_files:
        if not path.is_file():
            fail(errors, f"{path.relative_to(ROOT)}: missing hook file")

    for path in production_hooks:
        if not path.is_file():
            continue
        if "python" in path.read_text(encoding="utf-8").lower():
            fail(errors, f"{path.relative_to(ROOT)}: production hook must not use Python")

    zsh = shutil.which("zsh")
    if zsh is None:
        fail(errors, "hooks: zsh is required for syntax and regression validation")
        return
    for path in hook_files:
        if not path.is_file():
            continue
        result = subprocess.run(
            [zsh, "-n", str(path)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            output = (result.stdout + result.stderr).strip()
            fail(errors, f"{path.relative_to(ROOT)}: zsh syntax failed: {output}")

    if shared_launcher.is_file():
        for command, expected in (("git status", "allow"), ("terraform apply -help", "deny")):
            payload = json.dumps({"cwd": str(ROOT), "tool_input": {"command": command}})
            result = subprocess.run(
                [zsh, str(shared_launcher)],
                cwd=ROOT.parent,
                input=payload,
                capture_output=True,
                text=True,
                check=False,
            )
            try:
                output = json.loads(result.stdout)
            except json.JSONDecodeError:
                output = None
            decision = (
                output.get("hookSpecificOutput", {}).get("permissionDecision", "allow")
                if isinstance(output, dict)
                else None
            )
            if result.returncode or decision != expected:
                fail(
                    errors,
                    "hooks/run-pretooluse.zsh: failed cross-directory "
                    f"{expected} check for {command!r}",
                )

    if not validator.is_file():
        return
    result = subprocess.run(
        [zsh, str(validator)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    output = (result.stdout + result.stderr).strip()
    if result.returncode:
        fail(errors, f"hooks: destructive-command regression failed: {output}")
    elif "Results: 42 passed, 0 failed" not in result.stdout:
        fail(errors, "hooks: expected all 42 destructive-command regressions to pass")


def validate_marketplaces(errors: list[str]) -> None:
    paths = {
        "Codex": ROOT / ".agents/plugins/marketplace.json",
        "Claude": ROOT / ".claude-plugin/marketplace.json",
        "Cursor": ROOT / ".cursor-plugin/marketplace.json",
    }
    marketplaces: dict[str, dict[str, object]] = {}
    for label, path in paths.items():
        data = load_json(path, errors)
        marketplaces[label] = data
        plugins = data.get("plugins")
        if data.get("name") != "buddy" or not isinstance(plugins, list) or len(plugins) != 1:
            fail(errors, f"{label} marketplace: expected one buddy entry")
            continue
        entry = plugins[0]
        if not isinstance(entry, dict) or entry.get("name") != "buddy":
            fail(errors, f"{label} marketplace: invalid buddy entry")
            continue
        visual_fields = sorted(set(entry) & VISUAL_METADATA_FIELDS)
        if visual_fields:
            fail(
                errors,
                f"{label} marketplace: unsupported visual metadata: {', '.join(visual_fields)}",
            )
    expected_codex_entry = {
        "name": "buddy",
        "source": {
            "source": "url",
            "url": "https://github.com/leszekgruchala/buddy.git",
            "ref": "main",
        },
        "policy": {
            "installation": "AVAILABLE",
            "authentication": "ON_INSTALL",
        },
        "category": "Productivity",
    }
    codex = marketplaces.get("Codex", {})
    if codex.get("interface") != {"displayName": "buddy"}:
        fail(errors, "Codex marketplace: interface.displayName must be buddy")
    if codex.get("plugins") != [expected_codex_entry]:
        fail(errors, "Codex marketplace: buddy entry metadata is out of sync")

    expected_claude_entry = {
        "name": "buddy",
        "source": ".",
        "description": PLUGIN_DESCRIPTION,
        "version": PLUGIN_VERSION,
        "author": {"name": "Leszek Gruchała"},
        "homepage": PLUGIN_HOMEPAGE,
        "repository": PLUGIN_REPOSITORY,
        "license": PLUGIN_LICENSE,
        "keywords": list(PLUGIN_KEYWORDS),
        "category": "development",
    }
    claude = marketplaces.get("Claude", {})
    if claude.get("version") != PLUGIN_VERSION:
        fail(errors, f"Claude marketplace: version must be {PLUGIN_VERSION}")
    if claude.get("owner") != {"name": "Leszek Gruchała"}:
        fail(errors, "Claude marketplace: owner must contain only Leszek Gruchała")
    if claude.get("description") != CLAUDE_LONG_DESCRIPTION:
        fail(errors, "Claude marketplace: description is out of sync")
    if claude.get("plugins") != [expected_claude_entry]:
        fail(errors, "Claude marketplace: buddy entry metadata is out of sync")

    expected_cursor_entry = {
        "name": "buddy",
        "source": ".",
        "description": PLUGIN_DESCRIPTION,
    }
    cursor = marketplaces.get("Cursor", {})
    if cursor.get("owner") != {"name": "Leszek Gruchała"}:
        fail(errors, "Cursor marketplace: owner must contain only Leszek Gruchała")
    if cursor.get("metadata") != {
        "description": CURSOR_LONG_DESCRIPTION,
        "version": PLUGIN_VERSION,
    }:
        fail(errors, "Cursor marketplace: metadata is out of sync")
    if cursor.get("plugins") != [expected_cursor_entry]:
        fail(errors, "Cursor marketplace: buddy entry must stay schema-minimal and in sync")


def validate_links_and_newlines(errors: list[str]) -> None:
    text_suffixes = {".md", ".mdc", ".json", ".py", ".zsh"}
    link_re = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    excluded_roots = {".git", ".ai", "ai"}
    for path in sorted(
        file
        for file in ROOT.rglob("*")
        if file.is_file() and file.relative_to(ROOT).parts[0] not in excluded_roots
    ):
        if path.suffix not in text_suffixes and path.name != "LICENSE":
            continue
        content = path.read_bytes()
        if not content.endswith(b"\n") or content.endswith(b"\n\n"):
            fail(errors, f"{path.relative_to(ROOT)}: must end with exactly one newline")
        if path.suffix not in {".md", ".mdc"}:
            continue
        text = content.decode("utf-8")
        for target in link_re.findall(text):
            if "://" in target or target.startswith("#") or target.startswith("mailto:"):
                continue
            clean = target.split("#", 1)[0]
            if clean and not (path.parent / clean).resolve().exists():
                fail(errors, f"{path.relative_to(ROOT)}: broken link {target}")


def validate_claude_cli(errors: list[str]) -> None:
    if shutil.which("claude") is None:
        return
    result = subprocess.run(
        ["claude", "plugin", "validate", "--strict", "."],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        output = (result.stdout + result.stderr).strip()
        fail(errors, f"Claude CLI validation failed: {output}")


def main() -> int:
    errors: list[str] = []
    validate_local_ai_paths_are_untracked(errors)
    validate_skills(errors)
    validate_worklog_contract(errors)
    validate_implement_goal_contract(errors)
    validate_review_contract(errors)
    validate_adaptive_workflow_contract(errors)
    validate_agents(errors)
    validate_brand_assets(errors)
    validate_license(errors)
    validate_manifests(errors)
    validate_cursor_goal_rule(errors)
    validate_hooks(errors)
    validate_marketplaces(errors)
    validate_links_and_newlines(errors)
    validate_claude_cli(errors)
    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Validation passed: Agent Skills, Codex, Claude Code, and Cursor")
    return 0


if __name__ == "__main__":
    sys.exit(main())
