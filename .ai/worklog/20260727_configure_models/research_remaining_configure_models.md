# Remaining configurable-model work

## QUESTION

What work remains before the configurable model-policy change can be committed as implementing the newer project, user, and packaged-default behavior, and what local plugin refresh guidance is currently documented for Codex and Cursor?

## FINDINGS

### Current working-tree state

The original user-home-only implementation exists in:

- `skills/configure-models/SKILL.md`
- `skills/model-policy/SKILL.md`
- `skills/model-policy/reference.md`
- `README.md`
- `docs/harness-compatibility.md`

Its original specification, `.ai/worklog/20260727_configure_models/spec_configure_models.md`, requires only `~/.buddy/model-profile.yaml` and marks all three implementation and validation phases complete. The newer storage decision was made after those phases completed.

`git diff --check` and the repository-wide validator currently pass:

```text
Validation passed: Agent Skills, Codex, Claude Code, and Cursor
```

This proves the current files satisfy checked-in structural and cross-harness validation. It does not prove the newer project/user precedence because that behavior is not implemented yet.

### Agreed storage and resolution behavior

The newer contract is:

1. Project profile: `.buddy/model-profile.yaml`.
2. User profile: `~/.buddy/model-profile.yaml`.
3. Packaged defaults maintained in `model-policy`.

Resolution applies to the current harness section rather than to whole-file existence. A project profile that contains `codex` but not `cursor` does not hide a user-level `cursor` section.

A missing higher-priority current-harness section falls through to the next source. The compatibility document currently states that a present but malformed or unavailable higher-priority section is reported and inherits safely rather than silently selecting a lower-priority concrete model.

When neither profile contains the current harness, Buddy uses the packaged defaults. This is valid operation, not an error. At the relevant top-level workflow, Buddy reports that defaults are in use and recommends `configure-models` without blocking work or repeating the notice for every subagent dispatch.

During configuration, the skill asks whether the profile should be stored:

- in the project, where it is cloud-accessible only when committed and included in the cloud checkout; or
- in the user directory, where it is reusable across local projects but is not automatically available to cloud agents.

An explicit current-task model instruction remains transient unless the user asks to persist it.

### Behavior not implemented yet

`skills/configure-models/SKILL.md` currently:

- defines only the user-owned `~/.buddy/model-profile.yaml`;
- reads and writes only that path;
- does not ask the user to choose project or user scope;
- asks for approval specifically before creating `~/.buddy/`;
- reports one profile path rather than the selected scope and effective source.

`skills/model-policy/SKILL.md` currently:

- checks only `~/.buddy/model-profile.yaml`;
- resolves only explicit task override, user profile, packaged default, then inheritance;
- does not inspect `.buddy/model-profile.yaml`;
- does not implement per-harness project-to-user fallthrough;
- does not define the agreed non-blocking no-profile notice.

`skills/model-policy/reference.md` currently:

- defines only one optional user-owned profile;
- has no project profile path or two-source precedence contract;
- defines replacement semantics for one current-harness section but not merging resolution across project and user sources.

`README.md` currently:

- documents only the user-owned profile;
- states that configuration writes only to `~/.buddy/model-profile.yaml`;
- states that profiles are local-only;
- does not describe project scope, precedence, or the no-profile default notice.

`docs/harness-compatibility.md` records the newer behavior under **Proposed storage contract** and explicitly says the skills still support only the user-scoped profile. Its capability-matrix row says “Project or user scope,” while the detailed text distinguishes proposed capability from current implementation.

The existing worklog specification and its completed TODOs do not yet represent the newer contract. Further implementation work therefore needs an amended contract or an additional decision-complete phase before the existing worklog can describe the final delivered behavior accurately.

### Remaining behavioral validation cases

The newer contract has not yet been validated against these cases:

- project current-harness section exists and wins over the user section;
- project file exists but lacks the current harness, so the user section applies;
- project and user files both lack the current harness, so packaged defaults apply;
- neither profile exists, so packaged defaults apply and configuration is recommended non-blockingly;
- a higher-priority current-harness section is malformed, incomplete, or unavailable;
- configuration writes to the user-selected scope only;
- configuration preserves unrelated harness sections in the selected file;
- a project profile is described as cloud-accessible only when committed and checked out;
- user-scope writes still require approval when outside the harness workspace;
- the top-level default-profile notice is not repeated for each worker dispatch.

The current validator checks Agent Skills, shared agents, manifests, marketplaces, links, trailing newlines, and harness definitions. No current validator assertion covers the semantic profile-resolution cases above.

### Existing local update documentation

`README.md` documents initial Codex local installation:

```bash
codex plugin marketplace add .
codex plugin add buddy@buddy
```

It does not document how to refresh an already installed local Buddy plugin after changing the checkout.

`docs/harness-compatibility.md` says that Cursor local development uses a copy or symlink under `~/.cursor/plugins/local/buddy`, followed by a Cursor window reload. It does not provide a complete update procedure or distinguish copied and symlinked installations.

There is no dedicated local-development or local-plugin-update document.

### Verified current Codex refresh facts

Installed CLI help exposes:

- `codex plugin add`, `list`, and `remove`;
- `codex plugin marketplace add`, `list`, `upgrade`, and `remove`;
- no `codex plugin update` command.

`codex plugin marketplace upgrade` explicitly refreshes configured **Git** marketplace snapshots. It is not documented by installed help as an update command for a local marketplace.

On this machine, `codex plugin marketplace list --json` reports Buddy's marketplace source and root as the current repository:

```text
/Users/lgr/projects/pirum/buddy
```

`codex plugin list --json` also reports the installed `buddy@buddy` source as that local repository path. The current official Codex manual tells plugin authors to refresh ChatGPT or Codex and install from the local marketplace when testing. A running task has already loaded its skill snapshot, so a new task or application refresh is required to observe changed skill instructions.

### Verified current Cursor refresh facts

Installed `cursor-agent --help` supports:

```text
--plugin-dir <path>  Load a local plugin directory
```

A new Cursor Agent invocation using `--plugin-dir /Users/lgr/projects/pirum/buddy` reads the local plugin directory for that invocation.

For Cursor desktop:

- a symlink under `~/.cursor/plugins/local/buddy` continues to point at the checkout, and Cursor must reload the window to reload plugin content;
- a copied plugin directory does not receive checkout changes automatically and must be copied again before the window reload.

## UNKNOWNS

- The exact Codex desktop behavior for refreshing a same-version local plugin cache after checkout changes has not been verified through a state-mutating reinstall test. Installed CLI help has no dedicated plugin-update command.
- The final documentation location for complete local refresh instructions has not been selected. The current information is split between `README.md` and `docs/harness-compatibility.md`.
- The worklog does not yet contain an amended implementation phase or acceptance decision for the newer storage contract.
