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
  "version": 1
}
```

### Endpoints

| Method | Path | Authorization | Contract |
|---|---|---|---|
| GET | `/tickets/:ticketId/actions` | Ticket owner Requester, IT Staff, or Administrator | Returns `{ data: { items, meta } }` in stable `(actionDateTime,id)` order; requester sees only the owned Ticket. |
| POST | `/tickets/:ticketId/actions` | IT Staff or Administrator + CSRF | Body contains action date/time, description, result, follow-up boolean/note, attachment notes, and optional idempotency key. Performer comes from session. Returns `201`. |
| PATCH | `/tickets/:ticketId/actions/:actionId` | IT Staff or Administrator + CSRF | Body may edit the documented fields, `assigneeId`, or `state` plus a `version` (or `updatedAt`) precondition. State changes are limited to `OPEN -> IN_PROGRESS/COMPLETED/CANCELLED` and `IN_PROGRESS -> COMPLETED/CANCELLED`; completion/cancellation and follow-up-resolution audit fields come from the session and server clock. Returns `200` with the new version or `409 CONFLICT` without mutation. |

Action creation returns `400 VALIDATION_ERROR` for missing/invalid fields, `403 FORBIDDEN` for a disallowed role, `404 NOT_FOUND` for a missing/unauthorized Ticket, `409 CONFLICT` for duplicate idempotency or stale state, and `500 INTERNAL_ERROR` only for an unexpected safe failure. A completed Action has non-null `completedAt`/`completedBy`; a cancelled Action has non-null `cancelledAt`/`cancelledBy`; those fields are immutable.

## 3. Dashboard endpoints

| Method | Path | Authorization | Contract |
|---|---|---|---|
| GET | `/dashboard/requester` | Authenticated REQUESTER | Returns owned-ticket metrics and a bounded recent/attention list with safe detail links. Supports documented UTC date boundaries. |
| GET | `/dashboard/staff` | IT_STAFF or ADMIN | Returns unassigned, current-owner, status/priority, and recent/urgent metrics plus bounded drill-down items. |
| GET | `/dashboard/admin` | ADMIN | Returns the staff dashboard contract and optional concise account counts; never returns passwords/session data. |
| GET | `/staff/actions?performedBy=me&from=<utc>&to=<utc>` | IT_STAFF or ADMIN | Returns a bounded Action list for the authenticated user only. `performedBy=me` is the only accepted performer selector; the server applies `performedById=session.userId` and an inclusive-start/exclusive-end UTC window, then returns `{ data: { items, meta } }`. |

Dashboard response shape:

```json
{
  "data": {
    "metrics": [{ "key": "openTickets", "label": "Open Tickets", "value": 2, "href": "/my-tickets?status=OPEN" }],
    "items": [{ "ticketId": 42, "ticketNumber": "380005", "summary": "Adapter failure", "status": "OPEN", "itPriority": "HIGH", "updatedAt": "2026-10-29T10:31:00.000Z", "href": "/tickets/42" }],
    "meta": { "timezone": "UTC", "from": null, "to": null }
  }
}
```

Metrics are calculated by the backend from authoritative Ticket rows. Zero matches return value `0` and an empty items list. No dashboard endpoint returns an unbounded Ticket collection.

Staff dashboard queue drill-downs reuse the Lab 3 queue query contract. The existing `assigneeId` query key maps to the database's `Ticket.ownerId`: `assigneeId=me` resolves to the authenticated user's `ownerId`, `assigneeId=unassigned` resolves to `ownerId IS NULL`, and numeric IDs retain the existing queue behavior. No client-supplied `ownerId` or arbitrary performer identity is trusted.

## 4. Ticket status workflow

`PATCH /staff/tickets/:ticketId/status` accepts `{ "status": TicketStatus, "confirm"?: true, "resolutionActionId"?: number, "version"?: number }`. IT Staff and Administrators may use the matrix below; Requesters never may. For `RESOLVED` and `CLOSED`, `resolutionActionId` must identify an Action with `state=COMPLETED`, non-empty description/result, completion audit fields, and no outstanding `followUpRequired=true` Action lacking `followUpResolvedAt`.

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

Unlisted or terminal transitions return `409 CONFLICT` and leave the row unchanged. The backend locks or atomically predicates the update and returns `409 CONFLICT` for a stale `version`/`updatedAt`.

## 5. Shared status and authorization codes

`200` represents successful reads/updates, `201` a created Action, `400 VALIDATION_ERROR` invalid fields/query, `401 UNAUTHENTICATED` absent/expired session, `403 FORBIDDEN` role/ownership denial, `403 PASSWORD_CHANGE_REQUIRED` restricted first-login session, `404 NOT_FOUND` safe missing/unauthorized resource, `409 CONFLICT` invalid transition/duplicate/stale update, and `500 INTERNAL_ERROR` unexpected failure. `ACCOUNT_INACTIVE` is returned only after a valid password for an inactive account, as required by Lab 3.

## 6. Migration and compatibility

The migration preserves existing Ticket, User, Attachment, PublicComment, InternalNote, category, system, and counter identifiers. Legacy Tickets with no Actions return an empty action list and remain valid dashboard inputs. Existing Lab 2/3 authentication, ownership, CSRF, and safe error contracts remain authoritative; no requester selector or client-supplied identity is reintroduced.
