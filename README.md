# Buddy AI Dev Support

Reusable coding workflows packaged for Codex, Claude Code, and Cursor.

## Workflows

Use the smallest stage that matches the request. Buddy routes change planning through `plan` instead of a harness-native plan mode.

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

### 3. Decide — settle what should change

```text
+-------------------------+
|    UNSETTLED CHANGE     |
+------------+------------+
             |
             v
+-------------------------+
|          plan           |
| scope / approach /      |
| constraints / criteria  |
+------------+------------+
             |
             v
+-------------------------+
|  plan_<work-name>.md    |
+-------------------------+
```

[`plan`](skills/plan/SKILL.md) gathers only the context needed to make the change decision-complete. Research and innovation may inform it, but remain optional.

### 4. Specify — map decisions to executable work

```text
                          no
+---------------------+ ------> +----------+
| DECISIONS COMPLETE? |         |   plan   |
+----------+----------+ <------ +----------+
           | yes
           v
+-------------------------+
|          spec           |
| files / contracts /     |
| phases / verification   |
+------------+------------+
             |
             v
+-------------------------+
|  spec_<work-name>.md    |
+-------------------------+
```

[`spec`](skills/spec/SKILL.md) accepts a plan or any other decision-complete input. Missing material decisions route back to `plan`.

### 5. Build — execute and prove the change

```text
+------------------+
|  APPROVED SPEC   | -------+
+------------------+        |
                            +----> +-----------+    +----------+
+------------------+        |      | implement | -> | validate |
| NARROW, SETTLED  | -------+      +-----------+    +----------+
| DIRECT REQUEST   |
+------------------+
```

[`implement`](skills/implement/SKILL.md) executes an approved spec phase, or a narrow decision-complete request directly.

### 6. Deliver — orchestrate non-trivial work

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
| research? -> innovate? -> plan?         |
|          only when useful               |
+--------------------+--------------------+
                     |
                     v
     [ spec ] -> [ implement ] -> [ validate ]
```

[`develop`](skills/develop/SKILL.md) chooses only the necessary stages, coordinates their agents, and integrates validation. After a decision-complete plan or spec, it summarizes briefly and continues; it does not wait for a separate approve/implement signal unless a material choice remains open.

Plans and specs are saved in `.ai/worklog/<yyyyMMdd>_<work-name>/`. Persisted research is optional evidence: it can inform a plan or spec, but it does not replace unresolved decisions.

## Layout

1. `skills/` contains the harness-agnostic Agent Skills contracts.
2. `agents/` contains shared Claude Code and Cursor agent entrypoints.
3. `.codex-plugin/`, `.claude-plugin/`, and `.cursor-plugin/` contain harness adapters.
4. `docs/harness-compatibility.md` records capability differences and limitations.

## Validation

Run from the repository root after every change:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Validate source integration before registering or installing any local marketplace.
