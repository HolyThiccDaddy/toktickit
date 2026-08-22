# Lab 2 REST API Specification

## 1. Overview & Authentication Simulation
This document defines the complete REST API contract for TokTickIT Lab 2. All endpoints communicate using JSON payloads (except file upload and binary download endpoints).

Because full session/JWT authentication is scheduled for Lab 3, multi-user identity in Lab 2 is simulated using the request header:
```http
x-requester-id: <integer>
```
Backend handlers extract `x-requester-id` to identify the requesting tenant and strictly enforce data ownership. If the header is missing or references an invalid/inactive requester when accessing protected resources, the API responds with HTTP 401 Unauthorized or 403 Forbidden.

---

## 2. Standard Response & Error Envelopes

### 2.1 Standard Error Format
When an API validation or operational error occurs, the server responds with a structured error payload:
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "summary", "message": "Summary must be between 5 and 150 characters" }
  ]
}
```

---

## 3. API Endpoints

### 3.1 Get Active Categories (Preserving Lab 1 Contract)
- **Path:** `GET /api/categories`
- **Description:** Retrieves the active IT ticket classification categories as a direct JSON array, maintaining full backward compatibility with Lab 1 clients and regression tests.
- **Headers:** None required.
- **Responses:**
  - **200 OK:**
    ```json
    [
      { "id": 1, "name": "Account and Access" },
      { "id": 2, "name": "Hardware" },
      { "id": 3, "name": "Software" },
      { "id": 4, "name": "Network" }
    ]
    ```
  - **500 Internal Server Error:**
    ```json
    { "error": "Failed to fetch categories" }
    ```

---

### 3.2 Get Active Development Requesters
- **Path:** `GET /api/requesters`
- **Description:** Retrieves all active development requesters for selection in the UI. Inactive requesters are excluded.
- **Headers:** None required.
- **Responses:**
  - **200 OK:**
    ```json
    [
      {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.anderson@example.com",
        "department": "Human Resources",
        "isActive": true
      }
    ]
    ```
  - **500 Internal Server Error:**
    ```json
    { "error": "Failed to fetch requesters" }
    ```

---

### 3.3 Get Active Related Systems
- **Path:** `GET /api/related-systems`
- **Description:** Retrieves the active IT systems, platforms, and equipment list.
- **Headers:** None required.
- **Responses:**
  - **200 OK:**
    ```json
    [
      { "id": 1, "name": "Email", "description": "Corporate email services and webmail" },
      { "id": 2, "name": "Campus Wi-Fi", "description": "Wireless network connectivity across campus" },
      { "id": 3, "name": "VPN", "description": "Remote virtual private network access" },
      { "id": 4, "name": "LEB2 App", "description": "Learning environment platform" },
      { "id": 5, "name": "Grade Submission App", "description": "Academic grading system" },
      { "id": 6, "name": "Printer", "description": "Networked office and lab printers" },
      { "id": 7, "name": "Corporate Laptop", "description": "Standard issued employee laptop hardware" }
    ]
    ```
  - **500 Internal Server Error:**
    ```json
    { "error": "Failed to fetch related systems" }
    ```

---

### 3.4 Create Support Ticket
- **Path:** `POST /api/tickets`
- **Description:** Creates a new support ticket under the simulated requester identity. Supports multipart form data for uploading up to 5 initial attachments atomically.
- **Headers:** `x-requester-id: <id>` (Required)
- **Request Format:** `multipart/form-data` or `application/json`
  - `summary` (string, required, 5-150 chars)
  - `description` (string, required, 10-2000 chars)
  - `categoryId` (integer, required)
  - `relatedSystemId` (integer, required)
  - `requestedPriority` (enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`, required)
  - `files` (array of binary files, optional, max 5 files, <= 5MB each, JPEG/PNG/WEBP/PDF)
- **Compensation / Transaction Behavior:** If any file is invalid or storage fails, the database transaction is aborted, all temporary files are pruned, and no ticket is created.
- **Responses:**
  - **201 Created:**
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Cannot connect to VPN from home",
      "description": "Attempting to connect to VPN yields error code 800 since this morning.",
      "requestedPriority": "HIGH",
      "currentStatus": "NEW",
      "requesterId": 1,
      "categoryId": 4,
      "relatedSystemId": 3,
      "createdAt": "2026-08-22T08:00:00.000Z",
      "attachments": []
    }
    ```
  - **400 Bad Request:** Missing fields, text length violation, or invalid attachment file.
  - **401 Unauthorized / 403 Forbidden:** Missing or invalid `x-requester-id`.
  - **500 Internal Server Error:** Database or filesystem write failure.

---

### 3.5 List Requester's Tickets (My Tickets)
- **Path:** `GET /api/tickets`
- **Description:** Retrieves paginated tickets owned strictly by the requester in `x-requester-id`. Supports full-text search, filtering, sorting, and pagination.
- **Headers:** `x-requester-id: <id>` (Required)
- **Query Parameters:**
  - `search` (string, optional): Searches `ticketNumber` and `summary`.
  - `categoryId` (integer, optional): Filters by category.
  - `requestedPriority` (string, optional): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `currentStatus` (string, optional): `NEW`.
  - `sortBy` (string, optional, default `createdAt`): `createdAt`, `ticketNumber`, `summary`, `requestedPriority`.
  - `sortOrder` (string, optional, default `desc`): `asc`, `desc`.
  - `page` (integer, optional, default `1`).
  - `limit` (integer, optional, default `10`, max `50`).
- **Responses:**
  - **200 OK:**
    ```json
    {
      "tickets": [
        {
          "id": 101,
          "ticketNumber": "TKT-2026-000101",
          "summary": "Cannot connect to VPN from home",
          "requestedPriority": "HIGH",
          "currentStatus": "NEW",
          "createdAt": "2026-08-22T08:00:00.000Z",
          "category": { "id": 4, "name": "Network" },
          "relatedSystem": { "id": 3, "name": "VPN" }
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```
  - **401 Unauthorized / 403 Forbidden:** Missing or invalid `x-requester-id`.

---

### 3.6 Get Ticket Details
- **Path:** `GET /api/tickets/:id`
- **Description:** Retrieves full ticket details and associated attachments. Enforces strict ownership check.
- **Headers:** `x-requester-id: <id>` (Required)
- **Responses:**
  - **200 OK:**
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Cannot connect to VPN from home",
      "description": "Attempting to connect to VPN yields error code 800 since this morning.",
      "requestedPriority": "HIGH",
      "currentStatus": "NEW",
      "createdAt": "2026-08-22T08:00:00.000Z",
      "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 3, "name": "VPN" },
      "attachments": [
        {
          "id": 12,
          "originalFilename": "vpn_error.png",
          "fileSize": 245000,
          "mimeType": "image/png",
          "isDeleted": false,
          "deletionReason": null,
          "deletedAt": null,
          "createdAt": "2026-08-22T08:00:00.000Z"
        }
      ]
    }
    ```
  - **403 Forbidden:** Requester does not own this ticket.
  - **404 Not Found:** Ticket does not exist.

---

### 3.7 Add Attachment to Existing Ticket
- **Path:** `POST /api/tickets/:id/attachments`
- **Description:** Uploads and attaches a permitted file to an owned ticket.
- **Headers:** `x-requester-id: <id>` (Required)
- **Request Format:** `multipart/form-data` with `file` field.
- **Responses:**
  - **201 Created:**
    ```json
    {
      "id": 13,
      "originalFilename": "network_log.pdf",
      "fileSize": 150000,
      "mimeType": "application/pdf",
      "isDeleted": false,
      "createdAt": "2026-08-22T08:15:00.000Z"
    }
    ```
  - **400 Bad Request:** Unsupported file type, file exceeds 5MB, or ticket already has 5 active attachments.
  - **403 Forbidden:** Requester does not own the parent ticket.
  - **404 Not Found:** Ticket does not exist.

---

### 3.8 Download Attachment
- **Path:** `GET /api/attachments/:id/download`
- **Description:** Streams the binary content of an active attachment.
- **Headers:** `x-requester-id: <id>` (Required)
- **Responses:**
  - **200 OK:** Binary stream with `Content-Disposition: attachment; filename="..."` and matching `Content-Type`.
  - **403 Forbidden:** Requester does not own the parent ticket.
  - **404 Not Found / 410 Gone:** Attachment does not exist or has been soft-removed.

---

### 3.9 Soft-Remove Attachment
- **Path:** `DELETE /api/attachments/:id`
- **Description:** Marks an attachment as soft-deleted and records the mandatory reason.
- **Headers:** `x-requester-id: <id>` (Required)
- **Request Body:**
  ```json
  {
    "deletionReason": "Uploaded incorrect diagnostic screenshot"
  }
  ```
- **Responses:**
  - **200 OK:**
    ```json
    {
      "message": "Attachment removed successfully",
      "attachment": {
        "id": 12,
        "isDeleted": true,
        "deletionReason": "Uploaded incorrect diagnostic screenshot",
        "deletedAt": "2026-08-22T08:30:00.000Z"
      }
    }
    ```
  - **400 Bad Request:** Missing or empty `deletionReason`.
  - **403 Forbidden:** Requester does not own the parent ticket.
  - **404 Not Found:** Attachment does not exist.
