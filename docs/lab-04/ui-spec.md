# Lab 4 UI Specification

Status: Draft companion contract for Issue #51. This document defines the visible behavior before implementation and extends the Lab 2/3 Zen Green system.

## 1. Shared visual and responsive rules

- Reuse existing Zen Green tokens and shared controls. Do not introduce a second visual language.
- Desktop: `>= 992px`; tablet: `768–991px`; mobile: `< 768px`.
- The page itself never scrolls horizontally. Tables become stacked cards or scroll only inside an intentionally bounded component.
- Use readable contrast, a visible two-pixel focus ring, semantic headings, labels above controls, and non-color status cues.
- Shared states are loading, empty/no-results, validation, submitting, success, forbidden, not-found, conflict, and retryable failure. Preserve entered form values after recoverable API failures.

## 2. Authenticated shell and navigation

The shell shows the authenticated display name and role, a clear active-page indicator, role-permitted links, and logout. Requesters see Dashboard, My Tickets, and allowed Ticket Detail. IT Staff see Dashboard, Staff Queue, and Ticket Detail. Administrators additionally see User Management while retaining staff capabilities. A first-login password-change gate takes precedence over normal navigation, and direct protected URLs after logout return to Login without exposing protected data.

## 3. Requester Dashboard

### Structure

Use four concise metric cards: Open Tickets, Waiting for Requester, Recently Updated, and Recently Resolved. Below the cards, show a short attention/recent list with ticket number, summary, status, last update, and an accessible link to Ticket Detail.

### Behavior

- All data is for the authenticated requester only; the UI never accepts a requester selector.
- A card with zero matches shows `0` and a clear empty message; links preserve the selected filter.
- Loading uses skeletons or an equivalent labeled busy state. API failures show a retry action without clearing known form data.
- Desktop uses a four-card row and two-column list where space permits; tablet wraps cards; mobile stacks cards and list rows.

## 4. IT Staff Dashboard

### Structure

Show Unassigned Tickets, My Owned Tickets, In-Progress/Waiting work, Recently Updated, and My Actions Taken. The My Actions Taken card is the count of Actions whose `performedById` is the authenticated staff user and whose `actionDateTime` is in the documented recent window; it links to the Action-filtered `/staff/actions` view defined in the API contract. Include a recent/urgent list with status, IT Priority, owner, update time, and links to Staff Queue or Ticket Detail. Administrator may reuse this view.

### Behavior

Metric labels include the time boundary where relevant. Drill-down links carry safe status, owner, or priority filters to the queue. Empty, forbidden, not-found, conflict, and retry states are explicit. Counts must match the backend query rather than client-side filtering.

### Metric query contract

All windows use UTC and are inclusive at `from` and exclusive at `to`; `now` is the server evaluation time. The drill-down link in the last column must apply the same predicate as the metric.

| Dashboard | Metric | Exact predicate | Drill-down |
|---|---|---|---|
| Requester | Open Tickets | `ticket.requesterId = session.userId` and `status IN (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED)` | `/my-tickets?currentStatuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED` |
| Requester | Waiting for Requester | `ticket.requesterId = session.userId` and `status = WAITING_FOR_REQUESTER` | `/my-tickets?currentStatus=WAITING_FOR_REQUESTER` |
| Requester | Recently Updated | `ticket.requesterId = session.userId` and `updatedAt >= now-7d` and `updatedAt < now` | `/my-tickets?updatedFrom=<now-7d>&updatedTo=<now>` |
| Requester | Recently Resolved | `ticket.requesterId = session.userId` and `status IN (RESOLVED, CLOSED)` and `updatedAt >= now-7d` and `updatedAt < now` | `/my-tickets?currentStatuses=RESOLVED,CLOSED&updatedFrom=<now-7d>&updatedTo=<now>` |
| Staff/Admin | Unassigned Tickets | `ticket.ownerId IS NULL` and `status IN (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, REOPENED)` | `/staff/queue?assigneeId=unassigned&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,REOPENED` |
| Staff/Admin | My Owned Tickets | `ticket.ownerId = session.userId` and `status IN (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, REOPENED)` | `/staff/queue?assigneeId=me&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,REOPENED` |
| Staff/Admin | In-Progress/Waiting | `status IN (IN_PROGRESS, WAITING_FOR_REQUESTER)` and ticket is accessible to the role | `/staff/queue?statuses=IN_PROGRESS,WAITING_FOR_REQUESTER` |
| Staff/Admin | Recently Updated | `updatedAt >= now-7d` and `updatedAt < now` and ticket is accessible to the role | `/staff/queue?updatedFrom=<now-7d>&updatedTo=<now>` |
| Staff/Admin | My Actions Taken | `action.performedById = session.userId` and `action.actionDateTime >= now-30d` and `action.actionDateTime < now` | `/staff/actions?performedBy=me&from=<now-30d>&to=<now>` |

Each drill-down preserves the predicate server-side. The Staff Queue uses the existing `assigneeId` query key: `me` resolves to the authenticated user and `unassigned` resolves to `Ticket.ownerId IS NULL`; arbitrary client-supplied identity values are rejected. The `/staff/actions` view accepts only `performedBy=me` and applies the authenticated session plus the UTC date window on the server. A zero count renders `0` and an explicit empty state; it never falls back to a client-side approximation.

## 5. Actions Taken on Ticket Detail

### Read-only requester mode

Requesters see all Actions Taken for their own Ticket in stable chronological order. Each row shows action date/time, description, result, performer display name/role, follow-up status/note, and attachment notes. Create and edit controls are absent and the backend still enforces read-only access.

### Staff/admin mode

Authorized staff and administrators see the same history plus a clearly labeled Create Action button and Edit controls. The form contains:

- Action Date/Time (required, timezone-aware)
- Action Description (required, trimmed 10–2,000 characters)
- Result (required, trimmed 1–2,000 characters)
- Assignee (optional; active IT Staff/Admin users only)
- Follow-Up Required? (required boolean)
- Follow-up Note (required, trimmed 1–2,000 characters when follow-up is true)
- Attachment Notes (optional, trimmed 1–2,000 characters when supplied)

The performer field is displayed as read-only authenticated identity. Staff/admin mode also shows state (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), assignee, and the allowed transition controls. Assignee choices include only active IT Staff/Admin users; an inactive selection receives a field error and never changes the Action. Completing or cancelling records the authenticated performer and server timestamp and then disables terminal controls. Each new logical create uses a client-generated UUID idempotency key; retries reuse that key until success, then a new create gets a new key. Submitting disables duplicate clicks, preserves the form and key on recoverable failure, and refreshes the list after success. Editing shows the current version and reports a conflict if the server rejects a stale update. A labeled View Edit History control opens a read-only chronological timeline of prior field values, version, editor, and time; all roles permitted to read the Action may inspect it. A COMPLETED Action with an outstanding follow-up shows a Resolve Follow-Up control for active authorized Staff/Admin users; success updates the resolution audit/version and history while the Action remains COMPLETED. The Ticket status control identifies every outstanding Action and remains blocked until all follow-ups are resolved.

Public/shared content and internal-only content use text labels and badges, not color alone. Long descriptions wrap; no control overlaps at any breakpoint.

## 6. Ticket workflow and resolution gate

Status controls show only transitions allowed by the current status and role. RESOLVED, CLOSED, REOPENED, and CANCELLED display a confirmation message; RESOLVED/CLOSED additionally state the required resolution evidence. On success, the Ticket summary and dashboard counts refresh. On conflict or forbidden response, the selected status remains unchanged and the error is associated with the control.

## 7. Accessibility checklist

- Every input, button, link, status selector, and metric card has an accessible name.
- Keyboard users can reach, operate, and escape dialogs/forms in logical order; focus returns to the initiating control after a close.
- Validation messages are tied to their fields; mutation success/failure is announced in a live region.
- Busy states expose `aria-busy` or equivalent text and do not trap focus.
- Status, priority, follow-up, and visibility use text/icon labels in addition to color.
- At desktop, tablet, and mobile widths there is no clipped text, overlapping control, or page-level horizontal scrollbar.

## 8. Evidence checklist

The final release must include real screenshots for requester dashboard, staff dashboard, Actions Taken list/create/edit/read-only, workflow/resolution feedback, loading/empty/error/forbidden states, and representative desktop/tablet/mobile widths. Each screenshot is linked to the final commit and described in the nine-part PDF.
