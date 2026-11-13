# Gateway

`POST /capture` creates a new charge on every call. A request is idempotent only when it sends an `Idempotency-Key` header; the gateway then returns the first result for repeated keys.
