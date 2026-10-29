# Lab 4 Peer Review Record

Status: PR #57 is still awaiting formal approval and merge. No approval or merge is claimed.

**Author:** Thira Rungruangkaset — GitHub: @HolyThiccDaddy
**Peer reviewer:** Ashira Sansoda — GitHub: @osizk

## Contract review target

- Issue: [#51](https://github.com/HolyThiccDaddy/toktickit/issues/51)
- Branch: `feature/lab4-issue-1-contract`
- Target: `lab4-staging`
- Contract files: `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`

## Review checklist

The reviewer should verify that the contract covers the required Action Taken fields and roles, one-to-many data relationship, complete status matrix and resolution gate, dashboard calculations and drill-downs, migration/backfill/seed safety, API shapes and safe errors, Zen Green responsive/accessibility behavior, complete Lab 1–3 regression, acceptance-criterion traceability, and the nine-part release evidence. Excluded features must remain excluded.

## Review history

- [First review](https://github.com/HolyThiccDaddy/toktickit/pull/57#pullrequestreview-5699066375) requested Action state/assignment/audit fields, a gate requiring a completed Action and resolved follow-up, current-user Actions on the staff dashboard, exact dashboard predicates, and complete named test traceability. The response was recorded in the follow-up contract update (`d544497`).
- [Second review](https://github.com/HolyThiccDaddy/toktickit/pull/57#pullrequestreview-5699609866) identified three remaining gaps: the data model needed types/nullability/foreign keys/constraints/indexes for the Action audit fields; staff ticket counts and queue links needed to use the existing `Ticket.ownerId` plus the Lab 3 `assigneeId` query alias; and the My Actions drill-down needed a defined `/staff/actions` API and server-side filter. The current contract addresses these in commit [`4c62aa1`](https://github.com/HolyThiccDaddy/toktickit/commit/4c62aa1344cde00d0fdb82571d8c90b0a9bd2d9d) across `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`.
- [Third review](https://github.com/HolyThiccDaddy/toktickit/pull/57#pullrequestreview-5700087839) confirmed the schema and route comments were addressed, then identified that the Open Tickets card and Recently Resolved card linked to single-status filters that did not match their respective status sets. The response adds a validated `currentStatuses` list filter and paired UTC `updatedFrom`/`updatedTo` filters to the requester API contract, aligns the dashboard links, and maps the status/time predicate equality to named API and UI tests.
- [Fourth review](https://github.com/HolyThiccDaddy/toktickit/pull/57#pullrequestreview-5700892734) confirmed those requester filters and identified two remaining mismatches: the unsupported requester `status` alias ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4414719322)) and unsupported Lab 3 queue filters for `assigneeId=me/unassigned`, multiple statuses, and UTC date windows ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4414719340)). The response updates the requester Waiting for Requester link to `currentStatus`, defines additive staff queue filter semantics and safe errors, aligns staff dashboard links, and adds API/UI test traceability for each filtered-list equality.
- [Fifth review](https://github.com/HolyThiccDaddy/toktickit/pull/57#pullrequestreview-5702865910) accepted the dashboard filter fixes and requested immutable Action edit history ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4416262050)), mandatory retry-safe idempotency keys ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4416262062)), exact trimmed field limits ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4416262070)), and named API/UI/E2E acceptance coverage for assignment, completion, cancellation, and inactive-assignee rejection ([comment](https://github.com/HolyThiccDaddy/toktickit/pull/57#discussion_r4416262079)). The response adds ActionRevision snapshots/history access, required UUID replay semantics, limits aligned to existing Lab 2/3 contracts, and AC/API/UI/E2E traceability.
- Re-review requests have been posted at [14:34 UTC](https://github.com/HolyThiccDaddy/toktickit/pull/57#issuecomment-6499558829), [14:47 UTC](https://github.com/HolyThiccDaddy/toktickit/pull/57#issuecomment-6499894513), [15:57 UTC](https://github.com/HolyThiccDaddy/toktickit/pull/57#issuecomment-6501652406), and [16:05 UTC](https://github.com/HolyThiccDaddy/toktickit/pull/57#issuecomment-6501858963). The current response must receive its own re-review before Issue 2 begins.
- Current review evidence: the latest reviewer event is `CHANGES_REQUESTED`; there is no formal `APPROVED` review and PR #57 is open, not merged. Record subsequent review comments and merge SHA only from verified GitHub events.
