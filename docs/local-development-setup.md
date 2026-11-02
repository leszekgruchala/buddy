# Local Development Setup

Use this guide to run Buddy from your local checkout in Codex, Claude Code, and Cursor, and to go back to the GitHub marketplace later. Run every command from the repository root, on the branch you want to test.

Use one source at a time in each harness. Remove the GitHub marketplace before you add the local one, and the reverse. No harness watches the folder: after you change files or switch branch, run the **Update** commands again.

## Claude Code

For one session, load the checkout directly. This needs no install and no cache, and it reads the live folder:

```bash
claude --plugin-dir "$(pwd)"
```

**Install** from the folder (persistent):

```bash
claude plugin uninstall buddy@buddy --keep-data
claude plugin marketplace remove buddy
claude plugin marketplace add "$(pwd)"
claude plugin install buddy@buddy
```

**Update.** The install is a snapshot of the working tree, uncommitted files included. `claude plugin update` does not refresh it, so install again:

```bash
claude plugin uninstall buddy@buddy --keep-data && claude plugin install buddy@buddy
```

Run `/reload-plugins` in an open session, or start a new one.

**Remove and return to GitHub:**

```bash
claude plugin uninstall buddy@buddy --keep-data
claude plugin marketplace remove buddy
claude plugin marketplace add leszekgruchala/buddy@main
claude plugin install buddy@buddy
```

## Codex

The marketplace file in this repository points the plugin to GitHub, so `codex plugin marketplace add "$(pwd)"` installs the GitHub `main` copy, not your files. Use a separate local marketplace in `~/.codex/buddy-local`. It has a copy of the checkout and a `"source": "local"` entry. Codex resolves the `path` from the marketplace root.

**Install:**

```bash
codex plugin remove buddy@buddy
codex plugin marketplace remove buddy
mkdir -p ~/.codex/buddy-local/.agents/plugins ~/.codex/buddy-local/buddy
cat > ~/.codex/buddy-local/.agents/plugins/marketplace.json <<'EOF'
{
  "name": "buddy-local",
  "interface": { "displayName": "buddy (local)" },
  "plugins": [
    {
      "name": "buddy",
      "source": { "source": "local", "path": "./buddy" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
EOF
rsync -a --delete --delete-excluded --exclude .git --exclude .ai --exclude .idea --exclude .DS_Store --filter=":- .gitignore" ./ ~/.codex/buddy-local/buddy/
codex plugin marketplace add ~/.codex/buddy-local
codex plugin add buddy@buddy-local
```

Start a new session. Review and trust Buddy's hooks with `/hooks`. Do this again after every update.

**Update.** Copy the files again and install the plugin again:

```bash
rsync -a --delete --delete-excluded --exclude .git --exclude .ai --exclude .idea --exclude .DS_Store --filter=":- .gitignore" ./ ~/.codex/buddy-local/buddy/
codex plugin remove buddy@buddy-local && codex plugin add buddy@buddy-local
```

Check that `codex plugin list` shows the expected version, and trust the hooks again.

**Remove and return to GitHub:**

```bash
codex plugin remove buddy@buddy-local
codex plugin marketplace remove buddy-local
rm -rf ~/.codex/buddy-local
codex plugin marketplace add leszekgruchala/buddy --ref main
codex plugin add buddy@buddy
```

## Cursor

Cursor loads development plugins from a real folder under `~/.cursor/plugins/local`. A symlink to the checkout is skipped. The copy must leave out git-ignored files such as `ai/`, which can hold gigabytes and make Cursor hang.

For one CLI session, load the checkout directly:

```bash
cursor-agent --plugin-dir "$(pwd)"
```

**Install** in the desktop app:

```bash
cursor agent plugin marketplace remove buddy
mkdir -p ~/.cursor/plugins/local/buddy
rsync -a --delete --delete-excluded --exclude .git --exclude .ai --exclude .idea --exclude .DS_Store --filter=":- .gitignore" ./ ~/.cursor/plugins/local/buddy/
```

Run **Developer: Reload Window**, then open a new agent chat. If the `remove` command reports that no marketplace exists, continue with the next command.

**Update.** Copy the files again, reload the window, and start a new chat. An existing chat can keep its old snapshot.

```bash
rsync -a --delete --delete-excluded --exclude .git --exclude .ai --exclude .idea --exclude .DS_Store --filter=":- .gitignore" ./ ~/.cursor/plugins/local/buddy/
```

**Remove and return to GitHub:**

```bash
rm -rf ~/.cursor/plugins/local/buddy
cursor agent plugin marketplace add https://github.com/leszekgruchala/buddy
```

Run **Developer: Reload Window**. Open **Customize → Browser Marketplace**, find Buddy in the registered marketplace, and select **Add**.

## Check the result

Start a fresh session in each harness and confirm that the Buddy version and hooks match your checkout. For the hook checks, see [Local harness validation](local-harness-validation.md).
