# TokTickIT UI rework inventory

Updated 2026-11-01 during the conformance pass. The earlier plan at `1cfa768860691c93e8349dff5e217f103cf992ce` precedes this implementation; this inventory records maintained decisions rather than claiming a new pre-implementation timestamp.

## Screens and permissions

| Surface | Permitted actor | Primary task and preserved boundary |
|---|---|---|
| Login and Change Password | Signed-out users; password-gated authenticated users | Valid/invalid/inactive login, first-login gate, password visibility, retry and logout; authenticated screens remain unavailable until the gate completes |
| Home and Create Ticket | Requester | System/category check and request creation with category/system/priority, required fields, attachments, validation and success feedback |
| Requester Dashboard and My Tickets | Requester | Ownership-scoped metrics, drill-down filters, search/sort/pagination, recent/attention-required tickets |
| Requester Ticket Detail | Owning requester | Attachment upload/download/soft removal, public comments, resolution indication, read-only Actions Taken; no staff notes or action mutations |
| Staff Dashboard and My Actions | IT Staff and Administrator | Server-calculated counts, exact metric links, current-user Action filter, recent ticket links; the presentation board is a bounded snapshot, not a replacement queue |
| Ticket Queue and Staff Ticket Detail | IT Staff and Administrator | Filtering/sorting/pagination, claim/reassign, priority/status operations, public replies versus internal notes, Actions Taken and resolution evidence |
| User Management | Administrator only | Search/filter/create/edit/activation/password reset, duplicate/inactive/last-admin protection and safe errors |

## Checkable design contract

- Continue the Lab 2 Zen Green token values and the Lab 3/4 screen/authorization contracts. Keep the chosen full-screen layout, readable sans-serif typography, continuous corners and restrained interaction effects.
- Preserve role entry pages: Requester Home, Staff Queue and Administrator User Management. Give all roles the same sidebar/toolbar shell, explicit Dashboard access, visible account context, and logout.
- Viewports: mobile 390x844 and 320x568, tablet 768x1024 and 991x900, desktop 992x900 and 1440x900. At every width, fields and controls reflow without page-level horizontal overflow. Tables may scroll inside their component; mobile uses a single card representation.
- A mobile navigation disclosure has a labeled toggle, `aria-expanded`, `aria-controls`, inert closed links, Escape/backdrop/selection dismissal, focus restoration and available logout. Desktop sidebar and toolbar remain reachable while the page scrolls.
- Inter is bundled locally with its license. Use the existing 24/18/15/14/12px hierarchy. Use native squircle enhancement with a rounded fallback and keep true circles/capsules. Reduced motion disables transform effects.
- Backend counts and permissions remain authoritative. Snapshot lane counts explicitly cover only returned recent records; no fake production metrics, synthetic trends, notification services, or new workflow rules are introduced.

## Content-state contract

| State | Trigger | Visible feedback and next action |
|---|---|---|
| Loading | Session, dashboard, ticket/list or form reference request pending | Stable heading, status/live feedback; mutation buttons disabled only while their request is pending |
| Empty/no-results | Valid zero metric/list response or filters with no matches | Zero values, explicit empty text and appropriate queue/create/clear-filter action |
| Error | Network/API failure | Specific error, retry path and preserved unsent form content |
| Partial | One independent section fails, such as reference data or Action history | Available ticket/queue information remains visible; failed section identifies its own retry action |
| Success | Auth, create/update/delete-indication succeeds | Saved data or success/live feedback and relevant next action |
| Permission | Wrong role, ownership denial, inactive identity or password gate | Explicit server-enforced denial or login/password boundary; forbidden controls absent from requester views |

## Evidence and release boundary

Current results and source binding belong in [verification.md](verification.md). Earlier release screenshots and tests describe their original revision. The local rework must receive peer approval and teammate merge, followed by final main/PDF/Kanban verification, before its delivery is marked complete.
