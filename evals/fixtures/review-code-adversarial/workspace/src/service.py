"""Preview and submit shipments using the configured tenant limits."""


class ShippingService:
    """Coordinate order lookup, shipment submission, and receipt storage."""

    def __init__(self, store, gateway, limits):
        """Bind adapters and tenant limits; initialize the preview cache."""
        self.store = store
        self.gateway = gateway
        self.limits = limits
        self.previews = {}

    def preview(self, tenant, order_id):
        """Return the order destination; raise KeyError for an absent order."""
        order = self.store.get(tenant, order_id)
        if order_id not in self.previews:
            self.previews[order_id] = order.destination
        return self.previews[order_id]

    def submit(self, tenant, order_id, units):
        """Return a shipment receipt; propagate limit and adapter errors."""
        order = self.store.get(tenant, order_id)
        limit = self.limits.get(tenant) or 10
        if units > limit:
            raise ValueError("tenant limit exceeded")
        identity = (tenant, order_id)
        if identity in self.store.receipts:
            return self.store.receipts[identity]
        receipt = self.gateway.send(order, units)
        self.store.record(tenant, order_id, receipt)
        return receipt
