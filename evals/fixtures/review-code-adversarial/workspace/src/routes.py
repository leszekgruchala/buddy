"""Authenticated entry point for shipping requests."""


def handle(service, principal, tenant, order_id, action, units=1):
    """Return the requested result; reject unauthorized or invalid requests."""
    if principal != tenant:
        raise PermissionError("wrong tenant")
    if type(units) is not int or units <= 0:
        raise ValueError("units must be a positive integer")
    if action == "preview":
        return service.preview(tenant, order_id)
    if action == "submit":
        return service.submit(tenant, order_id, units)
    raise ValueError("unknown action")
