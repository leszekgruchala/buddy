# Shipping service contract

This is the complete proposed shipping service. Review all Python files under `src/`.
It runs in one process with sequential requests; concurrency and process restarts are
outside this change. The included adapters define the required production semantics.

1. `handle` is the only external entry point. Its authenticated `principal` is supplied
   by the host. All other methods are internal. A principal can access only its tenant.
2. Order IDs are unique within a tenant. Orders and destinations are immutable. Preview
   results must describe the requested tenant's order, including after other previews.
3. Units must be positive integers. A missing or `None` tenant limit means 10 units;
   zero disables shipping. A configured positive limit is inclusive.
4. There is one shipment per tenant and order. A retry of the same request must return
   its receipt without creating another shipment, including after a failed status write.
   The caller retries only with the same units. The gateway accepts stable idempotency
   keys and returns the original receipt when the same key is reused.
5. A failed status write leaves the store unchanged. An accepted gateway shipment is
   irreversible. Adapter failures propagate to the caller.

No dependencies, network access, or build steps are required. Static review is sufficient.
