# AI Use & Reflection — Lab 1 TokTickIT

I used the **Antigravity AI Agent** with **Claude 3.5 Sonnet / Gemini 3.6 Flash** as my pair-programming assistant to complete TokTickIT Lab 1.

---

## 💬 Selected Key Prompts & Practical Interactions

| Task / Problem Area | Prompt Summary / Technical Instruction | Reflection & Outcome |
| :--- | :--- | :--- |
| **Prisma Migration & DB Auth Setup** | *"Troubleshoot Prisma migration and seeding failure when running `npx prisma migrate dev` and `npx prisma db seed` on Windows environment."* | **High Impact:** Diagnosed PostgreSQL authentication error (`password authentication failed for user "postgres"`) and guided setting up local `trust` mode in `pg_hba.conf`, enabling smooth migrations and database seeding. |
| **Branch Scope Enforcing & Revert (Issue 3 vs 4)** | *"Keep Issue #3 strictly scoped to Category model and seed script only. Revert prematurely added Issue #4 API endpoints, UI components, and tests."* | **Critical Course Correction:** Cleanly reverted `/api/categories` endpoint, UI list components, and Vitest specs from `feature/3-category-seed` back to pure Issue 3 scope, ensuring clean PR reviews without cross-issue pollution. |
| **Git Conflict Resolution (PR #10)** | *"Resolve Git merge conflicts between `lab1-staging` and `feature/4-category-list` in `App.tsx` and `api.ts`."* | **Git Flow Assistance:** Automatically pulled the updated `lab1-staging` branch, merged into `feature/4-category-list`, carefully resolved code conflicts in `App.tsx` and `api.ts` while maintaining complete Issue 4 functionality, and pushed back to GitHub. |
| **Peer Review Record Synchronization** | *"Format the peer review records in `docs/lab-01/reviewer.md` based on partner review interactions and screenshot logs."* | **Documentation Perfection:** Extracted review comments, PR IDs, and exact conversation history with `@osizk` to generate a structured `docs/lab-01/reviewer.md` document matching lab requirements. |

---

## 💡 Key Takeaways & Reflection Summary

1. **Task Decoupling & Strict Branch Discipline:**
   - Working with AI requires clear boundaries for each Git branch. Explicitly prompting AI to limit changes to acceptance criteria prevented bloated PRs and ensured clean peer reviews.

2. **Automated Testing & Environment Troubleshooting:**
   - AI proved invaluable for diagnosing local environment friction (PostgreSQL connection auth, Vite/Vitest async UI mocking, and Supertest route assertion) without hardcoding fallbacks or bypassing test suites.

3. **Pair-Programming Efficiency:**
   - Structured pair-programming with AI enabled fast iterations while retaining full control over Git branch strategy, code quality, and peer review history.
