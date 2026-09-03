# AI Use and Reflection — Lab 2 Issue #11

I used Codex as a pair-programming assistant for the final Lab 2 verification and release-preparation work.

## Selected interactions

| Phase | Prompt or instruction | Outcome |
|---|---|---|
| Repository readiness | Verify the current branch and update it from the latest `lab2-staging` merge. | Confirmed `feature/11-e2e-release` is based on merge commit `08882a2`, which includes Issue #10. |
| E2E design | Implement deterministic Playwright coverage for the requester ticket journey and multi-requester isolation. | Added two Playwright specs that exercise the real client and API against the dedicated `toktickit_test` database. |
| Test safety | Ensure destructive E2E setup cannot run against a non-test database. | Added a strict `_test` database-name guard, deterministic truncation and seed setup, and an isolated upload root. |
| Responsive verification | Inspect desktop, tablet, and mobile layouts and capture reviewable evidence. | Added responsive Playwright coverage with a horizontal-overflow assertion and PNG screenshots for all three viewports. |
| Documentation | Update the Lab 2 test plan, peer-review record, and AI-use reflection. | Recorded the Issue #11 test commands, evidence paths, known review state, and the AI-assisted decisions. |

## Reflection

The final verification work benefited from using the same browser-driven journey for both behavior and visual inspection. Keeping the E2E database reset separate from the application server prevents local development data from affecting repeatability, while the explicit `_test` guard protects against destructive setup mistakes. The remaining release PR and peer-review fields are left pending until the pull request is opened and reviewed.
