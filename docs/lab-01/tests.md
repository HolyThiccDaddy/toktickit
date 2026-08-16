# Automated Test Specifications — Lab 1 TokTickIT

This document details all automated test suites implemented, executed, and verified for TokTickIT Lab 1.

---

## Summary Table of Test Specifications

| Test ID | Location | Framework / Tool | Test Description & Assertion Criteria | Status |
| :--- | :--- | :--- | :--- | :---: |
| **API-01** | `server/tests/lab-01/health.test.ts` | Vitest + Supertest | Verifies `GET /api/health` returns HTTP 200 with JSON payload `{ status: "ok", service: "TokTickIT API" }`. | **PASS** |
| **API-02** | `server/tests/lab-01/categories.test.ts` | Vitest + Supertest | Verifies `GET /api/categories` returns HTTP 200 with all 4 seeded categories in ascending ID order (`Account and Access`, `Hardware`, `Software`, `Network`). | **PASS** |
| **UI-01** | `client/tests/lab-01/App.test.tsx` | Vitest + React Testing Library | Asserts that the main heading `TokTickIT IT Service Desk` renders correctly on initial page load. | **PASS** |
| **UI-02** | `client/tests/lab-01/App.test.tsx` | Vitest + React Testing Library | Spies on `api.checkSystem()` with mock success payload. Simulates user clicking `[Check System]`, verifying `System Status: Online` and category list items render dynamically. | **PASS** |
| **UI-03** | `client/tests/lab-01/App.test.tsx` | Vitest + React Testing Library | Spies on `api.checkSystem()` with mock API failure rejection. Simulates user clicking `[Check System]`, verifying `System Status: Offline` and user-friendly error message display. | **PASS** |

---

## Test Execution Commands & Verification Output

### 1. Server Integration Tests (`server`)
```bash
cd server
npm test
```

**Output Log:**
```text
 RUN  v2.1.9 D:/Downloads/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 29ms
 ✓ tests/lab-01/categories.test.ts (1 test) 195ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  10:51:10
   Duration  1.07s (transform 93ms, setup 0ms, collect 910ms, tests 225ms, environment 0ms, prepare 301ms)
```

---

### 2. Client Frontend Unit & Component Tests (`client`)
```bash
cd client
npm test
```

**Output Log:**
```text
 RUN  v2.1.9 D:/Downloads/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 125ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  10:51:18
   Duration  2.16s (transform 81ms, setup 195ms, collect 237ms, tests 125ms, environment 1.19s, prepare 162ms)
```

---

## Verification Conclusion

- Total Test Suites: **3 Files** (`health.test.ts`, `categories.test.ts`, `App.test.tsx`)
- Total Automated Tests: **5 Assertions** (2 Server API + 3 Client UI)
- Overall Result: **100% PASS (5/5 Passed)**
