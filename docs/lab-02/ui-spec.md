# Lab 2 Zen Green UI Specification

## 1. Overview & Design Philosophy
TokTickIT Lab 2 establishes the **Zen Green Theme**, a cohesive, professional, and accessible design system for enterprise IT service desks. All screens in Lab 2 and subsequent labs strictly reuse these component primitives, color tokens, and layout guidelines.

---

## 2. Color Tokens & Style Variables

| Token Name | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | Application header, primary action buttons, strong brand emphasis |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus rings, link hover states, subheaders |
| **Pale Green** | `#EAF6EF` | Selected rows, subtle section highlights, success container background |
| **Page Background** | `#F5F7F6` | Default body/page canvas background |
| **Surface / Card** | `#FFFFFF` | Form cards, table containers, modal surfaces with subtle shadow |
| **Text Primary** | `#1B2E24` | Dark charcoal-green for high-contrast, comfortable typography |
| **Text Secondary** | `#52665A` | Subtitles, helper text, table column headers, timestamps |
| **Border Neutral** | `#D1DDD6` | Form input borders, table row dividers, card borders |
| **Read-Only Shading**| `#EEF3F0` | Distinct background for non-editable input fields |
| **Error Dark Red** | `#C53030` | Validation error text, field error borders, destructive actions |
| **Error Background**| `#FFF5F5` | Inline error alert container background |
| **Warning / Priority**| `#D69E2E` | Medium/High priority badges, disclaimer banners |
| **Urgent Priority** | `#E53E3E` | Urgent priority badge |
| **Low Priority** | `#319795` | Low priority badge |

---

## 3. Typography & Spacing System
- **Font Family:** System UI font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
- **Headings:**
  - `H1 / Page Title`: 24px (1.5rem), Semi-Bold (600), `#1B2E24`
  - `H2 / Section Title`: 18px (1.125rem), Semi-Bold (600), `#006B3C`
  - `H3 / Card Subtitle`: 15px (0.9375rem), Medium (500), `#52665A`
- **Body & Controls:**
  - Standard text: 14px (0.875rem), Regular (400), line-height 1.5
  - Small / Helper text: 12px (0.75rem), Regular (400), line-height 1.4
- **Spacing Scale:**
  - Inputs: Standard height 38px, padding 6px 12px, border-radius 4px
  - Form groups: Vertical spacing 16px between controls
  - Card padding: 24px desktop, 16px mobile

---

## 4. Component Rules & Control States

### 4.1 Input Fields & Dropdowns
- **Editable Field:** White background (`#FFFFFF`), neutral border (`#D1DDD6`), focus ring in Secondary Green (`#0B7A46`, 2px glow).
- **Read-Only / Disabled Field:** Soft gray-green shading (`#EEF3F0`), text color `#52665A`, cursor `not-allowed`.
- **Invalid Field:** Red border (`#C53030`), red validation message immediately below the field.
- **Required Marker:** A prominent red asterisk (`*`) follows the field label.

### 4.2 Button Hierarchy
- **Primary Button (`btn-zen-primary`):** Solid `#006B3C`, white text, hover `#0B7A46`. Used for primary actions (`[Submit Ticket]`, `[Continue]`).
- **Secondary Button (`btn-zen-secondary`):** White background, border `#006B3C`, text `#006B3C`. Used for `[Cancel]`, `[Back to My Tickets]`.
- **Destructive Button (`btn-zen-danger`):** Soft red background `#FFF5F5`, border `#C53030`, text `#C53030`. Used for `[Remove Attachment]`.
- **Busy State:** Disabled (`opacity: 0.65`, `pointer-events: none`) with an animated inline spinner and text (e.g., `Submitting...`).

### 4.3 Badges & Status Indicators
- **Status Badge:**
  - `NEW`: Light green pill (`#EAF6EF`, text `#006B3C`, border `#C3E6CB`).
- **Priority Badges:**
  - `LOW`: Light teal pill (`#E6FFFA`, text `#234E52`).
  - `MEDIUM`: Light amber pill (`#FEFCBF`, text `#744210`).
  - `HIGH`: Light orange pill (`#FEEBC8`, text `#7B341E`).
  - `URGENT`: Light red pill (`#FED7D7`, text `#742A2A`).

---

## 5. Screen Layouts & Specifications

### 5.1 Development Requester Selection Screen
- **Container:** Centered card (max-width 560px), subtle shadow.
- **Elements:**
  - Screen title: "Select Development Requester"
  - Explanatory subtitle: "Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen."
  - Requester dropdown populated with active users.
  - Informational banner: "Authentication coming in Lab 3".
  - Actions: `[Cancel]` and `[Continue]`.

### 5.2 Application Shell & Navigation Header
- **Top Bar:** Background `#006B3C`, white text, height 56px.
- **Brand:** "TokTickIT" logo and title.
- **Nav Links:** `[My Tickets]` and `[+ Create Ticket]` with active underline/pill highlight.
- **Requester Identity & Switcher:** Right-aligned user badge displaying active requester name and a clickable `[Change Requester]` action.

### 5.3 Create Ticket Screen
- **Layout:** Centered card container (max-width 900px).
- **Structure:**
  1. **Header Section:** System-generated Ticket Date (read-only), Requester Name (read-only).
  2. **Classification Section:** Category dropdown (required), Related System dropdown (required), Requested Priority (radio/dropdown).
  3. **Problem Details:** Summary input (required, 5-150 chars), Description textarea (required, 10-2000 chars).
  4. **Attachment Dropzone:** File picker accepting JPG/PNG/WEBP/PDF <= 5MB (max 5 files), list of selected files with remove action.
  5. **Footer Actions:** `[Cancel]` button (returns to My Tickets) and primary `[Submit Ticket]` button.

### 5.4 My Tickets Screen
- **Top Controls:** Search bar (search by summary or ticket number), Filter dropdowns (Category, Priority, Status), `[Clear Filters]` button, and prominent `[+ Create Ticket]` button.
- **Desktop Table View:**
  - Columns: Ticket No., Created Date, Summary, Category, Requested Priority, Current Status, Actions.
  - Sorting: Sort indicators on column headers.
- **Mobile Card View (< 768px):**
  - Tickets displayed as distinct responsive cards with title, status pill, category badge, and creation date.
- **States:**
  - **Loading:** Table skeleton rows.
  - **Empty State:** Friendly graphic/message: "No tickets found. You have not submitted any IT support tickets yet." with `[Create Your First Ticket]` CTA.
  - **No Results State:** "No matching tickets found for the selected search and filter criteria." with `[Clear Filters]` button.
- **Pagination:** Bottom control with previous/next buttons and page numbers.

### 5.5 Requester Ticket Detail Screen
- **Layout:** Read-only ticket summary card with section division.
- **Header:** Back button (`<- Back to My Tickets`), Ticket Number (`TKT-YYYY-XXXXXX`), Status badge (`NEW`).
- **Metadata Grid:** 2-column key-value grid (Ticket Date, Requester, Category, Related System, Requested Priority).
- **Content:** Summary (bold), Description (pre-wrap text container).
- **Attachment Section:**
  - List of active attachments with filename, file size, upload date, `[Download]` button, and `[Remove]` button.
  - List of soft-removed attachments (grayed out) showing filename, removal reason, removed timestamp, with download disabled.
  - `[+ Add Attachment]` action for uploading additional files.
  - Soft-removal confirmation modal requiring removal reason before proceeding.

---

## 6. Responsive Breakpoint Rules

| Breakpoint | Width Range | Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | $\ge$ 992px | Multi-column grid, full table view, side-by-side classification fields |
| **Tablet** | 768px - 991px | 2-column form grid, condensed table with horizontal scrolling |
| **Mobile** | < 768px | 1-column vertically stacked fields, card-based ticket list, full-width buttons |

---

## 7. Visual Inspection & Screenshot Artifact Paths
- `artifacts/lab-02/screenshots/create-ticket/`
  - `01_initial_form.png`
  - `02_validation_errors.png`
  - `03_invalid_attachment.png`
  - `04_submitting_busy.png`
  - `05_creation_success.png`
- `artifacts/lab-02/screenshots/my-tickets/`
  - `01_ticket_list_desktop.png`
  - `02_search_and_filter.png`
  - `03_pagination.png`
  - `04_empty_state.png`
  - `05_mobile_card_view.png`
- `artifacts/lab-02/screenshots/ticket-detail/`
  - `01_ticket_detail_readonly.png`
  - `02_attachment_list.png`
  - `03_soft_removal_modal.png`
  - `04_soft_removed_state.png`
