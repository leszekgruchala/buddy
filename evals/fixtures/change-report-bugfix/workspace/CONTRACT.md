# Expiry boundary

The supplied before/ and after/ trees are the complete requested local comparison. They are named snapshots, not Git commits. Cite these paths honestly and record content fingerprints; do not invent commit IDs.

A session is valid only while now is less than expires_at. Expired users must sign in again; no caller, storage, or service wiring changes.
