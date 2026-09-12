# Lab 3 AI Use and Reflection

Status: Planned record; update with actual prompts and verification links during implementation.

AI assistance is documented for transparency. Each entry must state what was accepted, changed, or rejected and how the result was checked against the Lab 3 contract and real tests.

| # | Prompt purpose | Intended use | Acceptance / verification record |
|---:|---|---|---|
| 1 | Extract Lab 3 scope and exclusions | Turn the handout into a concise contract checklist | To be recorded after review against Lab_3_sheet.pdf |
| 2 | Design session authentication and password-change flow | Identify secure cookie, CSRF, expiry, and first-login rules | To be recorded after API/security tests |
| 3 | Review authorization matrix | Check requester ownership, staff operations, and admin boundaries | To be recorded after authorization tests |
| 4 | Plan User migration from Lab 2 | Preserve IDs and relationships while adding roles and sessions | To be recorded after migration and seed tests |
| 5 | Design staff queue and ticket detail states | Cover loading, empty, error, retry, mutation, and responsive behavior | To be recorded after UI tests and screenshots |
| 6 | Map acceptance criteria to tests | Ensure every AC has an executable unit/API/UI/E2E check | To be recorded in tests.md with real results |
| 7 | Review peer feedback | Identify missing requirements or unsafe assumptions before coding | To be recorded in reviewer.md with change links |
| 8 | Audit release evidence | Check source, logs, screenshots, and final report consistency | To be recorded before release PR |

## Reflection

AI output is treated as a draft. Contract decisions remain subject to the Lab 3 handout and peer review. Security-sensitive behavior is accepted only when executable tests and real terminal evidence confirm it; suggestions that weaken server-side authorization, expose credentials, or invent unsupported requirements are rejected.
