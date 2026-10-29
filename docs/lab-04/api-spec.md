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
  "performedBy": { "id": 7, "displayName": "Staff User", "role": "IT_STAFF" },
  "followUpRequired": true,
  "followUpNote": "Recheck after the next maintenance window",
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
| PATCH | `/tickets/:ticketId/actions/:actionId` | IT Staff or Administrator + CSRF | Body contains editable fields plus `version` (or `updatedAt`) precondition. Returns `200` with the new version or `409 CONFLICT` without mutation. |

Action creation returns `400 VALIDATION_ERROR` for missing/invalid fields, `403 FORBIDDEN` for a disallowed role, `404 NOT_FOUND` for a missing/unauthorized Ticket, `409 CONFLICT` for duplicate idempotency or stale state, and `500 INTERNAL_ERROR` only for an unexpected safe failure.

## 3. Dashboard endpoints

| Method | Path | Authorization | Contract |
|---|---|---|---|
| GET | `/dashboard/requester` | Authenticated REQUESTER | Returns owned-ticket metrics and a bounded recent/attention list with safe detail links. Supports documented UTC date boundaries. |
| GET | `/dashboard/staff` | IT_STAFF or ADMIN | Returns unassigned, current-owner, status/priority, and recent/urgent metrics plus bounded drill-down items. |
| GET | `/dashboard/admin` | ADMIN | Returns the staff dashboard contract and optional concise account counts; never returns passwords/session data. |

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

## 4. Ticket status workflow

`PATCH /staff/tickets/:ticketId/status` accepts `{ "status": TicketStatus, "confirm"?: true, "resolutionActionId"?: number, "version"?: number }`. IT Staff and Administrators may use the matrix below; Requesters never may.

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
