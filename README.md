# Buddy AI Dev Support

Reusable coding buddy assets packaged as a Codex plugin.

## Layout

1. `skills/` contains the Codex skills.
2. `.codex-plugin/plugin.json` packages the root assets for Codex.
3. `.agents/plugins/marketplace.json` registers the local Codex marketplace.

## Local Registration

Run commands from this repository root unless noted otherwise.

1. Codex local marketplace:
   ```bash
   codex plugin marketplace add .
   ```
   Then install `buddy` from the `buddy` marketplace in the Codex app.

2. Codex marketplace listing check:
   ```bash
   codex plugin list --available --json
   ```

## Validation

1. Codex marketplace ingestion:
   ```bash
   codex plugin marketplace add .
   codex plugin list --available --json
   ```
