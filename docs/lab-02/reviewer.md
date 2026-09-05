# Lab 2 - Peer Review Record

**Author:** Thira Rungruangkaset - 67070503419 - GitHub: @HolyThiccDaddy
**Peer reviewer:** Ashira Sansoda - 67070503445 - GitHub: @osizk

## Pull Requests I authored (reviewed by my partner)

| PR | Issue | Branch | Merge commit | Reviewer verdict |
|---|---|---|---|---|
| [#19](https://github.com/HolyThiccDaddy/toktickit/pull/19) | #5 Lab 2 Specification, Test Plan, UI Spec, and API Spec | `feature/5-spec-test-plan` | `296350c` | Approved after the requested contract, test-plan, selector-state, seed, and database-justification updates. |
| [#20](https://github.com/HolyThiccDaddy/toktickit/pull/20) | #6 Database Schema and Idempotent Seed | `feature/6-db-seed` | `81d1c33` | Approved and merged. |
| [#21](https://github.com/HolyThiccDaddy/toktickit/pull/21) | #7 Requester Context | `feature/7-requester-context` | `37f7e40` | Approved and merged after validation, fixture, and Lab 1 regression updates. |
| [#22](https://github.com/HolyThiccDaddy/toktickit/pull/22) | #8 Create Ticket | `feature/8-create-ticket` | `26b2e9c` | Approved and merged. |
| [#23](https://github.com/HolyThiccDaddy/toktickit/pull/23) | #9 My Tickets | `feature/9-my-tickets` | `f2356bf` | Approved and merged after the category-loading error state was added. |
| [#24](https://github.com/HolyThiccDaddy/toktickit/pull/24) | #10 Ticket Detail and Attachments | `feature/10-ticket-detail` | `08882a2` | Approved and merged after attachment-state and evidence updates. |
| [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) | #11 E2E and Release Preparation | `feature/11-e2e-release` | `92c4942` | Approved and merged after Playwright, responsive, and release checks. |
| [#26](https://github.com/HolyThiccDaddy/toktickit/pull/26) | Lab 2 review documentation | `feature/lab2-reviewer-docs` | `dcd28d9` | Merged; review-history documentation completed. |
| [#27](https://github.com/HolyThiccDaddy/toktickit/pull/27) | Lab 2 release integration | `lab2-staging` -> `main` | `a145b05` | Merged release integration. |
| [#28](https://github.com/HolyThiccDaddy/toktickit/pull/28) | Lab 2 README publication | `feature/lab2-reviewer-docs` | `d35cf17` | Documentation-only update merged into `lab2-staging`. |
| [#29](https://github.com/HolyThiccDaddy/toktickit/pull/29) | Lab 2 README release integration | `lab2-staging` -> `main` | `2d963f7` | Merged release integration. |

### Conversations on PRs I Authored

- **PR [#19](https://github.com/HolyThiccDaddy/toktickit/pull/19) (`feature/5-spec-test-plan`):** The reviewer requested contract updates for attachment-failure compensation, true idempotency wording, backend attachment-boundary tests, unit/style/responsive test coverage, Requester Selection loading/empty/failure states, seed quantities, and a database-design justification. I addressed the comments in commits `0c73a62` and `d9839c4`; osizk then approved with “Everything looks good. I'll merge it now.” and merged `296350c` into `lab2-staging`.
- **PR [#20](https://github.com/HolyThiccDaddy/toktickit/pull/20) (`feature/6-db-seed`):** The reviewer requested the missing attachment relation, concurrency-safe ticket counter, idempotent seed tests, isolated `.env.test` execution, and Node.js 18 compatibility. Follow-up comments recorded the test-database and environment-file fixes, then the Node 18 compatibility fix; after the re-review requests, osizk approved and asked to merge before `81d1c33` landed.
- **PR [#21](https://github.com/HolyThiccDaddy/toktickit/pull/21) (`feature/7-requester-context`):** The reviewer requested validated requester persistence, deterministic requester fixtures, and preservation of the Lab 1 Check System behavior. After the fixes, osizk confirmed the points were resolved and that the client tests and builds passed, and I agreed to merge `37f7e40`.
- **PR [#22](https://github.com/HolyThiccDaddy/toktickit/pull/22) (`feature/8-create-ticket`):** The reviewer requested atomic attachment staging, an isolated upload root for tests, valid-header field-validation coverage, and backend-generated ticket dates. The follow-up review approved the updates and asked to merge; I agreed before `26b2e9c` landed.
- **PR [#23](https://github.com/HolyThiccDaddy/toktickit/pull/23) (`feature/9-my-tickets`):** The reviewer requested an explicit category-loading error state with a retry action. This was implemented; the reviewer later corrected a review posted on the wrong commit, confirmed the result was fine, and the PR was merged at `f2356bf`.
- **PR [#24](https://github.com/HolyThiccDaddy/toktickit/pull/24) (`feature/10-ticket-detail`):** The reviewer first flagged duplicate screenshots and mismatched PNG extensions, then requested separate upload/removal busy states and both attachment-validation error keys. The corrected evidence and UI changes were approved before `08882a2` landed.
- **PR [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) (`feature/11-e2e-release`):** The reviewer requested Playwright under `client/` and responsive E2E journeys for Create Ticket, My Tickets, and Ticket Detail at desktop, tablet, and mobile sizes. The follow-up commit aligned the setup and expanded the journeys/screenshots; osizk confirmed it was ready to merge, and I agreed before `92c4942c` landed in `lab2-staging`.
- **PR [#26](https://github.com/HolyThiccDaddy/toktickit/pull/26) (`feature/lab2-reviewer-docs`):** The documentation-only update synchronized the review record with the actual PR history. osizk confirmed the document looked good and asked to merge; I agreed before `dcd28d9` landed.
- **PR [#27](https://github.com/HolyThiccDaddy/toktickit/pull/27) (`lab2-staging` -> `main`):** The release PR had no additional substantive review comment and merged the completed Lab 2 increment into `main` at `a145b057`.
- **PR [#28](https://github.com/HolyThiccDaddy/toktickit/pull/28) (`feature/lab2-reviewer-docs`):** The README publication was documentation-only. GitHub records no review comments before the merge into `lab2-staging`.
- **PR [#29](https://github.com/HolyThiccDaddy/toktickit/pull/29) (`lab2-staging` -> `main`):** The README release promotion was documentation-only. GitHub records no review comments before the merge into `main`.

---

## Pull Requests I reviewed for my partner

| PR | Issue | Branch | Merge commit | My verdict |
|---|---|---|---|---|
| [#20](https://github.com/osizk/TokTickIT/pull/20) | #12 Lab 2 contract documentation | `feature/5-Lab2Contract` | `fc25158` | Reviewed with requested documentation updates; confirmed fixed before merge. |
| [#21](https://github.com/osizk/TokTickIT/pull/21) | #13 Add Lab 2 data/reference APIs | `feature/lab2-data-reference` | - | Closed without merge; no review was submitted by me. |
| [#22](https://github.com/osizk/TokTickIT/pull/22) | #13 Lab 2 data and reference APIs | `feature/6-Lab2-dataReference` | `91b877b` | Approved and merged after checking every changed file. |
| [#23](https://github.com/osizk/TokTickIT/pull/23) | #14 Lab 2 requester context | `feature/7-Lab2RequesterContext` | `bcaf342` | Approved and merged after verifying requester selection, all four UI states, and seven tests. |
| [#24](https://github.com/osizk/TokTickIT/pull/24) | #15 Ticket creation and atomic attachments | `feature/8-Lab2TicketCreate` | `0675074` | Approved and merged after testing the feature flow and a phone-sized viewport. |
| [#25](https://github.com/osizk/TokTickIT/pull/25) | #16 My Tickets list and query controls | `feature/9-Lab2MyTickets` | `057d63f` | Approved and merged after testing the requested features, server/client runtime, and responsive layout. |
| [#26](https://github.com/osizk/TokTickIT/pull/26) | #17 Lab 2 ticket detail and attachments | `feature/10-Lab2TicketDetailAttachments` | `d3a7478` | Approved and merged after testing Ticket Detail and attachment upload, download, and soft removal. |
| [#27](https://github.com/osizk/TokTickIT/pull/27) | #18 Lab 2 E2E and visual testing | `feature/11-Lab2E2EVisual` | `9499959` | Approved and merged after checking desktop and phone-sized responsive behavior. |
| [#28](https://github.com/osizk/TokTickIT/pull/28) | #19 Lab 2 release evidence (draft) | `feature/12-Lab2ReleaseEvidence` | - | Closed without merge; the release-evidence work continued in PR #29. |
| [#29](https://github.com/osizk/TokTickIT/pull/29) | #19 Lab 2 release evidence | `feature/12-Lab2ReleaseEvidence` | `ddece86` | Approved in conversation and merged into `lab2-staging`. |
| [#30](https://github.com/osizk/TokTickIT/pull/30) | Lab 2 final integration | `lab2-staging` -> `main` | `c32005b` | Approved in conversation and merged into `main`. |
| [#31](https://github.com/osizk/TokTickIT/pull/31) | #19 Lab 2 release evidence | `docs/lab2-final-evidence` | `61d2023` | Approved in conversation and merged into `lab2-staging`. |
| [#32](https://github.com/osizk/TokTickIT/pull/32) | #19 Lab 2 release promotion to main | `lab2-staging` -> `main` | `45925aa` | Approved in conversation and merged into `main`. |

### Conversations on PRs I Reviewed

**PR [#20](https://github.com/osizk/TokTickIT/pull/20) (`feature/5-Lab2Contract`).** I requested a short database-design rationale in the lab specification, such as the reason for attachment soft deletion or `TicketCounter`, and asked for the exact model field types and relations. After the updates were pushed, I confirmed that the issues were fixed before the pull request was merged.

**PR [#21](https://github.com/osizk/TokTickIT/pull/21) (`feature/lab2-data-reference`).** This pull request was closed with unmerged commits. I did not submit a review on this attempt; the follow-up implementation was reviewed in PR [#22](https://github.com/osizk/TokTickIT/pull/22).

**PR [#22](https://github.com/osizk/TokTickIT/pull/22) (`feature/6-Lab2-dataReference`).** I checked every changed file, found the data/reference API implementation working as expected, and approved the pull request before it was merged.

**PR [#23](https://github.com/osizk/TokTickIT/pull/23) (`feature/7-Lab2RequesterContext`).** I verified requester selection, the four required UI states, and the seven reported tests. The implementation worked as expected, so I approved it before merge.

**PR [#24](https://github.com/osizk/TokTickIT/pull/24) (`feature/8-Lab2TicketCreate`).** I tested the ticket-creation and attachment flow, including a phone-sized viewport. The behavior and layout worked as expected, so I approved the pull request.

**PR [#25](https://github.com/osizk/TokTickIT/pull/25) (`feature/9-Lab2MyTickets`).** I tested the requested My Tickets features, confirmed that the server and client ran without issues, and checked the responsive layout before approving the pull request.

**PR [#26](https://github.com/osizk/TokTickIT/pull/26) (`feature/10-Lab2TicketDetailAttachments`).** I tested Ticket Detail and verified attachment upload, download, and soft removal. All checked behavior worked as expected, so I approved the pull request.

**PR [#27](https://github.com/osizk/TokTickIT/pull/27) (`feature/11-Lab2E2EVisual`).** I checked the responsive E2E implementation on desktop and phone-sized layouts. The behavior worked well at both sizes, so I approved the pull request.

**PR [#28](https://github.com/osizk/TokTickIT/pull/28) (`feature/12-Lab2ReleaseEvidence`).** This first release-evidence draft was closed without merge after a review comment was marked off-topic. No approval was recorded; the completed evidence continued in PR [#29](https://github.com/osizk/TokTickIT/pull/29).

**PR [#29](https://github.com/osizk/TokTickIT/pull/29) (`feature/12-Lab2ReleaseEvidence`).** I reviewed the guarded migration and seed checks, regression output, responsive evidence, and final-main handoff. I replied that it looked good and asked whether it was ready to merge; osizk confirmed, and I merged commit `ddece86` into `lab2-staging`.

**PR [#30](https://github.com/osizk/TokTickIT/pull/30) (`lab2-staging` -> `main`).** I checked the final integration summary and release audit, replied that it looked good, and asked to merge. osizk agreed, and I merged commit `c32005b` into `main`.

**PR [#31](https://github.com/osizk/TokTickIT/pull/31) (`docs/lab2-final-evidence` -> `lab2-staging`).** I checked the documentation-only final evidence update and asked whether it was ready. osizk confirmed, and I merged commit `61d2023` into `lab2-staging`.

**PR [#32](https://github.com/osizk/TokTickIT/pull/32) (`lab2-staging` -> `main`).** I confirmed the final release promotion was ready and announced the merge. osizk agreed, and I merged commit `45925aa` into `main`.

## Release evidence

Contract PR [#19](https://github.com/HolyThiccDaddy/toktickit/pull/19) was reviewed and merged into `lab2-staging` with merge commit `296350c` before the implementation PRs. PR [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) was then merged into `lab2-staging` with merge commit `92c4942c`. The final release integration PR [#27](https://github.com/HolyThiccDaddy/toktickit/pull/27) merged `lab2-staging` into `main` with merge commit `a145b057`.

The follow-up README publication PRs [#28](https://github.com/HolyThiccDaddy/toktickit/pull/28) and [#29](https://github.com/HolyThiccDaddy/toktickit/pull/29) merged the Lab 2 README update into `lab2-staging` and then `main` at `2d963f7`.

The final evidence/report update was promoted by [PR #32](https://github.com/HolyThiccDaddy/toktickit/pull/32) with merge commit `10d902b`. The current documentation correction updates the AI-use prompt count, completed visual checklist, Node.js/Playwright prerequisite, and release chronology in the source files and submission report. It remains separate from the historical core release PR #27 so the evidence trail stays auditable.

In the partner repository, release-evidence PR [#29](https://github.com/osizk/TokTickIT/pull/29) merged into `lab2-staging`, integration PR [#30](https://github.com/osizk/TokTickIT/pull/30) promoted it to `main`, documentation PR [#31](https://github.com/osizk/TokTickIT/pull/31) merged into `lab2-staging`, and final promotion PR [#32](https://github.com/osizk/TokTickIT/pull/32) merged into `main`.

The reciprocal review record above contains the actual PR links, merge commits, review outcomes, and requested-change conversations. No unsubmitted or hypothetical approval is included.
