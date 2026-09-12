# Lab 3 - Peer Review Record

Status: Draft; review changes addressed locally; peer re-review is pending.

**Author:** Thira Rungruangkaset - GitHub: @HolyThiccDaddy
**Peer reviewer:** Ashira Sangkaset - GitHub: @osizk

## Contract review

| PR | Scope | Reviewer verdict | Follow-up |
|---|---|---|---|
| [#40](https://github.com/HolyThiccDaddy/toktickit/pull/40) | Lab 3 specification, API contract, UI specification, and test plan | Request changes; addressed locally | Peer re-review and approval remain pending after the contract update |

## Review protocol

Reviewers should check that the contract covers authentication, first-login password change, role and ownership authorization, staff queue/detail, public comments/internal notes, admin safeguards, migration compatibility, responsive UI, and traceable tests. Record comments as dated paragraphs with links to the exact PR or commit. Do not mark approval until requested changes are implemented and verified.

## Peer review round 1 - 2026-09-12

The reviewer requested a complete eight-status transition matrix with permitted roles, confirmations, and invalid-transition behavior. The contract now defines NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, and CANCELLED, including terminal states and the rule that a Requester indication never formally resolves a Ticket.

The reviewer found a contradiction about Administrator Ticket access. The contract now states that the authorization matrix explicitly grants Administrators the same queue and Ticket operations as IT Staff, while keeping user management Administrator-only. The API, UI, and tests use this same decision.

The reviewer requested exact seed quantities, queue query behavior, and Administrator safeguards. The contract now specifies the required active and inactive account counts, realistic assigned and unassigned Tickets, searchable/filterable/sortable fields, pagination metadata and invalid-query errors, plus server-side self-deactivation, self-role-change, duplicate-email, invalid-role, and last-active-Administrator protection.

The reviewer requested Requester-side tests for comments and the resolution indication. The test plan now maps AC-06 to a Requester Ticket Detail component test and a Requester regression E2E flow that checks ownership rejection and confirms the indication does not set RESOLVED or CLOSED.

The reviewer requested safer inactive-login handling and Administrator assignment eligibility. The API now returns ACCOUNT_INACTIVE only after the submitted password is verified, and assignment accepts only active IT Staff or Administrator users. Public/internal message append-only, author/time, validation, and safe-rendering rules are also recorded.

## Implementation and release history

To be completed after the contract PR, feature PRs, release PR, and final evidence are available. Keep the source-of-truth links and verdicts synchronized with GitHub.
