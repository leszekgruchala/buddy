"""Local adapters with the same failure behavior as the service contract."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Order:
    """An immutable order identified by tenant and order ID."""

    tenant: str
    order_id: str
    destination: str


class Store:
    """Store immutable orders and shipment receipts by tenant and order ID."""

    def __init__(self, orders):
        """Load orders and initialize empty shipment state."""
        self.orders = {(order.tenant, order.order_id): order for order in orders}
        self.receipts = {}
        self.fail_next_record = False

    def get(self, tenant, order_id):
        """Return the tenant's order, or raise KeyError when absent."""
        return self.orders[(tenant, order_id)]

    def record(self, tenant, order_id, receipt):
        """Save a receipt, or raise OSError before any write on an injected failure."""
        if self.fail_next_record:
            self.fail_next_record = False
            raise OSError("status store unavailable")
        self.receipts[(tenant, order_id)] = receipt


class Gateway:
    """Accept shipments and deduplicate requests with a supplied key."""

    def __init__(self):
        """Initialize empty accepted shipments and idempotency records."""
        self.shipments = []
        self.keys = {}

    def send(self, order, units, key=None):
        """Return a receipt; a repeated non-None key creates no new shipment."""
        if key is not None and key in self.keys:
            return self.keys[key]
        receipt = f"shipment-{len(self.shipments) + 1}"
        self.shipments.append((order, units, receipt))
        if key is not None:
            self.keys[key] = receipt
        return receipt
