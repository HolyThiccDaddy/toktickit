# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a robust, responsive Requester-facing IT Ticketing MVP for TokTickIT using the Zen Green design system. This increment enables simulated Development Requesters to submit support tickets with file attachments, view and manage their submitted tickets with search, filtering, and pagination, inspect read-only ticket details, and manage permitted attachments with soft-removal rules while enforcing strict multi-user ownership boundaries.

## 2. Stakeholder Request Interpretation
The IT department requires a full-stack, responsive web application for end-users (Requesters) to report IT incidents and service requests. The system must capture essential ticket metadata (summary, description, category, related system, requested priority, and attachments), automatically generate unique ticket identifiers, and provide self-service inquiry via "My Tickets" and "Ticket Detail" views. Because full authentication is scheduled for Lab 3, Lab 2 introduces a simulated Development Requester context to model and enforce tenant/user ownership across all API endpoints and frontend views.

## 3. Scope

### Included
- **Development Requester Simulation:** Selection screen to choose an active development requester identity, global React context, and persistent header display with switcher.
- **Reference Data Retrieval:** Endpoints for active categories, related systems, and active requesters.
- **Ticket Creation (Create Mode):** Form validation, automatic Ticket Number generation (`TKT-YYYY-XXXXXX`), file attachment upload (JPEG, PNG, WEBP, PDF up to 5MB, max 5 active attachments), and duplicate-submission prevention.
- **Ticket Inquiry (My Tickets):** Paginated listing of tickets owned by the active requester with full-text search, multi-field filtering (category, priority, status), column sorting, and responsive table/card layout.
- **Ticket Detail (View Mode):** Read-only presentation of ticket headers, classification, timestamps, and active/soft-removed attachments.
- **Attachment Management:** Uploading additional attachments to existing tickets, downloading active attachments, and soft-removing attachments with mandatory reason tracking.
- **Data Isolation & Ownership:** Enforced isolation preventing any requester from viewing, querying, creating, or modifying tickets or attachments belonging to another user.
- **Zen Green UI System:** Strict adherence to the specified color palette, typography, spacing, component hierarchy, responsive breakpoints (Desktop, Tablet, Mobile), and accessible state indicators.

### Excluded
- Real user authentication, password hashing, JWT/session management, and role-based access control (deferred to Lab 3).
- IT Staff workflow (ticket claiming, assignment, internal priority adjustment, status progression beyond `New`).
- Collaboration features (Public Comments, Internal Notes, Actions Taken).
- Advanced ticket lifecycle transitions (In Progress, Resolved, Closed, Reopened, Cancelled).
- Administrative user/system management interfaces.

---

## 4. Functional Requirements
- **FR-01 (Requester Selection):** The application must allow selection of an active development requester and maintain this identity throughout the session until switched.
- **FR-02 (Reference Data Loading):** The application must provide active Categories and Related Systems for populating ticket form dropdowns.
- **FR-03 (Ticket Submission):** The application must validate and submit ticket data with mandatory summary, description, category, related system, and priority, saving the ticket under the active requester's ID.
- **FR-04 (Ticket Number Generation):** The backend must generate a unique, sequential/formatted Ticket Number (e.g., `TKT-YYYY-XXXXXX`) for each created ticket.
- **FR-05 (Attachment Upload on Create):** The application must allow attaching up to 5 permitted files (JPG, PNG, WEBP, PDF <= 5MB each) during ticket creation.
- **FR-06 (My Tickets Listing):** The application must return and display only tickets belonging to the currently selected requester.
- **FR-07 (Search, Filter, Sort, Paginate):** My Tickets must support case-insensitive text search (summary, ticket number), filtering by category, requested priority, and status, multi-column sorting, and configurable pagination.
- **FR-08 (Ticket Detail View):** The application must display complete ticket details in read-only format for owned tickets.
- **FR-09 (Add Attachment to Existing Ticket):** A requester must be able to upload additional attachments to their existing ticket provided the active attachment limit (5) is not exceeded.
- **FR-10 (Download Attachment):** Active attachments must be downloadable via direct API stream.
- **FR-11 (Soft-Remove Attachment):** A requester must be able to soft-remove an active attachment by supplying a non-empty removal reason. Soft-removed attachments remain visible as metadata but cannot be downloaded.
- **FR-12 (Ownership Protection):** Direct API requests or URL navigation to tickets or attachments not owned by the active requester must return HTTP 403 Forbidden or 404 Not Found.

---

## 5. Business Rules
- **BR-01 (Ticket Number Format & Uniqueness):** Ticket numbers must be generated server-side following the pattern `TKT-YYYY-XXXXXX` (e.g., `TKT-2026-000001`) and must be globally unique.
- **BR-02 (Initial Ticket Status):** All newly created tickets must be initialized with status `NEW`.
- **BR-03 (Testing Context Limitation):** The Development Requester Selector is strictly a test fixture and must display an explicit disclaimer indicating that real authentication will be introduced in Lab 3.
- **BR-04 (Inactive Requester Filtering):** Inactive requesters must not appear in the Development Requester selection dropdown and cannot author new tickets.
- **BR-05 (Field Validation Constraints):**
  - `Summary`: Required, trimmed, minimum 5 characters, maximum 150 characters.
  - `Description`: Required, trimmed, minimum 10 characters, maximum 2000 characters.
  - `Category`: Required, must correspond to a valid active Category ID.
  - `Related System`: Required, must correspond to a valid active Related System ID.
  - `Requested Priority`: Required, must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **BR-06 (Attachment Constraints):**
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`.
  - Maximum size per file: 5,242,880 bytes (5 MB).
  - Maximum active attachments per ticket: 5.
- **BR-07 (Attachment Soft Removal):**
  - Removal is non-destructive (sets `deletedAt`, `isDeleted = true`, and stores `deletionReason`).
  - Removal reason is mandatory (trimmed, minimum 3 characters, maximum 255 characters).
  - Soft-removed attachments display metadata (filename, size, removal reason, timestamp) but download/preview endpoints must reject requests with HTTP 410 Gone or 404 Not Found.
- **BR-08 (Ownership Integrity):** Requesters can only view, list, and modify tickets and attachments where `requesterId` matches their active session identity. Cross-requester access attempts are strictly rejected with HTTP 403 Forbidden.
- **BR-09 (Duplicate Submission Prevention):** Frontend submit buttons must be disabled with a loading spinner while API requests are pending to prevent double submission.
- **BR-10 (Failure Data Preservation):** When ticket creation or API calls fail, form input values must be preserved in component state to prevent user data loss.
- **BR-11 (Attachment Upload Failure & Compensation Strategy):**
  - **Atomic Create Transaction:** When creating a ticket with attachments via `POST /api/tickets`, the backend performs strict validation of all files before committing to disk and database.
  - **Rollback on Error:** If file disk write fails or database record creation fails, any temporary files written for this request are immediately removed from disk, the database transaction is aborted, and no orphaned ticket or attachment record is created.
  - **Error Reporting:** The API responds with an appropriate HTTP error (400 for validation failure, 500 for storage failure) detailing the reason.
  - **User Experience:** Frontend retains all user-typed fields (summary, description, selections) and allows the user to correct attachments and re-submit immediately.
  - **Existing Ticket Attachment Failure:** When adding an attachment to an existing ticket via `POST /api/tickets/:id/attachments`, if the upload fails (e.g. disk full or invalid file), the existing ticket and prior attachments remain unchanged.

---

## 6. UI Specification Summary
- **Color Tokens:**
  - Header & Primary Actions: Primary Green (`#006B3C`)
  - Active Tabs, Accents, Hover: Secondary Green (`#0B7A46`)
  - Selected Items, Light Highlights: Pale Green (`#EAF6EF`)
  - Page Background: Near-White Soft Gray (`#F5F7F6`)
  - Text: Dark Charcoal-Green (`#1B2E24`)
  - Error: Crimson Red (`#C53030`) with light red background (`#FFF5F5`)
  - Warning/Priority: Amber Badge (`#D69E2E`)
- **Layouts & Responsiveness:**
  - **Desktop (>= 992px):** Multi-column form layouts, full data table with sortable headers, persistent header navigation.
  - **Tablet (768px - 991px):** Two-column stacked layout, condensed table with horizontal scroll or card view.
  - **Mobile (< 768px):** Single-column stacked layout, ticket cards instead of wide tables, full-width touch targets.
- **Component States:**
  - Initial/Idle, Loading (Skeleton/Spinner), Validating (inline field-level error messages), Success (Ticket confirmation modal/banner), and Error (API failure alert with retry option).

---

## 7. Data Changes (Prisma Schema)
- **`RequesterUser` Model:** `id`, `name`, `email`, `department`, `isActive`, `createdAt`, `updatedAt`, relation to `Ticket[]`.
- **`Category` Model:** `id`, `name`, `description`, `isActive`, `createdAt`, relation to `Ticket[]`.
- **`RelatedSystem` Model:** `id`, `name`, `description`, `isActive`, `createdAt`, relation to `Ticket[]`.
- **`Ticket` Model:** `id`, `ticketNumber` (unique, indexed), `summary`, `description`, `requestedPriority`, `currentStatus` (default: `NEW`), `requesterId` (FK, indexed), `categoryId` (FK, indexed), `relatedSystemId` (FK, indexed), `createdAt`, `updatedAt`, relations to `Attachment[]`.
- **`Attachment` Model:** `id`, `ticketId` (FK, indexed), `originalFilename`, `storageKey`, `mimeType`, `fileSize`, `isDeleted` (default: `false`), `deletionReason` (nullable), `deletedAt` (nullable), `uploaderId` (FK), `createdAt`.

---

## 8. API Contract Summary
- `GET /api/requesters` -> Returns active development requesters.
- `GET /api/categories` -> Returns active categories as array `Category[]` (preserving Lab 1 backward compatibility).
- `GET /api/related-systems` -> Returns active related systems.
- `POST /api/tickets` -> Creates a new ticket with automatic rollback on attachment failure.
- `GET /api/tickets` -> Returns paginated list of tickets owned by the requester (`x-requester-id` header).
- `GET /api/tickets/:id` -> Returns details of an owned ticket.
- `POST /api/tickets/:id/attachments` -> Adds an attachment to an owned ticket.
- `GET /api/attachments/:id/download` -> Streams file data for active attachments.
- `DELETE /api/attachments/:id` -> Soft-removes an attachment with reason payload.

---

## 9. Acceptance Criteria
- **AC-01 (Requester Context Initialization):** Given the user accesses the application without an active requester, when the application loads, then the Development Requester Selection screen is presented.
- **AC-02 (Requester Context Persistence):** Given an active requester is chosen, when navigating between pages, then the requester's name is displayed in the application header and requester-specific data is queried.
- **AC-03 (Ticket Form Validation):** Given a requester fills the Create Ticket form with empty or invalid summary/description, when submitting, then field-level validation errors are shown and the API is not invoked.
- **AC-04 (Successful Ticket Creation):** Given valid ticket fields and permitted attachments, when the requester submits, then a new ticket is saved in the database with status `NEW`, an official `TKT-YYYY-XXXXXX` number is generated, and a success confirmation is displayed.
- **AC-05 (Attachment File Validation & Rejection):** Given a file exceeding 5MB, unpermitted MIME type, or mismatched extension, when selected or submitted, then upload is blocked and an explicit error is returned.
- **AC-06 (My Tickets Multi-Tenant Ownership):** Given Requester A has created tickets, when Requester B is selected in the context, then Requester B cannot see any tickets belonging to Requester A in My Tickets.
- **AC-07 (Search & Filter in My Tickets):** Given a list of tickets, when filtering by Category or entering a search query, then only matching tickets owned by the active requester are returned.
- **AC-08 (Ticket Detail Read-Only View):** Given an owned ticket ID, when opened in Ticket Detail, then all ticket classification fields are presented as read-only.
- **AC-09 (Soft Removal with Reason):** Given an active attachment on an owned ticket, when the requester confirms removal with a valid reason, then the attachment is marked as deleted, retained in metadata, and download access is blocked.
- **AC-10 (Unauthorized Detail Access Prevention):** Given Requester A requests the Ticket Detail URL of a ticket owned by Requester B, then the backend rejects the request with HTTP 403 Forbidden and the UI displays an unauthorized access error.
- **AC-11 (Attachment Failure Compensation):** Given a ticket submission where attachment processing fails on the server, then the database transaction rolls back, temporary files are pruned, no orphaned ticket exists, and the user's form inputs are preserved.

---

## 10. Definition of Done
1. **Spec & Documentation:** All specifications, test plans, UI specifications, and API contracts committed in `docs/lab-02/`.
2. **Database & Migrations:** Prisma schema extended and migrated; seed script is idempotent and populates required reference data and test requesters.
3. **API Implementation:** All 9 endpoints implemented with comprehensive validation, ownership checks, and error handling.
4. **UI Implementation:** All screens (Requester Selector, Create Ticket, My Tickets, Ticket Detail, Attachments) styled according to Zen Green guidelines and verified responsive across Desktop, Tablet, and Mobile.
5. **Testing & Coverage:** Automated unit, integration, UI component, style, and E2E tests passing 100% with no skipped or flaky tests.
6. **Code Review:** Feature branch merged into `lab2-staging` via peer-reviewed Pull Requests with documented discussions and approvals.
7. **Release Integration:** `lab2-staging` merged into `main` via Release PR with clean test execution logs.

---

## 11. Assumptions and Decisions
- **Storage Strategy:** Attachments are stored locally on the server filesystem in an isolated `uploads/` directory with randomized UUID filenames to prevent collision and path traversal vulnerabilities.
- **Tenant Context Header:** In the absence of session authentication, the active development requester identity is passed in HTTP headers via `x-requester-id`.
- **Ticket Number Format:** Sequenced per current calendar year as `TKT-YYYY-XXXXXX` padded to 6 digits (e.g., `TKT-2026-000001`).
