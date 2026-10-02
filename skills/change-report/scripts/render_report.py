#!/usr/bin/env python3
"""Create a fixed HTML change report from validated JSON data."""

import argparse
import html
import json
from pathlib import Path
from string import Template
import sys
import textwrap


STATES = {"unchanged", "added", "changed", "removed"}
COLORS = {"added": "#067d75", "changed": "#a6630c", "removed": "#b4434a",
          "unchanged": "#8797a6"}
STATE_LABELS = {"added": "New", "changed": "Changed", "removed": "Removed",
                "unchanged": "Unchanged"}
ATTENTION = {"high-risk": "High risk", "breaking": "Breaking change",
             "human-review": "Human review"}


def _object(value, required, optional=()):
    """Check object fields and reject unknown fields."""
    if not isinstance(value, dict):
        raise ValueError("Expected an object")
    missing = set(required) - value.keys()
    extra = value.keys() - set(required) - set(optional)
    if missing or extra:
        raise ValueError(f"Invalid fields: missing {sorted(missing)}, unknown {sorted(extra)}")


def _text(value):
    """Check a nonempty text value and escape it for HTML or SVG."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Expected nonempty text")
    return html.escape(value, quote=True)


def _list(value):
    """Check a list value."""
    if not isinstance(value, list):
        raise ValueError("Expected a list")
    return value


def _diagram(graph):
    """Check diagram nodes, positions, states, and edge references."""
    _object(graph, ("nodes", "edges"))
    nodes, edges = _list(graph["nodes"]), _list(graph["edges"])
    if not 1 <= len(nodes) <= 8:
        raise ValueError("Each diagram must have 1 to 8 nodes")
    ids, positions = set(), set()
    for node in nodes:
        _object(node, ("id", "label", "column", "row", "state"), ("type", "role"))
        _text(node["id"])
        _text(node["label"])
        for field in ("type", "role"):
            if field in node:
                _text(node[field])
        if any(type(node[k]) is not int or node[k] < 0 for k in ("column", "row")):
            raise ValueError("Node row and column must be nonnegative integers")
        position = (node["column"], node["row"])
        if node["id"] in ids or position in positions:
            raise ValueError("Node IDs and positions must be unique within a diagram")
        if node["state"] not in STATES:
            raise ValueError("Invalid node state")
        ids.add(node["id"])
        positions.add(position)
    for edge in edges:
        _object(edge, ("from", "to"), ("label", "state", "detail"))
        _text(edge["from"])
        _text(edge["to"])
        if edge["from"] not in ids or edge["to"] not in ids:
            raise ValueError("Edge references an unknown node")
        if edge["from"] == edge["to"]:
            raise ValueError("Self edges are not supported; show the repeated step as a separate node")
        if edge.get("state", "unchanged") not in STATES:
            raise ValueError("Invalid edge state")
        if "label" in edge:
            _text(edge["label"])
            if len(textwrap.wrap(edge["label"], width=14)) > 3:
                raise ValueError("Edge labels must fit in three lines of 14 characters")
        if "detail" in edge:
            _text(edge["detail"])


def _svg(graph, panel, columns, rows):
    """Draw fixed nodes and arrows from checked graph data."""
    coords = {n["id"]: (40 + columns.index(n["column"]) * 230,
                         70 + rows.index(n["row"]) * 200) for n in graph["nodes"]}
    width, height = len(columns) * 230 + 30, len(rows) * 200 + 40
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" style="min-width:{width}px;max-width:{width}px" role="group" aria-labelledby="{panel}-title"><title id="{panel}-title">Architecture {panel}</title><defs>']
    for state in sorted(STATES):
        color = COLORS[state]
        parts.append(f'<marker id="{panel}-{state}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="{color}"/></marker>')
    parts.append("</defs>")
    for edge in graph["edges"]:
        x1, y1 = coords[edge["from"]]
        x2, y2 = coords[edge["to"]]
        target_side = x2 if x1 < x2 else x2 + 180
        target_lane = target_side - 20 if x1 < x2 else target_side + 20
        start, corridor = x1 + 90, y1 - 30
        path = f"M {start} {y1} L {start} {corridor} L {target_lane} {corridor} L {target_lane} {y2+64} L {target_side} {y2+64}"
        label_x = (start + target_lane) / 2
        if x1 == x2 and not any(
            x == x1 and min(y1, y2) < y < max(y1, y2)
            for x, y in coords.values()
        ):
            start_y, end_y = (y1 + 128, y2) if y1 < y2 else (y1, y2 + 128)
            path = f"M {start} {start_y} L {start} {end_y}"
            label_x, corridor = start - 75, (start_y + end_y) / 2
        state = edge.get("state", "unchanged")
        parts.append(f'<path class="edge {state}" d="{path}" marker-end="url(#{panel}-{state})"/>')
        if "label" in edge:
            lines = textwrap.wrap(edge["label"], width=14)
            parts.append(f'<text class="edge-label" x="{label_x}" y="{corridor-8-(len(lines)-1)*7}" text-anchor="middle">')
            parts.extend(f'<tspan x="{label_x}" dy="{0 if i == 0 else 14}">{_text(line)}</tspan>' for i, line in enumerate(lines))
            parts.append("</text>")
    for node in graph["nodes"]:
        x, y = coords[node["id"]]
        lines = textwrap.wrap(node["label"], width=23)
        if len(lines) > 5:
            raise ValueError("Node labels must fit in five lines of 23 characters")
        metadata = " · ".join(node[field] for field in ("type", "role") if field in node) or "Not recorded"
        short_metadata = metadata if len(metadata) <= 27 else metadata[:26] + "…"
        parts.append(f'<g class="node {node["state"]}" role="button" tabindex="0" aria-pressed="false" data-component="{_text(node["id"])}" data-name="{_text(node["label"])}" aria-label="Select {_text(node["label"])}"><title>{_text(node["label"])} · {_text(metadata)}</title><rect x="{x}" y="{y}" width="180" height="128" rx="10"/><text class="node-meta" x="{x+90}" y="{y+17}" text-anchor="middle">{_text(short_metadata)}</text><text class="node-label" x="{x+90}" y="{y+66-(len(lines)-1)*8}" text-anchor="middle">')
        parts.extend(f'<tspan x="{x+90}" dy="{0 if i == 0 else 16}">{_text(line)}</tspan>' for i, line in enumerate(lines))
        parts.append(f'</text><text class="node-state" x="{x+90}" y="{y+115}" text-anchor="middle">{STATE_LABELS[node["state"]]}</text></g>')
    return "".join(parts) + "</svg>"


def _components(items, graphs, changes):
    """Check inspector descriptions against graph nodes and feature names."""
    node_ids = {node["id"] for graph in graphs.values() for node in graph["nodes"]}
    feature_names = {change["feature"] for change in changes}
    components = {}
    for component in _list(items):
        _object(component, ("id", "purpose", "before", "after", "evidence"), ("features",))
        for field in ("id", "purpose", "before", "after"):
            _text(component[field])
        if component["id"] in components:
            raise ValueError("Component IDs must be unique")
        if component["id"] not in node_ids:
            raise ValueError("Component references an unknown graph node")
        for ref in _list(component["evidence"]):
            _text(ref)
        for feature in _list(component.get("features", [])):
            _text(feature)
            if feature not in feature_names:
                raise ValueError("Component references an unknown feature")
        components[component["id"]] = component
    return components


def _component_details(graph, panel, components, attention):
    """Create escaped inspector templates for every node in one diagram."""
    nodes = {node["id"]: node for node in graph["nodes"]}
    templates = []
    for node in graph["nodes"]:
        component = components.get(node["id"], {})
        parts = [f'<template class="component-detail" data-view="{panel}" data-component="{_text(node["id"])}"><h3 class="component-name">{_text(node["label"])}</h3><span class="component-state {node["state"]}">{STATE_LABELS[node["state"]]}</span>',
                 f'<p class="component-meta">Type: {_text(node.get("type", "Not recorded"))} · Role: {_text(node.get("role", "Not recorded"))}</p>',
                 f'<p class="component-purpose">{_text(component.get("purpose", "Purpose not recorded."))}</p><dl class="component-behavior">']
        for view in ("before", "after"):
            parts.append(f'<dt>{view.capitalize()}</dt><dd>{_text(component.get(view, "Not recorded."))}</dd>')
        parts.append(f'</dl><h4>{panel.capitalize()} connections</h4>')
        for direction, endpoint, other in (("Incoming", "to", "from"), ("Outgoing", "from", "to")):
            edges = [edge for edge in graph["edges"] if edge[endpoint] == node["id"]]
            parts.append(f'<h5>{direction}</h5>')
            if not edges:
                parts.append(f'<p class="connection-empty">No {direction.lower()} connections shown in this diagram.</p>')
                continue
            parts.append('<ul class="component-connections">')
            for edge in edges:
                parts.append(f'<li><strong>{_text(nodes[edge[other]]["label"])}</strong>')
                for field in ("label", "detail"):
                    if field in edge:
                        parts.append(f'<span class="connection-{field}">{_text(edge[field])}</span>')
                parts.append('</li>')
            parts.append('</ul>')
        refs = list(component.get("evidence", []))
        notes = []
        for feature in component.get("features", []):
            feature_notes, feature_refs = attention.get(feature, ([], []))
            if feature_notes:
                notes.append(f'<h5>{_text(feature)}</h5><ul class="attention-notes">' + "".join(feature_notes) + '</ul>')
                refs.extend(feature_refs)
        if notes:
            parts.append('<div class="inspector-attention"><h4>Attention</h4>' + "".join(notes) + '</div>')
        if refs:
            parts.append(f'<details class="component-evidence"><summary>Evidence ({len(set(refs))})</summary><ul>')
            parts.extend(f'<li>{_text(ref)}</li>' for ref in dict.fromkeys(refs))
            parts.append('</ul></details>')
        else:
            parts.append('<p class="component-evidence-empty">Component evidence not recorded.</p>')
        templates.append("".join(parts) + '</template>')
    return "".join(templates)


def _execution_flow(graphs):
    """Compare recorded connections one-to-one and describe their flow."""
    unmatched_after = list(graphs["after"]["edges"])
    unmatched_before = []
    groups = {state: [] for state in ("added", "changed", "removed", "unchanged")}
    for before in graphs["before"]["edges"]:
        match = next((i for i, after in enumerate(unmatched_after)
                      if all(before.get(field) == after.get(field)
                             for field in ("from", "to", "label", "detail"))), None)
        if match is None:
            unmatched_before.append(before)
        else:
            groups["unchanged"].append((before, unmatched_after.pop(match)))
    for before in unmatched_before:
        match = next((i for i, after in enumerate(unmatched_after)
                      if before["from"] == after["from"] and before["to"] == after["to"]), None)
        if match is None:
            groups["removed"].append((before, None))
        else:
            groups["changed"].append((before, unmatched_after.pop(match)))
    groups["added"] = [(None, after) for after in unmatched_after]
    has_detail = any("detail" in edge for graph in graphs.values() for edge in graph["edges"])
    if not has_detail and not any(groups[state] for state in ("added", "changed", "removed")):
        return ""
    nodes = {panel: {node["id"]: node["label"] for node in graph["nodes"]}
             for panel, graph in graphs.items()}
    parts = ['<div class="architecture-flow" role="tabpanel" data-view="flow" id="architecture-panel-flow" aria-labelledby="architecture-tab-flow" hidden>']
    for state, connections in groups.items():
        if not connections:
            continue
        parts.append(f'<div class="flow-group"><h3>{state.capitalize()} connections</h3><ul class="flow-connections">')
        for before, after in connections:
            parts.append(f'<li class="flow-connection {state}">')
            views = (("before", before), ("after", after)) if state == "changed" else (("after", after),) if after else (("before", before),)
            for panel, edge in views:
                source, target = nodes[panel][edge["from"]], nodes[panel][edge["to"]]
                prefix = f'{panel.capitalize()}: ' if state == "changed" else ""
                description = edge.get("detail", edge.get("label", "Connection shown."))
                if state == "changed" and before.get("label") != after.get("label"):
                    description = edge.get("label", "Label not recorded.")
                    if "detail" in edge:
                        description += " · " + edge["detail"]
                parts.append(f'<span class="flow-description"><strong>{prefix}{_text(source)} → {_text(target)}:</strong> {_text(description)}</span>')
            parts.append('</li>')
        parts.append('</ul></div>')
    return "".join(parts) + '</div>'


def _render(data):
    """Check report data and insert escaped content into the fixed template."""
    _object(data, ("title", "purpose", "source", "changes", "validation", "warnings"), ("diagrams", "components"))
    if "components" in data and "diagrams" not in data:
        raise ValueError("Components require architecture diagrams")
    _object(data["source"], ("label", "base", "head"))
    source = data["source"]
    values = {"title": _text(data["title"]), "purpose": _text(data["purpose"]),
              "source": f'<strong>{_text(source["label"])}</strong> · {_text(source["base"])} → {_text(source["head"])}'}
    changes, evidence, attention, evidence_gaps = [], [], {}, []
    for change in _list(data["changes"]):
        _object(change, ("feature", "before", "after", "impact", "evidence"), ("attention",))
        badges, notes, attention_refs = [], [], []
        for marker in _list(change.get("attention", [])):
            _object(marker, ("kind", "reason", "action", "evidence"))
            kind = "human-review" if marker["kind"] == "human-qa" else marker["kind"]
            if kind not in ATTENTION:
                raise ValueError("Invalid attention kind")
            refs = _list(marker["evidence"])
            if not refs:
                raise ValueError("Attention markers require evidence")
            badge = f'<span class="attention-badge {kind}">{ATTENTION[kind]}</span>'
            if badge not in badges:
                badges.append(badge)
            notes.append(f'<li class="attention-note {kind}"><strong>{ATTENTION[kind]}</strong>: {_text(marker["reason"])}<span class="attention-action">{_text(marker["action"])}</span></li>')
            evidence.extend(f'<li><strong>{_text(change["feature"])} · {ATTENTION[kind]}</strong><span>{_text(ref)}</span></li>' for ref in refs)
            attention_refs.extend(refs)
        cells = [_text(change[k]) for k in ("feature", "before", "after", "impact")]
        if badges:
            cells[0] += '<div class="attention-badges">' + "".join(badges) + '</div>'
            cells[3] += '<ul class="attention-notes">' + "".join(notes) + '</ul>'
        changes.append('<tr role="row">' + "".join(
            f'<td role="cell"><span class="cell-label" aria-hidden="true">{label}</span>{cell}</td>'
            for label, cell in zip(("Feature", "Before", "After", "Impact"), cells)
        ) + "</tr>")
        feature_notes, feature_refs = attention.setdefault(change["feature"], ([], []))
        feature_notes.extend(notes)
        feature_refs.extend(attention_refs)
        refs = _list(change["evidence"])
        if not refs:
            evidence_gaps.append(f'{change["feature"]}: source evidence not recorded.')
        evidence.extend(f'<li><strong>{_text(change["feature"])}</strong><span>{_text(ref)}</span></li>' for ref in refs)
    if not changes:
        raise ValueError("The report must contain at least one change")
    checks = []
    for check in _list(data["validation"]):
        _object(check, ("check", "result", "detail"))
        result = check["result"]
        if result not in {"passed", "failed", "not-run"}:
            raise ValueError("Validation result must be passed, failed, or not-run")
        checks.append(f'<li><span class="badge {result}">{result.replace("-", " ")}</span><div><strong>{_text(check["check"])}</strong><span class="detail">{_text(check["detail"])}</span></div></li>')
    if not checks:
        checks.append('<li><span class="badge">Not run</span><div>No executable checks recorded.</div></li>')
    warnings = "".join(f"<p>{_text(w)}</p>" for w in _list(data["warnings"]) + evidence_gaps)
    architecture = ""
    if "diagrams" in data:
        graphs = data["diagrams"]
        _object(graphs, ("before", "after"))
        for graph in graphs.values():
            _diagram(graph)
        components = _components(data.get("components", []), graphs, data["changes"])
        columns = sorted({n["column"] for g in graphs.values() for n in g["nodes"]})
        rows = sorted({n["row"] for g in graphs.values() for n in g["nodes"]})
        flow = _execution_flow(graphs)
        views = ("flow", "before", "after") if flow else ("before", "after")
        tabs = "".join(f'<button type="button" role="tab" id="architecture-tab-{p}" aria-controls="architecture-panel-{p}" aria-selected="{"true" if p == "after" else "false"}" tabindex="{0 if p == "after" else -1}">{"Execution flow" if p == "flow" else p.capitalize()}</button>' for p in views)
        panels = "".join(f'<div class="diagram" role="tabpanel" data-view="{p}" id="architecture-panel-{p}" aria-labelledby="architecture-tab-{p}"{" hidden" if p == "before" else ""}><h3>{p.capitalize()}</h3><div class="diagram-scroll" tabindex="0" aria-label="Architecture {p} diagram">{_svg(graphs[p], p, columns, rows)}</div><p class="scroll-hint">Scroll horizontally if needed to see the full diagram.</p></div>' for p in ("before", "after"))
        details = "".join(_component_details(graphs[p], p, components, attention) for p in ("before", "after"))
        legend = "".join(f'<span><i class="key {state}"></i>{STATE_LABELS[state]}</span>' for state in ("added", "changed", "removed", "unchanged"))
        architecture = f'<section aria-labelledby="architecture"><h2 id="architecture">Architecture</h2><div class="diagram-tabs" role="tablist" aria-label="Architecture view">{tabs}</div>{flow}<div class="architecture-explorer"><div class="diagram-views">{panels}</div><aside class="component-inspector" aria-label="Selected component"><p class="inspector-eyebrow">Selected component</p><div class="inspector-content"></div><p class="selection-status" aria-live="polite"></p></aside></div><p class="legend">{legend}</p>{details}</section>'
    values.update(changes="".join(changes), validation="".join(checks), warnings=f'<aside class="warnings" aria-label="Report warnings">{warnings}</aside>' if warnings else "",
                  architecture=architecture, evidence="".join(evidence), evidence_count=len(evidence))
    template = Path(__file__).resolve().parent.parent / "assets" / "report.html"
    return Template(template.read_text(encoding="utf-8")).substitute(values)


def _main():
    """Read JSON and write the report; return a nonzero status on failure."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Path to report JSON")
    parser.add_argument("output", type=Path, help="Path to the HTML report")
    parser.add_argument("--overwrite", action="store_true", help="Replace an existing output file")
    args = parser.parse_args()
    try:
        if args.input.resolve() == args.output.resolve():
            raise ValueError("Input and output paths must differ")
        report = _render(json.loads(args.input.read_text(encoding="utf-8")))
        with args.output.open("w" if args.overwrite else "x", encoding="utf-8") as output:
            output.write(report.rstrip("\n") + "\n")
    except (OSError, ValueError, TypeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"Created {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
