<p align="center">
  <img src="assets/buddy.svg" width="144" alt="Blueprint Buddy">
</p>

# Buddy

> Plan the work. Control the context. Ship with proof.

Buddy is the workflow that carries AI-assisted work from an initial idea to a verified delivery. It turns exploration into research, decisions into specs, and implementation into inspectable evidence.

Plan mode is a pause before coding. Buddy is the workflow around coding.

## Why Buddy?

- **More than a plan** — plan modes start the thinking; Buddy preserves research, a decision log, and the implementation contract—so you can see both why the work changed and where it stands.
- **Documentation you own** — research and specs are persisted in `.ai/worklog/`, so decisions stay inspectable and editable.
- **Focused context** — each stage and implementation phase receives only the contract and evidence it needs.
- **Portable workflow** — shared skills work across supported tooling, locally or in cloud checkouts where the plugin and committed project files are available.
- **Safer boundaries** — explicit scope, bounded workers, and verification reduce accidental overreach; Buddy is a workflow guardrail, not a security boundary.

## Skills

| Skill | Use it to |
|---|---|
| [`develop`](skills/develop/SKILL.md) | Coordinate a non-trivial change end to end. |
| [`research`](skills/research/SKILL.md) | Investigate facts without changing code. |
| [`innovate`](skills/innovate/SKILL.md) | Compare viable solution directions. |
| [`spec`](skills/spec/SKILL.md) | Turn decisions into an implementation contract. |
| [`implement`](skills/implement/SKILL.md) | Build an approved, bounded change. |
| [`test-runner`](skills/test-runner/SKILL.md) | Find and run the relevant validation. |
| [`configure-models`](skills/configure-models/SKILL.md) | Set Buddy's fast, balanced, and frontier models. |
| [`model-policy`](skills/model-policy/SKILL.md) | Resolve the active model configuration. |
| [`archive-worklogs`](skills/archive-worklogs/SKILL.md) | Archive completed worklogs. |

Typical flow: research → innovate → spec → implement → verify. Select optional stages only when they help; `develop` coordinates the full flow.

## Install

<details open>
<summary><strong>Codex CLI</strong> — GitHub marketplace</summary>

Add Buddy's GitHub repository as a marketplace, then install the plugin:

```bash
codex plugin marketplace add leszekgruchala/buddy --ref main
codex plugin add buddy@buddy
```

Restart Codex and start a new task so it loads the installed skills. The marketplace command only needs to run once; refresh its Git snapshot with `codex plugin marketplace upgrade buddy` when you want a newer release.

</details>

<details>
<summary><strong>ChatGPT desktop app</strong> — Plugin Directory</summary>

Open the Plugin Directory, find **Buddy**, then select **Install** or **Connect**. This is a separate distribution channel from the Codex CLI: installing from GitHub in the CLI does not install Buddy in the desktop app. If Buddy is not listed in your directory, use the Codex CLI path above.

</details>

<details>
<summary><strong>Claude Code</strong> — GitHub marketplace</summary>

Add the marketplace and install Buddy from an interactive Claude Code session or your terminal:

```bash
claude plugin marketplace add leszekgruchala/buddy@main
claude plugin install buddy@buddy
```

Restart Claude Code, or run `/reload-plugins`, before starting work with Buddy.

</details>

<details>
<summary><strong>Cursor</strong> — Marketplace or local folder</summary>

**Marketplace (recommended once published):** Open the [Cursor Marketplace](https://cursor.com/marketplace), find **Buddy**, and install it with one click. Cursor then registers the plugin's skills and agents without manual configuration.

**Until then, use the local-folder path:**

Cursor requires local plugins to live inside `~/.cursor/plugins/local/`. Symlinks that point outside that directory are rejected and the plugin will not load.

**macOS / Linux:**

```bash
git clone https://github.com/leszekgruchala/buddy.git
mkdir -p ~/.cursor/plugins/local
rsync -a --delete --exclude .git . ~/.cursor/plugins/local/buddy/
```

To refresh after pulling changes in an existing checkout:

```bash
rsync -a --delete --exclude .git . ~/.cursor/plugins/local/buddy/
```

**Windows (PowerShell):** Copy the repository instead; Cursor does not load symlinks or junctions:

```powershell
git clone https://github.com/leszekgruchala/buddy.git
robocopy buddy "$env:USERPROFILE\.cursor\plugins\local\buddy" /MIR /XD .git .ai
```

Reload the Cursor window (**Developer: Reload Window**). Buddy appears in **Customize** in the sidebar with its skills and agents. To update it, pull the clone and rerun the same copy command.

</details>

See [harness compatibility](docs/harness-compatibility.md#refresh-local-development-installs) for local-development refresh details.

## Setup

After installing Buddy, configure its models before starting a workflow. Ask the agent: **“Configure the models Buddy should use here.”** You can also invoke the **Configure Models** Buddy skill explicitly.

Buddy stores complete harness-specific choices in `.buddy/model-profile.yaml` (project) or `~/.buddy/model-profile.yaml` (user); the project profile takes precedence over the user profile. See [`configure-models`](skills/configure-models/SKILL.md) and the [model profile contract](skills/model-policy/reference.md).

A committed project profile travels to cloud agents when it is included in their checkout; the local user profile is a fallback across local projects and does not travel automatically. Invalid or unavailable configured values safely inherit the current orchestrator model rather than being silently substituted.
