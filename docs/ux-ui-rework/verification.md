# Issue #63 UI conformance verification

Updated 1 November 2026. Assignment: the instructor-provided `SE+Lab+4.pdf`, sections 7, 8.1–8.6, 10 and Answer Parts 5–9. Lab 2/3 contracts remain applicable, including desktop >=992px, tablet 768–991px and mobile <768px.

## Published implementation binding

Implementation commit: [`3eb6535f4658ad96ba2fabdc1620331e00302b3f`](https://github.com/HolyThiccDaddy/toktickit/commit/3eb6535f4658ad96ba2fabdc1620331e00302b3f), pushed to `codex/63-ux-ui-rework` for [PR #64](https://github.com/HolyThiccDaddy/toktickit/pull/64), targeting `main`. The publication audit compared 121 application/test/harness files and all 129 screenshots with that exact Git tree: no content mismatches. See [commit-binding.json](../../artifacts/lab-04/verification/ui-rework/commit-binding.json).

The existing passing runs occurred before committing; the normalized source is identical to the implementation commit. No post-commit test execution is claimed. Four metadata hashes were corrected to normalize CRLF/LF consistently (`migration_lock.toml` and three empty `.gitkeep` files); code and test logic did not change. This follow-up changes evidence/documentation only. The PR page provides its current head; the implementation SHA above intentionally remains stable across documentation follow-ups.

GitHub Project access is blocked by the CLI credential lacking `project` scope; do not infer a board status. The student has been asked to authorize computer use for this step or move the card. Formal review and merge remain pending.

## Revision and release boundary

- Original Lab 4 integration: [PR #62](https://github.com/HolyThiccDaddy/toktickit/pull/62), formally approved by osizk on `3058a6751d3ef2081d41847e844e3ad21efaee24` and merged by osizk into main at `96a34538efcb6675ac8129fd7e7b7c63e619e724` on 31 October 2026. These events were checked using GitHub's PR/review API.
- UI planning baseline: `1cfa768860691c93e8349dff5e217f103cf992ce`, corresponding to the planning-only draft [PR #64](https://github.com/HolyThiccDaddy/toktickit/pull/64) and [Issue #63](https://github.com/HolyThiccDaddy/toktickit/issues/63).
- The test runs below were observed on the local UI working tree before the implementation commit. The source manifest records normalized content hashes so the published implementation can be bound to the tested content without claiming these runs occurred on a future commit or final main. On 1 November 2026 the student authorized completing delivery through the waiting-for-review stage, superseding the earlier no-push instruction. Formal peer approval and teammate merge remain later gates.
- Existing Lab 2/3 PDFs and original Lab 4 release screenshots are preserved. The old Lab 4 submission PDF describes its original release, and must not be presented as evidence of this UI rework. Refresh the single submission PDF in the agreed template after the new revision is frozen; retain exactly Answer Part 1 through Answer Part 9.

## Assignment-to-evidence mapping

| Requirement | Implemented behavior and executable proof |
|---|---|
| Section 7: coherent Zen Green application | Exact Lab 2 primary/hover/pale/canvas/text/border tokens restored. Shared Inter font is bundled with its license. Sidebar, toolbar, forms, badges, focus and state styles are reused across all roles. `client/tests/lab-02/ThemeStyles.test.tsx` and `ResponsiveLayout.test.tsx` retain the inherited style contract. |
| Sections 7 and 8.1: dashboard navigation and actionable metrics | All required staff metrics retain backend values, predicates and links. Recent results are explicitly a bounded snapshot; column counts never claim to count the whole queue. Requester Home, Staff Queue and Administrator User Management remain the default entry views. |
| Section 8.2: owned Requester dashboard | Existing ownership-scoped endpoint, metric filters and ticket drill-downs remain authoritative; toolbar search uses the owned-ticket filter. `RequesterDashboard.test.tsx`, the requester API suite, multi-requester isolation and inherited browser flows cover the boundary. |
| Section 8.3: Actions Taken list/create/edit/read-only | Real authenticated browser flows create and edit an assigned Action, then sign in as the owner to verify read-only history and absence of Create/Edit controls at every project width. Existing API/component/E2E suites retain validation, lifecycle, inactive-target, retry, stale-version and audit assertions. |
| Section 8.4: workflow and resolution feedback | Backend workflow rules are unchanged. Existing `TicketWorkflow.test.tsx`, `ticket-workflow.api.test.ts` and `ticket-resolution.spec.ts` remain required. Staff ticket/workflow screenshots are now captured on all three projects rather than skipping tablet/mobile variants. |
| Section 8.5: Labs 1–3 regression | Health/categories, authenticated ticket creation, attachments/removal, comments, requester indication, staff queue/filter/sort/pagination/detail, internal notes and administration suites remain included. Only navigation helpers and evidence paths adapt to the shared shell; business assertions are retained. |
| Section 8.5: clear states and recoverable failures | Release browser captures include loading, empty, error/retry and forbidden dashboards. These particular negative states use explicitly controlled API responses, not genuine production outages or actual role denial; server authorization tests independently verify permissions. |
| Sections 7 and 8.6: responsive, keyboard and focus | Mobile disclosure is labeled, inert when closed, operable with Enter/Escape/backdrop/selection, and restores toggle focus. Sidebar/toolbar sticky positions are asserted. The attachment-removal dialog traps Tab/Shift+Tab and restores focus. Reduced-motion behavior is asserted. Breakpoint and long-content checks are recorded below. |

Test paths in the table are repository-relative; exact full paths and results are retained in the JSON reports. A passing assertion is evidence for its stated behavior, not a claim of an exhaustive manual screen-reader audit. The full-width dashboard additionally checks 320, 390, 767, 768, 991, 992 and 1440px, with complete Ticket-summary wrapping rather than ellipsis.

## Commands and observed results

Run each command from the stated directory. Prerequisites: installed server/client dependencies, local PostgreSQL, and an ignored `server/.env.test` whose parsed database name ends in `_test`. Never substitute `server/.env` for these database checks.

| Directory | Command | Result |
|---|---|---|
| client | `npm.cmd test -- --reporter=json --outputFile=../artifacts/lab-04/verification/ui-rework/client-results.json` | 70 passed, zero failed/skipped |
| client | `npm.cmd run build` | TypeScript and Vite production build passed |
| server | `npm.cmd test -- --reporter=json --outputFile=../artifacts/lab-04/verification/ui-rework/server-results.json` | 136 passed, zero failed/skipped; `server-results.json` |
| server | `npm.cmd run build` | Passed; `server-build.txt`; also executed by Playwright global setup |
| client | `npx.cmd playwright test` with the isolated environment below | 36 passed, zero failed/skipped; `e2e-results.json`; the earlier failed/aborted runs do not count |
| client | `npx.cmd playwright test ../e2e/lab-04/compliance-responsive.visual.spec.ts` | 6 passed, zero failed/skipped after the final native form-capture adjustment; `e2e-capture-followup.json` |
| client | `npx.cmd playwright test ../e2e/lab-04/release-evidence.visual.spec.ts` | 9 passed, zero failed/skipped after making screenshot capture fast-forward finite animations; `e2e-release-captures.json` |
| root | `node scripts/verify-ui-rework-test-db.mjs` | Passed: six migrations, none pending; two seed runs preserve operational rows across 13 tables; `migration-seed.txt` |
| root | `git diff --check` | Passed with Git's `core.whitespace=cr-at-eol` on this Windows worktree |
| root | Local Markdown link and credential-pattern audit | Local links resolve; no high-confidence token/private-key findings in changed/new text; `static-checks.json` |

```powershell
$env:TOKTICKIT_E2E_FRONTEND_PORT = '5181'
$env:TOKTICKIT_E2E_BACKEND_PORT = '3011'
$env:TOKTICKIT_E2E_RESULTS = '<repo>/artifacts/lab-04/verification/ui-rework/e2e-results.json'
$env:TOKTICKIT_E2E_SCREENSHOTS = '<repo>/artifacts/lab-04/screenshots/ui-rework'
npx.cmd playwright test
```

Replace `<repo>` with the absolute checkout path. The runner resets only the guarded `_test` database; do not run another suite against that database concurrently. Backend CORS uses the exact isolated frontend origin. All direct API calls in the inherited staff flow use the same configured backend. Cleanup uses the PID record for this port pair only.

The repeat-seed comparison initially included every byte and correctly detected refreshed `User.updatedAt` / `RequesterUser.updatedAt` values from inherited account upserts. Only those two metadata fields are excluded in the operational comparison; credential hashes, role/activity/password flags, IDs, Ticket/Action values and other audit fields remain included. This proves stable operational values after initialization, not byte-identical account timestamps or a complete backup/recovery rehearsal.

Intermediate failures are retained as development history: the initial theme audit exposed missing inherited style rules; a new component test used an unsupported Testing Library `exact` option and failed TypeScript; a mobile test reselected the menu by its old accessible name after expansion; and an inherited staff test still used fixed ports. Each was corrected. These failures are not counted as successful checks.

## Screenshot provenance and inspection

A local preview against the real test API is available at `http://127.0.0.1:5182/` (API port 3012). The prior visual-preview service is not used as verification evidence. The test API uses the same disposable database; do not demonstrate data entry while a destructive regression run is resetting it.

Browse the selected captures in the local [evidence index](../../artifacts/lab-04/verification/ui-rework/evidence.html). New images are under `artifacts/lab-04/screenshots/ui-rework/` only. Playwright drives Chromium against the real Express API and guarded PostgreSQL test database for login, role navigation, Actions and workflow. No generated design image or mock preview data is used as success evidence. Controlled loading/empty/error/forbidden captures are explicitly identified above.

- `lab-04/screenshots/release/<project>/01_requester_dashboard.png` through `04_admin_dashboard.png`: role dashboards and My Actions.
- `lab-04/screenshots/release/<project>/05_requester_loading.png` through `08_staff_forbidden.png`: controlled state evidence.
- `lab-04/screenshots/release/<project>/09_staff_ticket_resolution_gate.png`: real staff Ticket Detail and workflow controls.
- `lab-04/screenshots/compliance/<project>/action-create-filled.png`, `action-edit-filled.png`, `action-list.png`, `action-requester-read-only.png`: real Action forms/history/permissions.
- Nested Lab 2/3 captures retain login, password gate, queues, administration, attachments and communication evidence from the revised UI without replacing historical originals.

`<project>` is desktop, tablet or mobile. Full-page mobile captures are context records; use the additional `action-create-filled-form.png` / `action-edit-filled-form.png` section captures in the PDF so fields remain readable without extreme zoom. Full-page Lab 4 captures reset scrolling to the top to preserve the placement of sticky chrome. Release images fast-forward finite animations during capture so a transition is not mistaken for faded content; live interaction animations remain enabled. Dedicated form crops keep the exact project width and temporarily increase capture viewport height so every field and the Save control fit without sticky-header occlusion; the normal viewport is restored before continuing the workflow. The field contents are real unsaved drafts; the subsequent successful API save is separately asserted.

## Review and release gates

- Implementation commit and content equality are recorded above. Rerun affected checks if application or test logic changes.
- Obtain the teammate's formal review and authorized merge of the UI PR. Do not mark Issue #63 Done while implementation remains local or review is pending.
- Verify the merged main SHA, final Kanban state and the single readable nine-part PDF using the agreed template. New local screenshots alone do not complete those steps.
- Human screen-reader announcements and actual touch-device behavior are not claimed from Chromium/DOM assertions alone.

## Local completion snapshot

The final application source passes server 136/136, client 70/70 and the complete 36/36 browser suite, with no skipped tests. After adjusting only screenshot capture, the six responsive compliance tests and nine release-capture tests passed again. Both production builds, the guarded migration/repeat-seed comparison, local-link check and changed-text credential-pattern scan passed. No application source changed after those runs. Selected desktop/mobile form crops and 320px/desktop dashboard captures were visually inspected; all original PDFs remain unchanged.

These are implementation checks observed before committing. The publication follow-up records the actual implementation SHA and verified blob equality. Formal peer approval, merged rework, final-main rerun, refreshed submission PDF and final Kanban Done remain separate events. The source manifest records application/test hashes separately from documentation completed after the runs.
