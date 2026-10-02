"""Offline regression coverage for change-report evidence and flow output."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "change_report", ROOT / "skills/change-report/scripts/render_report.py"
)
RENDERER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RENDERER)


class ChangeReportTests(unittest.TestCase):
    """Keep evidence gaps visible and changed connections first."""

    @staticmethod
    def _report():
        return {
            "title": "Change outcome",
            "purpose": "Explain the result for readers.",
            "source": {"label": "Local change", "base": "base", "head": "head"},
            "changes": [{
                "feature": "Documentation", "before": "No usage example.",
                "after": "The guide includes an example.",
                "impact": "Readers can follow the guide.", "evidence": [],
            }],
            "validation": [], "warnings": ["Validation was not run."],
        }

    def test_empty_feature_evidence_warns_without_changing_legacy_input(self):
        data = self._report()
        data["changes"][0]["feature"] = '<img src=x onerror="alert(1)">'
        original = deepcopy(data)
        output = RENDERER._render(data)
        self.assertIn('<aside class="warnings" aria-label="Report warnings">', output)
        self.assertIn("<p>Validation was not run.</p>", output)
        self.assertIn(
            '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;: '
            'source evidence not recorded.</p>', output,
        )
        self.assertNotIn("<img", output)
        self.assertEqual(original, data)
        self.assertNotIn('id="architecture"', output)

    def test_each_evidence_gap_is_named_but_supported_features_do_not_warn(self):
        data = self._report()
        data["changes"].extend([
            {**data["changes"][0], "feature": "Tests"},
            {**data["changes"][0], "feature": "Fix", "evidence": ["src/fix.py:4"]},
        ])
        output = RENDERER._render(data)
        self.assertIn("Documentation: source evidence not recorded.", output)
        self.assertIn("Tests: source evidence not recorded.", output)
        self.assertNotIn("Fix: source evidence not recorded.", output)
        self.assertEqual(2, output.count("source evidence not recorded."))

    def test_comparison_fields_keep_table_roles_and_mobile_labels(self):
        data = self._report()
        data["changes"][0]["impact"] = '<script>alert("impact")</script>'
        output = RENDERER._render(data)
        self.assertIn('<tr role="row">', output)
        for label in ("Feature", "Before", "After", "Impact"):
            self.assertIn(
                f'<td role="cell"><span class="cell-label" aria-hidden="true">{label}</span>',
                output,
            )
        self.assertIn('&lt;script&gt;alert(&quot;impact&quot;)&lt;/script&gt;', output)
        self.assertNotIn('<script>alert("impact")</script>', output)

    def test_modified_flow_groups_precede_unchanged_parallel_connection(self):
        nodes = [{"id": name, "label": name.upper()} for name in ("a", "b", "c")]
        unchanged = {"from": "a", "to": "b", "label": "Existing"}
        graphs = {
            "before": {"nodes": nodes, "edges": [
                {"from": "a", "to": "b", "label": "Old payload"},
                unchanged,
                {"from": "b", "to": "c", "label": "Removed"},
            ]},
            "after": {"nodes": nodes, "edges": [
                unchanged,
                {"from": "a", "to": "b", "label": "New payload"},
                {"from": "a", "to": "c", "label": "Added"},
            ]},
        }
        output = RENDERER._execution_flow(graphs)
        headings = [f"<h3>{state} connections</h3>" for state in
                    ("Added", "Changed", "Removed", "Unchanged")]
        positions = [output.index(heading) for heading in headings]
        self.assertEqual(sorted(positions), positions)
        unchanged_output = output.split(headings[-1], 1)[1]
        self.assertIn("Existing", unchanged_output)
        self.assertNotIn("payload", unchanged_output)
        self.assertIn("Before: A → B:</strong> Old payload", output)
        self.assertIn("After: A → B:</strong> New payload", output)

    def test_identical_connections_without_detail_omit_flow(self):
        graph = {
            "nodes": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}],
            "edges": [{"from": "a", "to": "b", "label": "Data"}],
        }
        self.assertEqual("", RENDERER._execution_flow({"before": graph, "after": deepcopy(graph)}))


if __name__ == "__main__":
    unittest.main()
