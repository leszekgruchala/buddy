"""Confirm the review fixture's seeded failures and safe control paths."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest


SOURCE = Path(__file__).resolve().parents[1] / "evals/fixtures/review-code-adversarial/workspace/src"


def load_module(name: str):
    """Load an isolated fixture module by name and return it."""
    spec = importlib.util.spec_from_file_location(f"review_fixture_{name}", SOURCE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


adapters = load_module("adapters")
service = load_module("service")
routes = load_module("routes")


class ReviewAdversarialFixtureTests(unittest.TestCase):
    """Protect the grading oracle, including its false-positive controls."""

    def setUp(self) -> None:
        """Create two tenants whose distinct orders have the same local ID."""
        self.store = adapters.Store([
            adapters.Order("a", "1", "A depot"),
            adapters.Order("b", "1", "B depot"),
        ])
        self.gateway = adapters.Gateway()
        self.service = service.ShippingService(self.store, self.gateway, {"a": 0, "b": 10})

    def request(self, tenant, action, units=1):
        """Run an authenticated request through the sole external entry point."""
        return routes.handle(self.service, tenant, tenant, "1", action, units)

    def test_seeded_cache_leaks_another_tenant_destination(self) -> None:
        self.assertEqual(self.request("a", "preview"), "A depot")
        self.assertEqual(self.request("b", "preview"), "A depot")
        self.assertNotEqual(self.request("b", "preview"), self.store.get("b", "1").destination)

    def test_seeded_zero_limit_still_allows_shipping(self) -> None:
        self.assertEqual(self.service.limits["a"], 0)
        self.request("a", "submit")
        self.assertEqual(len(self.gateway.shipments), 1)

    def test_seeded_retry_duplicates_an_accepted_shipment(self) -> None:
        self.store.fail_next_record = True
        with self.assertRaises(OSError):
            self.request("b", "submit")
        self.assertEqual(self.store.receipts, {})
        self.assertEqual(len(self.gateway.shipments), 1)
        self.request("b", "submit")
        self.assertEqual(len(self.gateway.shipments), 2)

    def test_route_rejects_wrong_tenant_and_invalid_units(self) -> None:
        for action in ("preview", "submit"):
            with self.subTest(action=action), self.assertRaises(PermissionError):
                routes.handle(self.service, "a", "b", "1", action)
        for units in (0, -1, True, 1.5, "1"):
            with self.subTest(units=units), self.assertRaises(ValueError):
                self.request("b", "submit", units)
        self.assertEqual(self.gateway.shipments, [])
        self.assertEqual(self.service.previews, {})

    def test_successful_retry_and_inclusive_limit_are_safe(self) -> None:
        first = self.request("b", "submit", 10)
        self.assertEqual(self.request("b", "submit", 10), first)
        self.assertEqual(len(self.gateway.shipments), 1)
        with self.assertRaises(ValueError):
            self.request("b", "submit", 11)

    def test_gateway_supports_safe_tenant_scoped_retry_keys(self) -> None:
        for tenant in ("a", "b"):
            order = self.store.get(tenant, "1")
            key = (tenant, "1")
            first = self.gateway.send(order, 1, key=key)
            self.assertEqual(self.gateway.send(order, 1, key=key), first)
        self.assertEqual(len(self.gateway.shipments), 2)


if __name__ == "__main__":
    unittest.main()
