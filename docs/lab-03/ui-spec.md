# Lab 3 UI Specification

Status: Draft contract for peer review before implementation

## Design foundation

Continue the Lab 2 Zen Green visual language: dark neutral surfaces, green success/accent states, readable contrast, consistent focus rings, shared buttons/inputs/tables, and no horizontal overflow. Reuse existing tokens and components rather than introducing a second visual system.

Breakpoints: desktop at 992px and above, tablet 768–991px, mobile below 768px. At every breakpoint content must reflow without clipping or overlap. Tables become stacked cards or scroll within the component only when required; the page itself must not overflow horizontally.

## Application shell and navigation

- Unauthenticated users see Login only.
- Authenticated users see a role-specific navigation and the current display name/role.
- Requester navigation: Create Ticket, My Tickets.
- IT Staff navigation: Ticket Queue, Ticket Detail when selected.
- Administrator navigation: User Management plus Ticket Queue/Ticket Detail because the approved authorization matrix explicitly grants Admin Ticket operations; Requester views remain available only where the matrix permits them.
- Logout is always available. A must-change-password banner/gate takes priority over normal navigation.

## Login screen

Fields: email and password, show/hide password control, submit button, and an inline error region. States: idle, submitting, invalid credentials, inactive account after credential verification, network failure with retry, and success redirect. Keyboard focus order and visible focus styles are required. At mobile width the form is single-column and full-width.

## Change-password screen

Fields: current password, new password, confirm new password, password-policy hint, and submit. States: idle, validation error, submitting, incorrect current password, server failure, and success. The route cannot be bypassed while mustChangePassword is true.

## Requester regression screens

Create Ticket and My Tickets retain Lab 2 behavior with authenticated identity. Ticket Detail remains read-only for ticket fields, adds public comments and a Problem appears resolved control, and keeps attachment upload/download/soft-remove ownership rules. Requesters never see internal notes, assignee controls, or staff-only statuses.

Required states include loading, empty/no-results, API failure with retry, validation, submitting, success, and inactive/deauthenticated session redirect.

## IT Staff Ticket Queue

Provide a heading, search field, status, IT-priority, assignee, and category filters, sortable result columns/cards, page-size and page navigation controls, result count, and a responsive ticket list. Search, filter, sort, and pagination values must match the API contract, including clear invalid-query feedback. Each row/card shows ticket number, subject/summary, requester, status, IT priority, assignee, and updated time. States: loading skeleton, empty queue, no-results, invalid-query, API error/retry, and populated queue. Selecting a ticket opens Staff Ticket Detail.

## IT Staff Ticket Detail

Show ticket identity, requester, metadata, current status, IT priority, assignee, claim/reassign controls, allowed status actions, public comments, and internal notes. Distinguish public comments and notes visually and semantically; show the author and creation time supplied by the backend. Disable or hide invalid transitions, but rely on server authorization for enforcement. Require confirmation for transitions marked in the matrix and show conflict/error feedback without losing unsent text.

## Administrator User Management

Show user list with search and optional role filter, plus create/edit form. Rows/cards show display name, email, role, active state, and must-change-password state. Creation and editing validate one permitted role, activation state, duplicate email, self-deactivation, and last-active-Admin safety. Actions: create, edit, activate/deactivate, and set initial password. States: loading, empty, no-results, validation, duplicate-email conflict, forbidden, server failure/retry, and success confirmation. Do not render password values or session information.

## Accessibility and responsive acceptance

- All controls have accessible labels and keyboard operation.
- Error text is associated with its field and announced in a live region when appropriate.
- Focus remains visible after dialogs, mutations, and responsive layout changes.
- At desktop, tablet, and mobile widths there is no page-level horizontal overflow, clipped text, or overlapping controls.
- Screenshot evidence must cover authentication, staff queue, staff detail, and user management at representative desktop/tablet/mobile widths.
