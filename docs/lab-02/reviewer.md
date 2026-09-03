# Lab 2 — Peer Review Record

**Author:** Thira Rungruangkaset — 67070503419 — GitHub: @HolyThiccDaddy
**Peer reviewer:** Ashira Sansoda — 67070503445 — GitHub: @osizk

## Pull Requests I authored (reviewed by my partner)

| PR | Issue | Branch | Merge commit | Reviewer verdict |
|---|---|---|---|---|
| [#20](https://github.com/HolyThiccDaddy/toktickit/pull/20) | #6 Database Schema and Idempotent Seed | `feature/6-db-seed` | `81d1c33` | Approved and merged. “Everything look good, Can I merge now?” |
| [#21](https://github.com/HolyThiccDaddy/toktickit/pull/21) | #7 Requester Context | `feature/7-requester-context` | `37f7e40` | Approved and merged after the requested validation, fixture, and Lab 1 regression updates. |
| [#22](https://github.com/HolyThiccDaddy/toktickit/pull/22) | #8 Create Ticket | `feature/8-create-ticket` | `26b2e9c` | Approved and merged. “Great, Can I merge now.” |
| [#23](https://github.com/HolyThiccDaddy/toktickit/pull/23) | #9 My Tickets | `feature/9-my-tickets` | `f2356bf` | Approved and merged. “Everything seems fine, and can I merge?” |
| [#24](https://github.com/HolyThiccDaddy/toktickit/pull/24) | #10 Ticket Detail and Attachments | `feature/10-ticket-detail` | `08882a2` | Approved and merged after the attachment-state and evidence updates. |
| [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) | #11 E2E and Release Preparation | `feature/11-e2e-release` | `92c4942` | Approved and merged. “Everything looks perfect, merge now?” |

### Conversations on PRs I Authored

- **PR [#20](https://github.com/HolyThiccDaddy/toktickit/pull/20) (`feature/6-db-seed`):** The reviewer requested the missing attachment relation, concurrency-safe ticket counter, idempotent seed tests, isolated `.env.test` execution, and Node.js 18 compatibility. These changes were completed before approval and merge.

- **PR [#21](https://github.com/HolyThiccDaddy/toktickit/pull/21) (`feature/7-requester-context`):** The reviewer requested validated requester persistence, deterministic requester fixtures, and preservation of the Lab 1 Check System behavior. The follow-up changes were approved after the client tests and builds passed.

- **PR [#22](https://github.com/HolyThiccDaddy/toktickit/pull/22) (`feature/8-create-ticket`):** The reviewer requested atomic attachment staging, an isolated upload root for tests, valid-header field-validation coverage, and backend-generated ticket dates. The requested updates were completed before approval and merge.

- **PR [#23](https://github.com/HolyThiccDaddy/toktickit/pull/23) (`feature/9-my-tickets`):** The reviewer requested an explicit category-loading error state with a retry action. This was implemented and the PR was approved and merged.

- **PR [#24](https://github.com/HolyThiccDaddy/toktickit/pull/24) (`feature/10-ticket-detail`):** The reviewer requested separate upload/removal busy states, support for both attachment validation error keys, and distinct PNG evidence matching each filename. These updates were completed before approval and merge.

- **PR [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) (`feature/11-e2e-release`):** The reviewer requested that Playwright be installed and configured under `client/`, and that responsive E2E journeys cover Create Ticket, My Tickets, and Ticket Detail at desktop, tablet, and mobile sizes. The follow-up commit aligned the setup, expanded the journeys and screenshots, and was approved with “Everything looks perfect, merge now?” before merging into `lab2-staging`.

---

## Pull Requests I reviewed for my partner

| PR | Issue | Branch | Merge commit | My verdict |
|---|---|---|---|---|
| [#20](https://github.com/osizk/TokTickIT/pull/20) | #12 Lab 2 contract documentation | `feature/5-Lab2Contract` | `fc25158` | Reviewed with requested documentation updates; confirmed fixed before merge. |
| [#21](https://github.com/osizk/TokTickIT/pull/21) | #13 Add Lab 2 data/reference APIs | `feature/lab2-data-reference` | — | Closed without merge; no review was submitted by me. |
| [#22](https://github.com/osizk/TokTickIT/pull/22) | #13 Lab 2 data and reference APIs | `feature/6-Lab2-dataReference` | `91b877b` | Approved and merged after checking every changed file. |
| [#23](https://github.com/osizk/TokTickIT/pull/23) | #14 Lab 2 requester context | `feature/7-Lab2RequesterContext` | `bcaf342` | Approved and merged after verifying requester selection, all four UI states, and seven tests. |
| [#24](https://github.com/osizk/TokTickIT/pull/24) | #15 Ticket creation and atomic attachments | `feature/8-Lab2TicketCreate` | `0675074` | Approved and merged after testing the feature flow and a phone-sized viewport. |
| [#25](https://github.com/osizk/TokTickIT/pull/25) | #16 My Tickets list and query controls | `feature/9-Lab2MyTickets` | `057d63f` | Approved and merged after testing the requested features, server/client runtime, and responsive layout. |
| [#26](https://github.com/osizk/TokTickIT/pull/26) | #17 Lab 2 ticket detail and attachments | `feature/10-Lab2TicketDetailAttachments` | `d3a7478` | Approved and merged after testing Ticket Detail and attachment upload, download, and soft removal. |
| [#27](https://github.com/osizk/TokTickIT/pull/27) | #18 Lab 2 E2E and visual testing | `feature/11-Lab2E2EVisual` | `9499959` | Approved and merged after checking desktop and phone-sized responsive behavior. |

### Conversations on PRs I Reviewed

**PR [#20](https://github.com/osizk/TokTickIT/pull/20) (`feature/5-Lab2Contract`).** I requested a short database-design rationale in the lab specification, such as the reason for attachment soft deletion or `TicketCounter`, and asked for the exact model field types and relations. After the updates were pushed, I confirmed that the issues were fixed before the pull request was merged.

**PR [#21](https://github.com/osizk/TokTickIT/pull/21) (`feature/lab2-data-reference`).** This pull request was closed with unmerged commits. I did not submit a review on this attempt; the follow-up implementation was reviewed in PR [#22](https://github.com/osizk/TokTickIT/pull/22).

**PR [#22](https://github.com/osizk/TokTickIT/pull/22) (`feature/6-Lab2-dataReference`).** I checked every changed file, found the data/reference API implementation working as expected, and approved the pull request before it was merged.

**PR [#23](https://github.com/osizk/TokTickIT/pull/23) (`feature/7-Lab2RequesterContext`).** I verified requester selection, the four required UI states, and the seven reported tests. The implementation worked as expected, so I approved it before merge.

**PR [#24](https://github.com/osizk/TokTickIT/pull/24) (`feature/8-Lab2TicketCreate`).** I tested the ticket-creation and attachment flow, including a phone-sized viewport. The behavior and layout worked as expected, so I approved the pull request.

**PR [#25](https://github.com/osizk/TokTickIT/pull/25) (`feature/9-Lab2MyTickets`).** I tested the requested My Tickets features, confirmed that the server and client ran without issues, and checked the responsive layout before approving the pull request.

**PR [#26](https://github.com/osizk/TokTickIT/pull/26) (`feature/10-Lab2TicketDetailAttachments`).** I tested Ticket Detail and verified attachment upload, download, and soft removal. All checked behavior worked as expected, so I approved the pull request.

**PR [#27](https://github.com/osizk/TokTickIT/pull/27) (`feature/11-Lab2E2EVisual`).** I checked the responsive E2E implementation on desktop and phone-sized layouts. The behavior worked well at both sizes, so I approved the pull request.

## Issue #11 Review Evidence

PR [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) was merged into `lab2-staging` with merge commit `92c4942`. The final implementation includes deterministic Playwright setup under `client/`, cross-directory E2E resolution through the client dependency, and responsive requester journeys covering Create Ticket, My Tickets, and Ticket Detail at all three configured viewport sizes.

The recorded review result is based on the GitHub review history. No unsubmitted or hypothetical approval is included in this document.
