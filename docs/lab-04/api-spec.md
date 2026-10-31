# Lab 4 API Specification

Status: Draft companion contract for Issue #51. All paths use the existing `/api` base path and the Lab 3 session/CSRF boundary.

## 1. Common conventions

Success responses use `{ "data": ... }`. Failures use `{ "error": { "code": string, "message": string, "fieldErrors"?: Record<string,string> } }`. Messages never expose passwords, hashes, tokens, SQL, filesystem paths, storage keys, or stack traces.

Authenticated identity comes only from the validated `toktickit_session` cookie. Mutating requests require the CSRF token from `GET /auth/csrf` in `X-CSRF-Token`; client-supplied `requesterId`, `ownerId`, `authorId`, `performedById`, or role values are ignored or rejected. First-login sessions may call only the existing auth endpoints permitted by Lab 3.

## 2. Action Taken resources

### Action shape

```json
{
  "id": 123,
  "ticketId": 42,
  "actionDateTime": "2026-10-29T10:30:00.000Z",
  "description": "Replaced the failed adapter",
  "result": "Ticket is responding normally",
  "state": "COMPLETED",
  "assignee": { "id": 8, "displayName": "Assigned Staff", "role": "IT_STAFF" },
  "performedBy": { "id": 7, "displayName": "Staff User", "role": "IT_STAFF" },
  "completedAt": "2026-10-29T10:31:00.000Z",
  "completedBy": { "id": 7, "displayName": "Staff User", "role": "IT_STAFF" },
  "cancelledAt": null,
  "cancelledBy": null,
  "followUpRequired": true,
  "followUpNote": "Recheck after the next maintenance window",
  "followUpResolvedAt": null,
  "followUpResolvedBy": null,
  "attachmentNotes": "Look for the replacement photo in the ticket attachments",
  "createdAt": "2026-10-29T10:31:00.000Z",
  "updatedAt": "2026-10-29T10:31:00.000Z",
  "version": 1,
  "revisionCount": 0
}
```

### Endpoints

| Method | Path | Authorization | Contract |
|---|---|---|---|
| GET | `/tickets/:ticketId/actions` | Ticket owner Requester, IT Staff, or Administrator | Returns `{ data: { items, meta } }` in stable `(actionDateTime,id)` order; requester sees only the owned Ticket. Each item includes `revisionCount`. |
| POST | `/tickets/:ticketId/actions` | IT Staff or Administrator + CSRF | Body contains action date/time, description, result, follow-up boolean/note, attachment notes, and optional active `assigneeId`; required `Idempotency-Key` header is a client-generated UUID retained across retries. Performer comes from session. First submission returns `201`; an identical retry returns the original `201` response body and `Idempotency-Replayed: true`, with no second Action. The same key with a different normalized payload returns `409 CONFLICT`. |
| PATCH | `/tickets/:ticketId/actions/:actionId` | IT Staff or Administrator + CSRF | Body may edit the documented fields, `assigneeId`, or `state` plus a `version` (or `updatedAt`) precondition. State changes are limited to `OPEN -> IN_PROGRESS/COMPLETED/CANCELLED` and `IN_PROGRESS -> COMPLETED/CANCELLED`; completion/cancellation audit fields come from the session and server clock. Every accepted edit atomically appends the prior editable-field snapshot to ActionRevision before updating the Action. Returns `200` with the new version or `409 CONFLICT` without mutation or revision. |
| GET | `/tickets/:ticketId/actions/:actionId/revisions` | Ticket owner Requester, IT Staff, or Administrator | Returns immutable revisions ordered by ascending `(version,id)`, each containing `{ id, actionId, version, before, changedBy, changedAt }`; the same Ticket authorization as the parent Action applies. |
| POST | `/tickets/:ticketId/actions/:actionId/follow-up-resolution` | Active IT Staff or Administrator with Ticket access + CSRF | Body `{ version }` is required. Allowed only when the Action is `COMPLETED`, `followUpRequired=true`, and `followUpResolvedAt=null`. Atomically appends its prior snapshot, sets `followUpResolvedAt` from the server clock and `followUpResolvedBy` from the session, increments `version`/`updatedAt`, and leaves state and completion audit unchanged. Returns `200`; stale or already-resolved requests return `409 CONFLICT` without mutation. |

### Action validation and revision rules

All text is trimmed before validation and persistence. `description` is required at 10–2,000 characters; `result` is required at 1–2,000; `followUpNote` is required at 1–2,000 only when `followUpRequired=true`; `attachmentNotes` is optional/null and, when supplied, must contain 1–2,000 characters after trimming. Whitespace-only values fail with `400 VALIDATION_ERROR` and field-specific errors. The 10-character description minimum reuses the Lab 2 Ticket-description rule; the 1–2,000 note limits reuse Lab 3 comment/internal-note rules.

The required `Idempotency-Key` is a canonical UUID. The server stores its per-Ticket uniqueness and SHA-256 fingerprint of the normalized create payload (trimmed strings and UTC-normalized timestamp). A replay with the same key and fingerprint returns the original Action; a different fingerprint for an existing key returns `409 CONFLICT`. The key and fingerprint are not editable or returned. `ActionRevision.before` contains the prior values of all editable fields plus prior `version`; each row records the authenticated editor and server time. The follow-up-resolution operation uses the same revision and version rules as an accepted Action edit. The application exposes no revision update/delete operation.

Action creation returns `400 VALIDATION_ERROR` for missing/invalid fields or a missing/malformed key, `403 FORBIDDEN` for a disallowed role, `404 NOT_FOUND` for a missing/unauthorized Ticket, `409 CONFLICT` when a key is reused with a different payload or for stale state, and `500 INTERNAL_ERROR` only for an unexpected safe failure. An identical retry is not an error. A completed Action has non-null `completedAt`/`completedBy`; a cancelled Action has non-null `cancelledAt`/`cancelledBy`; those fields are immutable.

## 3. Dashboard endpoints

| Method | Path | Authorization | Contract |
|---|---|---|---|
| GET | `/dashboard/requester` | Authenticated REQUESTER | Returns owned-ticket metrics and a bounded recent/attention list with safe detail links. Supports documented UTC date boundaries. |
| GET | `/dashboard/staff` | IT_STAFF or ADMIN | Returns unassigned, current-owner, status/priority, and recent/urgent metrics plus bounded drill-down items. |
| GET | `/dashboard/admin` | ADMIN | Returns the staff dashboard contract and optional concise account counts; never returns passwords/session data. |
| GET | `/staff/actions?performedBy=me&from=<utc>&to=<utc>` | IT_STAFF or ADMIN | Returns a bounded Action list for the authenticated user only. `performedBy=me` is the only accepted performer selector; the server applies `performedById=session.userId` and an inclusive-start/exclusive-end UTC window, then returns `{ data: { items, meta } }`. |

### Requester ticket-list status filters

The existing authenticated `GET /tickets` requester list retains its Lab 2/3 filters and adds optional `currentStatuses`, `updatedFrom`, and `updatedTo` query parameters. `currentStatuses` is a comma-separated list of distinct, uppercase `TicketStatus` values; `currentStatus` and `currentStatuses` are mutually exclusive. The server validates every status against the eight-status enum and applies `currentStatus IN (...)` together with `requesterId=session.userId`. `updatedFrom` and `updatedTo` must be supplied together as valid UTC instants with `updatedFrom < updatedTo`; they apply `updatedAt >= updatedFrom` and `updatedAt < updatedTo`. The endpoint returns the existing paginated response. Empty, duplicate, or invalid status values, malformed timestamps, or a non-increasing time window return `400 VALIDATION_ERROR`; omitted filters behave as before. These additive filters let dashboard links reproduce the exact status and time predicates used by their metrics.

| Requester dashboard card | My Tickets drill-down | Matching API query |
|---|---|---|
| Open Tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) | `/my-tickets?currentStatuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED` | `/api/tickets?currentStatuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED` |
| Recently Updated (`updatedAt >= now-7d`, `< now`) | `/my-tickets?updatedFrom=<now-7d>&updatedTo=<now>` | `/api/tickets?updatedFrom=<now-7d>&updatedTo=<now>` |
| Recently Resolved (`RESOLVED`, `CLOSED`) | `/my-tickets?currentStatuses=RESOLVED,CLOSED&updatedFrom=<now-7d>&updatedTo=<now>` | `/api/tickets?currentStatuses=RESOLVED,CLOSED&updatedFrom=<now-7d>&updatedTo=<now>` |

Dashboard response shape:

```json
{
  "data": {
    "metrics": [{ "key": "openTickets", "label": "Open Tickets", "value": 2, "href": "/my-tickets?currentStatuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" }],
    "items": [{ "ticketId": 42, "ticketNumber": "380005", "summary": "Adapter failure", "status": "OPEN", "itPriority": "HIGH", "updatedAt": "2026-10-29T10:31:00.000Z", "href": "/tickets/42" }],
    "meta": { "timezone": "UTC", "from": null, "to": null }
  }
}
```

Metrics are calculated by the backend from authoritative Ticket rows. Zero matches return value `0` and an empty items list. No dashboard endpoint returns an unbounded Ticket collection.

### Staff queue query extensions for dashboard drill-downs

Lab 4 extends the authenticated `GET /staff/tickets` Lab 3 queue filters without changing existing single-filter behavior:

- `assigneeId` continues to accept a positive numeric User ID and additionally accepts `me` (resolved by the server to `Ticket.ownerId=session.userId`) and `unassigned` (resolved to `Ticket.ownerId IS NULL`). No client-supplied `ownerId` is accepted.
- `statuses` accepts a comma-separated list of distinct uppercase `TicketStatus` values. It is mutually exclusive with `status`, validates every value against the eight-status enum, and applies `Ticket.currentStatus IN (...)`.
- `updatedFrom` and `updatedTo` must be provided together as valid UTC instants with `updatedFrom < updatedTo`; they apply `Ticket.updatedAt >= updatedFrom` and `Ticket.updatedAt < updatedTo`.
- Invalid, duplicate, or empty filter values, unknown query keys, malformed timestamps, and non-increasing time windows return `400 VALIDATION_ERROR`. All supplied filters are combined with the authenticated role scope and existing pagination/sorting. The Staff dashboard cards and links use the same predicates from the UI table; zero results return an empty `items` page with `total=0`.

## 4. Ticket status workflow

`PATCH /staff/tickets/:ticketId/status` accepts `{ "status": TicketStatus, "confirm"?: true, "resolutionActionId"?: number, "updatedAt"?: string }`. IT Staff and Administrators may use the matrix below; Requesters never may. `updatedAt` is the only supported Ticket precondition; a supplied `version` field is rejected with `400 VALIDATION_ERROR` because Tickets do not expose an independent numeric version. For `RESOLVED` and `CLOSED`, `resolutionActionId` must identify an Action with `state=COMPLETED`, non-empty description/result, completion audit fields, and no outstanding `followUpRequired=true` Action lacking `followUpResolvedAt`.

| From | To | Required |
|---|---|---|
| NEW | OPEN | no confirmation |
| OPEN | IN_PROGRESS | no confirmation |
| IN_PROGRESS | WAITING_FOR_REQUESTER | no confirmation |
| WAITING_FOR_REQUESTER | IN_PROGRESS | no confirmation |
| IN_PROGRESS | RESOLVED | `confirm=true` and qualifying Action |
| RESOLVED | CLOSED | `confirm=true` and qualifying Action |
| RESOLVED | REOPENED | `confirm=true` |
| REOPENED | IN_PROGRESS | no confirmation |
| NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED | CANCELLED | `confirm=true` |

Unlisted or terminal transitions return `409 CONFLICT` and leave the row unchanged. The backend locks or atomically predicates the update and returns `409 CONFLICT` for a stale `updatedAt`; unsupported `version` preconditions return `400 VALIDATION_ERROR` before any mutation.

## 5. Shared status and authorization codes

`200` represents successful reads/updates, `201` a created Action, `400 VALIDATION_ERROR` invalid fields/query, `401 UNAUTHENTICATED` absent/expired session, `403 FORBIDDEN` role/ownership denial, `403 PASSWORD_CHANGE_REQUIRED` restricted first-login session, `404 NOT_FOUND` safe missing/unauthorized resource, `409 CONFLICT` invalid transition/duplicate/stale update, and `500 INTERNAL_ERROR` unexpected failure. `ACCOUNT_INACTIVE` is returned only after a valid password for an inactive account, as required by Lab 3.

## 6. Migration and compatibility

The migration preserves existing Ticket, User, Attachment, PublicComment, InternalNote, category, system, and counter identifiers. Legacy Tickets with no Actions return an empty action list and remain valid dashboard inputs. Existing Lab 2/3 authentication, ownership, CSRF, and safe error contracts remain authoritative; no requester selector or client-supplied identity is reintroduced.
