# Lab 2 Test Plan and Results

## 1. Test Strategy
The testing strategy for Lab 2 guarantees complete functional correctness, multi-user data isolation, boundary validation, and responsive UI behavior through five distinct testing layers:
1. **Unit Testing:** Validates pure business logic functions (e.g., Ticket Number generator formatting, attachment size/MIME validators).
2. **API Integration Testing (Supertest + Vitest):** Verifies all backend endpoints, HTTP status codes, payload structures, database persistence, and ownership enforcement.
3. **Frontend UI Component Testing (React Testing Library + Vitest):** Verifies screen rendering, component state changes (idle, busy, success, error), form validation messages, and user interactions with mocked API services.
4. **Responsive & Visual Checks (Checklist):** Confirms layout integrity and visual tokens across Desktop (>= 992px), Tablet (768-991px), and Mobile (< 768px).
5. **End-to-End Testing (Playwright):** Simulates realistic user journeys from Development Requester selection to ticket submission, list filtering, and attachment management.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **API-01** | API | AC-01, FR-01 | `GET /api/requesters` active list | Returns 200 with list of active requesters only; inactive excluded | `server/tests/lab-02/requesters.api.test.ts` | Planned |
| **API-02** | API | AC-04, FR-03, BR-01 | `POST /api/tickets` valid creation | Returns 201 with saved ticket, generated `TKT-YYYY-XXXXXX`, status `NEW` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03** | API | AC-03, BR-05 | `POST /api/tickets` validation errors | Returns 400 with field-specific errors when summary/description invalid | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | AC-05, BR-06 | `POST /api/tickets` attachment upload | Successfully stores uploaded files and saves attachment records | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-05** | API | AC-06, FR-06, BR-08 | `GET /api/tickets` requester ownership | Returns only tickets belonging to requester in `x-requester-id` header | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-06** | API | AC-07, FR-07 | `GET /api/tickets` search and filters | Correctly filters by category, priority, status, and search query | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | AC-07, FR-07 | `GET /api/tickets` pagination | Returns requested page/limit with total count and page metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | API | AC-08, FR-08, BR-08 | `GET /api/tickets/:id` owned detail | Returns 200 with ticket data and attachment list for owner | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-09** | API | AC-10, BR-08 | `GET /api/tickets/:id` cross-owner access | Returns 403 Forbidden or 404 when requester attempts to view another user's ticket | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-10** | API | AC-09, FR-09, BR-06 | `POST /api/tickets/:id/attachments` upload | Adds valid attachment to owned ticket within 5-attachment limit | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-11** | API | AC-09, FR-11, BR-07 | `DELETE /api/attachments/:id` soft removal | Sets `isDeleted=true`, stores reason, blocks subsequent download | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-12** | API | AC-09, FR-10, BR-07 | `GET /api/attachments/:id/download` deleted file | Returns 404/410 when attempting to download soft-removed attachment | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, FR-01 | Development Requester selector screen | Renders dropdown of active requesters, disclaimer banner, continue button | `client/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-02** | UI | AC-02, FR-01 | Requester Context & Header switcher | Displays selected requester name in header, opens selector modal on change | `client/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-03** | UI | AC-03, BR-05 | Create Ticket form client validation | Shows red inline error messages when submitting empty required fields | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | UI | AC-04, FR-03, BR-09 | Create Ticket submission & busy state | Submit button disables and shows spinner while processing request | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | UI | AC-05, BR-06 | Create Ticket file upload validation | Rejects files >5MB or unsupported MIME types with clear error message | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-06** | UI | AC-06, AC-07, FR-06 | My Tickets list, filters & empty state | Renders ticket table/cards, search bar, filters, and empty state | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-07** | UI | AC-08, FR-08 | Ticket Detail read-only layout | Renders all ticket metadata in read-only format without editable inputs | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| **UI-08** | UI | AC-09, FR-11 | Attachment soft-removal modal | Requires non-empty reason before confirming soft-removal | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01 - AC-07 | End-to-end requester ticket flow | Complete flow: select requester -> create ticket -> find in My Tickets -> view detail | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Covered Automated Tests | Verification Scope |
| :--- | :--- | :--- |
| **AC-01** (Requester Initialization) | API-01, UI-01, E2E-01 | Selector view displays active requesters on initial visit |
| **AC-02** (Context Persistence) | UI-02, E2E-01 | Header displays current requester and persists identity |
| **AC-03** (Form Validation) | API-03, UI-03 | Missing required fields prevent submission and show inline errors |
| **AC-04** (Ticket Creation) | API-02, UI-04, E2E-01 | Ticket saved with status `NEW` and unique Ticket Number |
| **AC-05** (Attachment Validation) | API-04, UI-05 | File size <=5MB and permitted MIME type enforcement |
| **AC-06** (Multi-Tenant Isolation) | API-05, UI-06, E2E-01 | Requesters can only view tickets they own |
| **AC-07** (Search & Filtering) | API-06, API-07, UI-06 | Multi-criteria querying and pagination on ticket list |
| **AC-08** (Read-Only Detail) | API-08, UI-07, E2E-01 | Detail view displays non-editable ticket fields |
| **AC-09** (Attachment Soft-Removal) | API-11, API-12, UI-08 | Soft removal records reason and prevents download |
| **AC-10** (Cross-Owner Security) | API-09 | Unauthorized detail access returns 403 Forbidden |

---

## 4. Responsive and Visual Checklist

- [ ] **Zen Green Color Palette:** Header uses `#006B3C`, hover/active accents use `#0B7A46`, pale background uses `#EAF6EF`, body uses `#F5F7F6`.
- [ ] **Typography & Spacing:** Standardized font scale, consistent form input heights (38px), labels positioned above controls with red asterisk markers.
- [ ] **Button Hierarchy:** Primary green buttons for main actions, outline buttons for secondary actions, amber for warnings, red for destructive soft-removal.
- [ ] **Desktop Viewport (>= 992px):** Centered layout with max-width container, multi-column form, full data table with sortable headers.
- [ ] **Tablet Viewport (768px - 991px):** Two-column form layout, responsive table layout with horizontal scrolling or condensed columns.
- [ ] **Mobile Viewport (< 768px):** Single-column stacked form, ticket cards replacing table rows, touch-friendly buttons >= 44px height.
- [ ] **No Visual Defects:** No clipped text, overlapping elements, or unexpected horizontal scrollbars at any breakpoint.

---

## 5. Test Commands

### Run Backend API Tests
```bash
cd server
npm test
```

### Run Frontend UI Tests
```bash
cd client
npm test
```

### Run End-to-End Tests
```bash
npx playwright test
```

---

## 6. Final Results
*(Will be updated upon completion of implementation with empirical test execution output logs)*

---

## 7. Known Limitations or Deferred Tests
- Authentication and session token tests are explicitly deferred to Lab 3.
- IT Staff workflow tests (reassignment, status transitions beyond `NEW`) are out of scope for Lab 2.
