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
