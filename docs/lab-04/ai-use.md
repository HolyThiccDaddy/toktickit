# Lab 4 AI Use and Reflection

Status: The ten selected prompts below are the historical Lab 4 contract record. Issue #63 adds a local UI conformance pass, recorded separately below; its peer review and publication remain pending.

**LLM used:** The original contract recorded OpenAI Codex (GPT-5). The current UI conformance pass uses OpenAI Codex (GPT-6); this does not retrospectively verify the earlier model label.

## Selected prompt record

| # | Prompt summary | Intended decision or output | Verification source |
|---:|---|---|---|
| 1 | Extract Lab 4 scope, exclusions, required repository structure, Kanban flow, and nine-part PDF rules. | Build a bounded contract and avoid excluded features. | `SE+Lab+4.pdf`, specification sections 3 and 11–14 |
| 2 | Design the Action Taken parent-child model and audit fields. | Preserve Ticket/User identifiers and authenticated performer identity. | `specification.md` sections 5 and 8 |
| 3 | Enumerate the complete Ticket status matrix and resolution evidence gate. | Reject invalid/terminal transitions server-side and make requester feedback advisory. | `specification.md` section 5; `api-spec.md` section 4 |
| 4 | Define dashboard metrics, UTC boundaries, empty states, and drill-down links. | Keep dashboard responses concise and query-backed. | `specification.md` BR-14–BR-16; `api-spec.md` section 3 |
| 5 | Plan API authorization, CSRF, stale-update, idempotency, and safe-error behavior. | Preserve the Lab 3 session boundary and avoid client-only security. | `api-spec.md` sections 1 and 5 |
| 6 | Map every acceptance criterion to unit/API/UI/E2E/regression tests. | Require executable paths before implementation is complete. | `tests.md` section 2 |
| 7 | Review UI states at desktop, tablet, and mobile widths. | Reuse Zen Green components with accessible focus and no overflow. | `ui-spec.md` sections 1, 5, and 7 |
| 8 | Audit final evidence against the handout and current commit. | Publish only real SHA-bound results and screenshots. | `tests.md` section 5 and final PDF |
| 9 | Resolve peer-review gaps in Action revisions, retry idempotency, exact field limits, and lifecycle test traceability. | Preserve before-images, require stable create keys, reuse documented Lab 2/3 validation limits, and map assign/complete/cancel/inactive-target behavior to named tests. | Fifth PR review comments; Lab 2 `specification.md` BR-05 and Lab 3 `api-spec.md` comment/note rules; Lab 4 contract and Test DD |
| 10 | Resolve the reviewed lifecycle gap for completed Actions with outstanding follow-up. | Define a dedicated versioned follow-up-resolution operation for authorized active staff/admin; preserve completion state, append a revision, and test the full path through Ticket resolution. | Sixth PR review #5703003512 and comment #4416372908; Lab 4 BR-12a, API spec, and API/UI/E2E test plan |

## My Reflection

The specification agent is useful for turning the handout into a bounded, traceable contract; the coding agent must still treat the contract, existing code, tests, and peer review as authoritative. I will reject suggestions that weaken server-side authorization, silently overwrite work, expose credentials, count unexecuted tests, or add features excluded by the handout. Final claims will be accepted only after the named tests, migration/seed checks, visual evidence, and merged-branch SHAs are verified.

## Issue #63 UI conformance record

The student requested a shared sidebar/toolbar layout, readable typography, full-screen use, continuous corners, clearer borders, responsive sticky navigation and interaction transitions, then explicitly requested compliance with every assignment criterion. The original `SE+Lab+4.pdf` was read in full; sections 7 and 8.6 require continuity with Zen Green and earlier responsive/accessibility rules. The conformance pass restores those tokens and breakpoints while retaining the approved layout. This is an additional implementation record, not an invented eleventh selected contract prompt.

The agent corrected missing inherited styles and test-environment mismatches rather than treating a visual preview as proof. Real API-backed browser journeys, component/API regressions, production builds and the guarded repeat-seed check are recorded in [UI verification](../ux-ui-rework/verification.md). Controlled failure screenshots are labeled; unchanged historical results are not relabeled as current-main evidence. The student must review the reflection and final report before submission.
