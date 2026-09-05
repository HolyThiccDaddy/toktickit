# AI Use and Reflection - Lab 2 Issue #11

I used Codex as a pair-programming assistant for Lab 2 implementation, verification, evidence capture, and release documentation. I reviewed every suggested change, kept the implementation within the Lab 2 contract, and ran the recorded checks myself.

## Selected interactions

| # | Phase | Prompt or instruction | Outcome and human verification |
|---:|---|---|---|
| 1 | Repository readiness | Verify the current branch and update it from the latest `lab2-staging` merge. | Confirmed the release branch ancestry and checked the merged Issue #10 commit before starting E2E work. |
| 2 | E2E design | Implement deterministic Playwright coverage for the requester ticket journey and multi-requester isolation. | Added the functional requester-flow and cross-owner isolation journeys; reviewed selectors and ownership assertions against the contract. |
| 3 | Test safety | Ensure destructive E2E setup cannot run against a non-test database. | Added the strict `_test` database-name guard, deterministic reset/seed, and isolated attachment root; verified the setup against `toktickit_test`. |
| 4 | Responsive verification | Inspect desktop, tablet, and mobile layouts and capture reviewable evidence. | Added the responsive Playwright project and no-horizontal-overflow assertion, then checked the generated PNGs at 1440px, 768px, and 390px. |
| 5 | Review feedback | Check the implementation against the partner's review comments before release. | Reconciled the requested setup, cleanup, evidence, and documentation changes with the actual source and test results. |
| 6 | Documentation | Update the Lab 2 test plan, peer-review record, and AI-use reflection. | Recorded test commands, issue/PR links, merge SHAs, evidence paths, and the final review state in the source Markdown files. |
| 7 | Submission report | Map the Lab 2 evidence into the Lab 1 report structure and replace missing evidence placeholders. | Preserved the Part 1-9 hierarchy, added repository evidence captures, and linked every visual artifact to its source path. |
| 8 | Final audit | Re-check the report for stale Lab 1 wording, pending checkboxes, incomplete E2E traceability, and source/PDF mismatches. | Updated README, tests, reviewer record, and this log; re-rendered the final PDF and verified that no placeholder or stale pending statement remained. |

## Reflection

AI was useful for translating the Lab 2 contract into small, testable acceptance slices and for cross-checking review feedback against the repository. Human verification remained necessary for branch ancestry, database safety, test output, image readability, GitHub links, and final document consistency. The core Lab 2 implementation was merged into `main` by PR #27 (`a145b057`); README/documentation was promoted by PR #29 (`2d963f7`), and the final evidence/report update was promoted by PR #32 (`10d902b`).
