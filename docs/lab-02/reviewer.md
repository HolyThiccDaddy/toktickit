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

No Lab 2 partner pull-request URLs were recorded in this repository. Add the partner PR links, review verdicts, and merge commits here when those records are available.

## Issue #11 Review Evidence

PR [#25](https://github.com/HolyThiccDaddy/toktickit/pull/25) was merged into `lab2-staging` with merge commit `92c4942`. The final implementation includes deterministic Playwright setup under `client/`, cross-directory E2E resolution through the client dependency, and responsive requester journeys covering Create Ticket, My Tickets, and Ticket Detail at all three configured viewport sizes.

The recorded review result is based on the GitHub review history. No unsubmitted or hypothetical approval is included in this document.
