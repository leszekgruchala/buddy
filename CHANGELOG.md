# Changelog

## 2.6.1 - 2026-10-17

`develop` now scales planning, review, and verification to the size and risk of each change. Small text edits can stay direct, narrow behavior changes get a focused implementation and balanced review, and substantial work keeps the full workflow. Requests for a quick fix or no review also skip review and subagents for that request. This keeps simple work moving while preserving deeper checks where they matter.
