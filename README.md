# Buddy AI Dev Support

Reusable coding workflows packaged for Codex, Claude Code, and Cursor.

## Workflows

Use the smallest stage that matches the request. Buddy settles change decisions inside `spec` instead of a separate plan stage or a harness-native plan mode.

### 1. Understand — facts without decisions

```text
+-------------------------+
|  QUESTION ABOUT FACTS   |
+------------+------------+
             |
             v
+-------------------------+
|        research         |
| facts / evidence / gaps |
+------------+------------+
             |
             v
+-------------------------+
|      FINDINGS ONLY      |
+-------------------------+
```

[`research`](skills/research/SKILL.md) explains what exists without selecting a solution or changing files.

### 2. Explore — compare possible directions

```text
+-------------------------+
|   OPEN SOLUTION SPACE   |
+------------+------------+
             |
             v
+-------------------------+
|        innovate         |
| 1-3 distinct directions |
+------------+------------+
             |
             v
+-------------------------+
| OPTIONS, NOT DECISIONS  |
+-------------------------+
```

[`innovate`](skills/innovate/SKILL.md) compares value, cost, and risk when alternatives are useful.

### 3. Decide and specify — settle what should change, then map it

```text
+-------------------------+
|    CHANGE TO SPECIFY    |
+------------+------------+
             |
             v
+-------------------------+
|          spec           |
| settle decisions when   |
| needed; then files /    |
| contracts / phases /    |
| verification            |
+------------+------------+
             |
             v
+-------------------------+
|  spec_<work-name>.md    |
+-------------------------+
```

[`spec`](skills/spec/SKILL.md) settles goal, requirements, acceptance, scope, approach, and constraints when they are open, then produces an executable engineering contract. Research and innovation may inform it; the user may settle choices before or during `spec`.

Typical paths:

```text
research? -> innovate? -> [user/spec settles decisions] -> spec? -> implement
user info (settled) -> implement          # narrow
user info (settled) -> spec -> implement  # non-trivial
```

### 4. Build — execute and prove the change

```text
+------------------+
| APPROVED SPEC    | -------+
+------------------+        |
                            +----> +-----------+    +----------+
+------------------+        |      | implement | -> | validate |
| NARROW, SETTLED  | -------+      +-----------+    +----------+
| DIRECT REQUEST   |
+------------------+
```

[`implement`](skills/implement/SKILL.md) executes an approved spec phase, or a narrow decision-complete request directly. Unresolved product or architectural decisions route to `spec`.

### 5. Deliver — orchestrate non-trivial work

```text
+-------------------------+
|   NON-TRIVIAL CHANGE    |
+------------+------------+
             |
             v
+-------------------------+
|         develop         |
| routing / delegation /  |
| integration             |
+------------+------------+
             |
             v
+-----------------------------------------+
| research? -> innovate? -> spec?         |
|          only when useful               |
+--------------------+--------------------+
                     |
                     v
     [ implement ] -> [ validate ]
```

[`develop`](skills/develop/SKILL.md) chooses only the necessary stages, coordinates their agents, and integrates validation. After a decision-complete spec, it summarizes briefly and continues; it does not wait for a separate approve/implement signal unless a material choice remains open.

Specs are saved in `.ai/worklog/<yyyyMMdd>_<work-name>/`. Persisted research is optional evidence: it can inform a spec, but it does not replace unresolved decisions.

## Layout

1. `skills/` contains the harness-agnostic Agent Skills contracts.
2. `agents/` contains shared Claude Code and Cursor agent entrypoints.
3. `.codex-plugin/`, `.claude-plugin/`, and `.cursor-plugin/` contain harness adapters.
4. `docs/harness-compatibility.md` records capability differences and limitations.

## Install locally in Codex

From this repository's root, register its local marketplace and install Buddy:

```bash
codex plugin marketplace add .
codex plugin add buddy@buddy
```

The commands make Buddy available to Codex. In the ChatGPT desktop app, open the shared **Plugin Directory** (Settings > Plugins or **Plugins** in the sidebar), find **buddy** in the `buddy` marketplace, and select **Install** or **Connect** when offered. The directory is shared across ChatGPT Work and ChatGPT Codex.

The current CLI has no separate trust or enable command: `codex plugin add buddy@buddy` is its installation step. It does not replace installation or connection in the ChatGPT Plugin Directory.

## Validation

Run from the repository root after every change:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Validate source integration before registering or installing any local marketplace.
