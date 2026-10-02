# Report Data

Use a JSON object as the renderer input. All prose is plain text, not Markdown or HTML. The renderer escapes text and creates the diagrams from node and edge data.

```json
{
  "title": "Refresh one package after publish",
  "purpose": "CI can request a package refresh in a specific environment after publish.",
  "source": {
    "label": "PR 123 · merge base abc123 · candidate code, not deployment status",
    "base": "abc123",
    "head": "def456"
  },
  "changes": [
    {
      "feature": "Refresh request",
      "before": "CI has no machine-auth notify route.",
      "after": "An SDK command calls a package-scoped notify route.",
      "impact": "Release jobs can request a refresh for the published package without a manual notify call; jobs must pass the target environment and a valid caller token.",
      "evidence": ["def456:src/server/notify.ts:24", "abc123:src/server/app.ts:80"],
      "attention": [
        {
          "kind": "human-review",
          "reason": "The new machine-auth route adds a caller trust boundary.",
          "action": "Review token audience and caller checks; unauthorized requests must never trigger a refresh.",
          "evidence": ["def456:src/server/notify.ts:24"]
        }
      ]
    }
  ],
  "validation": [
    {"check": "Route unit tests", "result": "not-run", "detail": "Dependencies are unavailable."}
  ],
  "warnings": ["Example data only; verify these claims against the target code."],
  "components": [
    {
      "id": "notify",
      "purpose": "Accept a verified CI request to refresh one package.",
      "before": "CI has no machine-auth notify route.",
      "after": "Verified callers can request a refresh for the supplied package.",
      "evidence": ["def456:src/server/notify.ts:24"],
      "features": ["Refresh request"]
    }
  ],
  "diagrams": {
    "before": {
      "nodes": [
        {"id": "publish", "label": "Publish package", "column": 0, "row": 0, "state": "unchanged"}
      ],
      "edges": []
    },
    "after": {
      "nodes": [
        {"id": "publish", "label": "Publish package", "column": 0, "row": 0, "state": "unchanged"},
        {"id": "notify", "label": "Notify route", "type": "API", "role": "Machine-auth refresh", "column": 1, "row": 0, "state": "added"}
      ],
      "edges": [{"from": "publish", "to": "notify", "label": "Request refresh", "detail": "HTTPS request with a bearer ID token and one package name.", "state": "added"}]
    }
  }
}
```

1. `title`, `purpose`, and `source` are required. `source.label`, `source.base`, and `source.head` are text. Use full commit IDs for Git revisions and add the PR URL or working-tree snapshot description to `label` when applicable. Explicitly supplied file snapshots must use honest snapshot labels and content fingerprints instead of invented commit IDs.
2. `changes` is a nonempty list of grouped features. Each row requires `feature`, `before`, `after`, `impact`, and `evidence`; `evidence` is a list of short revision/path/line citations. For deletions, cite the old revision. Impact explains the practical consequence for affected people or callers, including meaningful conditions and required actions. Mention architecture only when material. Maintenance, documentation, and test-only changes can have a developer benefit with no runtime behavior change. Put unknown behavior explicitly in the corresponding cell. Cite each change; an empty evidence list remains valid for older inputs but adds a warning naming that feature's missing source evidence.
3. `validation` and `warnings` are lists, which may be empty. Validation entries require `check`, `result`, and `detail`. The result is exactly `passed`, `failed`, or `not-run`. An empty validation list displays that no executable checks were recorded. Warnings are short sentences shown below the header, before the comparison; evidence is collapsed separately. The desktop comparison table becomes labeled stacked fields on narrow screens, keeping After, Impact, and review actions visible without horizontal scrolling.
4. Omit `diagrams` and `components` entirely for a small report. When diagrams are present, both `before` and `after` require `nodes` and `edges`. Use one to eight nodes per panel. Node IDs and grid positions must be unique within each panel. `column` and `row` are nonnegative integers; keep a compact grid. Node labels must fit five wrapped lines of 23 characters. Match IDs and positions across panels for unchanged components. Nodes may include plain-text `type` and `role`; cards shorten long metadata while the inspector retains it in full. Status text is rendered automatically, so names need no New/Changed prefix.
5. Each edge requires distinct `from` and `to` IDs present in that panel; `label` and `detail` are optional plain text. Show a repeated step as a separate node instead of a self-edge. Keep arrow labels to at most three wrapped lines of 14 characters. Use `detail` for a longer explanation of the connection in the inspector. Nodes require `state`; edges default to `unchanged`. Allowed states are `unchanged`, `added`, `changed`, and `removed`. Branches can use different rows. Draw only connections supported by the respective code revision.
6. A change may include an `attention` list. Omit it or use an empty list when no marker applies. Each marker requires `kind`, `reason`, `action`, and a nonempty `evidence` list. Use `high-risk`, `breaking`, or `human-review`. Human review covers both code review and hands-on checks; the action explains what to check. Markers appear on the feature; concise reasons and actions appear in its impact cell. Evidence joins the collapsed references. These are supported concerns or recommendations, not claims that review has occurred. Existing inputs without this optional field remain valid; older `human-qa` markers also render as Human review.
7. `components` is an optional list used only with diagrams. Each entry requires `id`, `purpose`, `before`, `after`, and `evidence` (a list of citations). IDs must be unique and must identify a node in at least one diagram. Optional `features` lists exact `changes[].feature` names; their existing attention markers and actions appear in the inspector. Unknown component or feature references are rejected. Components without details still work and show that responsibilities were not recorded; an omitted node alone does not prove the component is absent from the system.
8. Architecture uses Before/After tabs with After selected initially and an optional Execution flow tab. Flow derives from diagram edges; no additional input field is needed. Groups appear in Added, Changed, Removed, Unchanged order, showing retained context once. Short edge `detail` statements explain who calls whom and what action or data passes, using `label` when no detail is available. Aim for 3–5 main connections. It does not repeat component purpose, feature benefits, or review notes. The tab is omitted for identical connections with no detail, or diagrams without connections. Connection membership and label/detail differences determine the groups; parallel connections remain distinct. A list of connections does not imply a total execution order. Select a card in Before/After to inspect its purpose, responsibilities, and current-view incoming/outgoing connections. Click or Enter/Space selects a component. Visiting Execution flow preserves the current selection; switching versions retains it when the component exists in both views, otherwise a visible changed component or the first component is selected. The inspector sits beside the diagram on desktop and below it on narrow screens. The report includes a fixed local interaction script and works offline. No input field accepts executable HTML, SVG, or JavaScript.

Run `python3 <skill-dir>/scripts/render_report.py <input.json> <output.html>`. Paths are relative to the invoking shell, not the skill. Use `--help` for options. The renderer refuses an existing output unless `--overwrite` is given.
