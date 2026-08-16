# LAB 01 Submission Document: TokTickIT Full-Stack Hello World Starter

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Document Title:** LAB 01 Final Submission Report  

---

## 1. Student Metadata Header

* **Student Name:** Thira Rungruangkaset
* **Student ID:** 67070503419
* **Section:** 1
* **Submission Date:** 16 August 2026
* **Peer Reviewer:** Ashira Sansoda (Student ID: 67070503445)
* **GitHub Username:** `@HolyThiccDaddy`
* **Peer Reviewer GitHub:** `@osizk`

---

## 2. Answer Part 1: Git Use with Engineering Workflow (15 Points)

### 1.1 Repository, Project Board, Issue & PR Direct URLs

- **GitHub Repository URL:** [https://github.com/HolyThiccDaddy/toktickit](https://github.com/HolyThiccDaddy/toktickit)
- **GitHub Project Board URL:** [https://github.com/users/HolyThiccDaddy/projects/1](https://github.com/users/HolyThiccDaddy/projects/1)

#### Issue URLs:
- **Issue #1 (Foundation Setup):** [https://github.com/HolyThiccDaddy/toktickit/issues/1](https://github.com/HolyThiccDaddy/toktickit/issues/1)
- **Issue #2 (Health Check API):** [https://github.com/HolyThiccDaddy/toktickit/issues/2](https://github.com/HolyThiccDaddy/toktickit/issues/2)
- **Issue #3 (Category Seed):** [https://github.com/HolyThiccDaddy/toktickit/issues/3](https://github.com/HolyThiccDaddy/toktickit/issues/3)
- **Issue #4 (Category List):** [https://github.com/HolyThiccDaddy/toktickit/issues/4](https://github.com/HolyThiccDaddy/toktickit/issues/4)

#### Pull Request URLs:
- **PR #5 (Issue 1 - Project Foundation):** [https://github.com/HolyThiccDaddy/toktickit/pull/5](https://github.com/HolyThiccDaddy/toktickit/pull/5)
- **PR #8 (Issue 2 - Health Check):** [https://github.com/HolyThiccDaddy/toktickit/pull/8](https://github.com/HolyThiccDaddy/toktickit/pull/8)
- **PR #9 (Issue 3 - Category Seed):** [https://github.com/HolyThiccDaddy/toktickit/pull/9](https://github.com/HolyThiccDaddy/toktickit/pull/9)
- **PR #10 (Issue 4 - Category List):** [https://github.com/HolyThiccDaddy/toktickit/pull/10](https://github.com/HolyThiccDaddy/toktickit/pull/10)
- **Release PR (`lab1-staging` -> `main`):** [https://github.com/HolyThiccDaddy/toktickit/pull/11](https://github.com/HolyThiccDaddy/toktickit/pull/11)

---

### 1.2 Peer Review Record (`docs/lab-01/reviewer.md`)

```markdown
# Lab 1 — Peer Review Record

**Author:** Thira Rungruangkaset — 67070503419 — GitHub: @HolyThiccDaddy  
**Peer reviewer:** Ashira Sansoda — 67070503445 — GitHub: @osizk  

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Merge commit | Reviewer verdict |
|---|---|---|---|
| [#5](https://github.com/HolyThiccDaddy/toktickit/pull/5) | feature/1-project-foundation | `6c85940` | Approved. "Everything looks great." |
| [#8](https://github.com/HolyThiccDaddy/toktickit/pull/8) | feature/2-health-check | `640f439` | Approved. "Everything look good, the health endpoint matches the Issue 2 requirement. I left a couple of small cleanup comments." |
| [#9](https://github.com/HolyThiccDaddy/toktickit/pull/9) | feature/3-category-seed | `0d38d35` | Approved. "The Issue #4 implementation has been removed and the Issue #3 Prisma/migration/seed work looks good." |
| [#10](https://github.com/HolyThiccDaddy/toktickit/pull/10) | feature/4-category-list | `7d6dc9d` | Approved. "Everything looks good, you can merge now." |

### Conversations on PRs I Authored:
- **PR [#5](https://github.com/HolyThiccDaddy/toktickit/pull/5) (feature/1-project-foundation):**
  - **Reviewer comment:** "Everything looks great."
  - **My response:** "I finish fixing the first problem please review."

- **PR [#8](https://github.com/HolyThiccDaddy/toktickit/pull/8) (feature/2-health-check):**
  - **Reviewer comment:** "Everything look good, the health endpoint matches the Issue 2 requirement. I left a couple of small cleanup comments." & "since e isn't used, this can just be catch { ... }"
  - **My response:** "I will just leave it. In case it will be used in future. Thanks."

- **PR [#9](https://github.com/HolyThiccDaddy/toktickit/pull/9) (feature/3-category-seed):**
  - **Reviewer comment:** "Issue #3 itself looks good but this PR also includes a lot of Issue #4 work (/api/categories, UI states, and UI tests). Since this branch is feature/3-category-seed, I'd prefer keeping Issue #4 changes in its own PR so each issue stays easy to review and revert." -> "the Issue #4 implementation has been removed and the Issue #3 Prisma/migration/seed work looks good."
  - **My response:** "Dear Ashira, Thanks for the review! I will give a change later please re-review."

- **PR [#10](https://github.com/HolyThiccDaddy/toktickit/pull/10) (feature/4-category-list):**
  - **Reviewer comment:** "Everything looks good, you can merge now."
  - **My response:** "From the issue #3 I fixed it cause the issue #4 to conflict but do not worry. I fixed it. Please give a review. Thank you."

---

## Pull Requests I reviewed for my partner

| PR | Branch | Merge commit | My verdict |
|---|---|---|---|
| [#5](https://github.com/osizk/TokTickIT/pull/5) | feature/1-project-foundation- | `a76506c` | Passed. "You are doing good lil bro. Pass." |
| [#6](https://github.com/osizk/TokTickIT/pull/6) | feature/2-health-check | `91347e8` | Passed. "I've seen the code you did. Great job. Now you can merge it." |
| [#7](https://github.com/osizk/TokTickIT/pull/7) | feature/3-catogory-seed | `a77b701` | Positive review. "Good job so far. Nicely done!" |
| [#8](https://github.com/osizk/TokTickIT/pull/8) | feature/4-category-list | `f839442` | Passed. "Looks good already. The issue #4 flow is complete. Prisma is well done. And the UI is pretty good. You can merge it now I give it a pass." |

### Conversations on PRs I Reviewed:
- **PR [#5](https://github.com/osizk/TokTickIT/pull/5) (feature/1-project-foundation-):**
  - **My review comment:** "You are doing good lil bro. Pass."
  - **Partner's response:** Merged after review.

- **PR [#6](https://github.com/osizk/TokTickIT/pull/6) (feature/2-health-check):**
  - **My review comment:** "I've seen the code you did. Great job. Now you can merge it."
  - **Partner's response:** Merged after review.

- **PR [#7](https://github.com/osizk/TokTickIT/pull/7) (feature/3-catogory-seed):**
  - **My review comment:** "Good job so far. Nicely done!"
  - **Partner's response:** Merged after review.

- **PR [#8](https://github.com/osizk/TokTickIT/pull/8) (feature/4-category-list):**
  - **My review comment:** "Looks good already. The issue #4 flow is complete. Prisma is well done. And the UI is pretty good. You can merge it now I give it a pass."
  - **Partner's response:** Merged after review.
```

---

## 3. Answer Part 2: Tests (10 Points)

### 2.1 Rendered Test Specifications (`docs/lab-01/tests.md`)

```markdown
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
```

---

### 2.2 Empirical Test Execution Output Logs

#### Server Integration Tests (`cd server && npm test`):
```text
 RUN  v2.1.9 D:/Downloads/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 29ms
 ✓ tests/lab-01/categories.test.ts (1 test) 195ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  10:51:10
   Duration  1.07s (transform 93ms, setup 0ms, collect 910ms, tests 225ms, environment 0ms, prepare 301ms)
```

#### Client Frontend Tests (`cd client && npm test`):
```text
 RUN  v2.1.9 D:/Downloads/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 125ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  10:51:18
   Duration  2.16s (transform 93ms, setup 195ms, collect 237ms, tests 125ms, environment 1.19s, prepare 162ms)
```

---

## 4. Answer Part 3: AI Use and Reflection (5 Points)

### 3.1 Rendered AI Log (`docs/lab-01/ai_use.md`)

```markdown
# AI Use & Reflection — Lab 1 TokTickIT

I used the **Antigravity AI Agent** with **Claude 3.5 Sonnet / Gemini 3.6 Flash** as my pair-programming assistant to complete TokTickIT Lab 1.

---

## Selected Key Prompts & Practical Interactions

| # | Task / Phase | Prompt Summary / Technical Instruction | Reflection & Outcome |
| :-: | :--- | :--- | :--- |
| **1** | **Initial Project Analysis & Architecture Setup** | *"Analyze the TokTickIT Lab 1 specification. Outline the full-stack architecture, database models, API route specifications, and Vitest/Supertest test requirements for all 4 issues."* | **High Impact:** Generated a clear modular execution plan breaking down tasks across feature branches before writing code. |
| **2** | **Issue 1 — Project Foundation Setup** | *"Verify the React + Vite frontend and Express backend starter structure. Ensure workspace dependencies and TypeScript configurations pass initial build checks."* | **Efficiency:** Validated baseline full-stack setup and confirmed local environment build stability before implementing backend endpoints. |
| **3** | **PostgreSQL & Prisma Authentication Setup** | *"Troubleshoot Prisma migration and seeding failures (`npx prisma migrate dev` / `npx prisma db seed`) on local Windows environment."* | **Crucial Debugging:** Diagnosed PostgreSQL local auth error (`password authentication failed for user "postgres"`) and guided setting up local `trust` mode in `pg_hba.conf`, resolving DB connection errors cleanly. |
| **4** | **Issue 2 — Health Check API & Service Layer** | *"Implement `GET /api/health` in Express backend returning status 200 `{ status: "ok", service: "TokTickIT API" }` and write Supertest assertions in `health.test.ts`."* | **Backend Reliability:** Implemented health check endpoint with isolated Supertest specs without opening explicit network ports. |
| **5** | **Issue 3 — Prisma Schema & Idempotent Seed Script** | *"Implement the Prisma `Category` model and create an idempotent `seed.ts` script for the four required IT request categories using `upsert`."* | **Best Practice:** Generated idempotent seed logic that prevents primary key conflict errors upon repeated executions. |
| **6** | **Branch Scope Enforcing & Revert (Issue 3 vs 4)** | *"Keep Issue #3 strictly scoped to Category model and seed script only. Revert prematurely added Issue #4 API endpoints, UI components, and tests."* | **Strict Branch Discipline:** Cleanly reverted `/api/categories` endpoint, UI list components, and Vitest specs from `feature/3-category-seed` back to pure Issue 3 scope, ensuring PR review compliance without cross-issue pollution. |
| **7** | **Issue 4 — Category List Endpoint & UI States** | *"Implement `GET /api/categories` with Express, update `checkSystem()` and Bootstrap UI in React to handle idle, loading, success, and error states."* | **Full-Stack Vertical Slice:** Completed end-to-end integration including UI loading/success/error states and rendering category list items cleanly. |
| **8** | **Issue 4 — UI Testing & Vitest Spies** | *"Write Vitest unit tests in `App.test.tsx` using `vi.spyOn` to mock `checkSystem()` API success and error responses."* | **Test Automation:** Verified frontend state transitions and error messaging under simulated API online and offline scenarios. |
| **9** | **Git Conflict Resolution & Staging Merge (PR #10)** | *"Resolve Git merge conflicts between `lab1-staging` and `feature/4-category-list` in `App.tsx` and `api.ts`."* | **Git Flow Assistance:** Automatically rebased and merged `lab1-staging` into `feature/4-category-list`, carefully resolved code conflicts in `App.tsx` and `api.ts`, and pushed back to GitHub cleanly. |
| **10** | **Peer Review Record Synchronization** | *"Format the peer review records in `docs/lab-01/reviewer.md` based on partner review interactions and screenshot logs."* | **Documentation Perfection:** Extracted review comments, PR IDs, merge commit hashes, and exact conversation history with `@osizk` to generate a structured `docs/lab-01/reviewer.md` document. |

---

## Key Takeaways & Reflection Summary

1. **Task Decoupling & Strict Branch Discipline:**
   - Working with AI requires clear boundaries for each Git branch. Explicitly prompting AI to limit changes to acceptance criteria prevented bloated PRs and ensured clean peer reviews.

2. **Automated Testing & Environment Troubleshooting:**
   - AI proved invaluable for diagnosing local environment friction (PostgreSQL connection auth, Vite/Vitest async UI mocking, and Supertest route assertion) without hardcoding fallbacks or bypassing test suites.

3. **Git Flow & Peer Review Alignment:**
   - Integrating AI into the Git workflow simplified complex merge conflict resolution, PR management, and reciprocal peer review documentation across `lab1-staging` and feature branches.

4. **Pair-Programming Efficiency:**
   - Structured pair-programming with AI enabled fast iterations while retaining full control over Git branch strategy, code quality, and peer review history.
```

---

## 5. Answer Part 4: App Demo (10 Points)

### 4.1 Initial UI State (Idle)
- **Path:** `docs/lab-01/screenshots/idle.png`
- Displays heading `TokTickIT IT Service Desk` and initial `[Check System]` button.

### 4.2 Health Check Success UI State (Issue 2)
- **Path:** `docs/lab-01/screenshots/issue2_health_success.png`
- Displays `System Status: Online`.

### 4.3 Full Success UI State (Issue 4)
- **Path:** `docs/lab-01/screenshots/success.png`
- Displays `System Status: Online` and 4 seeded categories:
  1. Account and Access
  2. Hardware
  3. Software
  4. Network

### 4.4 Failure UI State (Offline Error)
- **Path:** `docs/lab-01/screenshots/offline.png`
- Displays `System Status: Offline` with error message `Unable to connect to TokTickIT API`.
