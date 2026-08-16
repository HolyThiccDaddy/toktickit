# AI Use & Reflection — Lab 1 TokTickIT

I used the **Antigravity AI Agent** with **Claude 3.5 Sonnet / Gemini 3.6 Flash** as my pair-programming assistant to complete TokTickIT Lab 1.

---

## 💬 Selected Key Prompts & Practical Interactions

| Task / Problem Area | Actual Prompt / Interaction | Reflection & Outcome |
| :--- | :--- | :--- |
| **Prisma Migration & DB Auth Setup** | *"cd server, npx prisma migrate dev --name init, npx prisma db seed พอพิมแล้วกด enter มันขึ้นอะไร restarting อะไรไม่รู้แว๊บๆแล้วก็ไม่เกิดอะไรขึ้น"* | **High Impact:** The AI helped diagnose PostgreSQL authentication errors (`password authentication failed for user "postgres"`) and guided me to configure `pg_hba.conf` with local `trust` mode, allowing Prisma migrations and seeding to succeed cleanly. |
| **Branch Scope Enforcing & Revert (Issue 3 vs 4)** | *"ใน issue #3 ในส่วนโค้ด ทำแค่ตามโจทย์เท่านั้น อย่าพึ่งแก้ทำ issue#4 เดี๋ยวจารจับได้"* | **Critical Course Correction:** During Issue 3 implementation, AI had previously included `/api/categories` endpoint and UI components. When pointed out, AI cleanly reverted `app.ts`, `api.ts`, `App.tsx`, and test files back to pure Issue 3 scope (Schema + Seed only), ensuring PR review compliance. |
| **Git Conflict Resolution (PR #10)** | *"มึงเข้าไปดูใน github... This branch has conflicts that must be resolved (App.tsx, api.ts)"* | **Git Flow Assistance:** AI automatically pulled the updated `lab1-staging` branch, merged it into `feature/4-category-list`, carefully resolved code conflicts in `App.tsx` and `api.ts` while keeping the full Issue 4 implementation intact, and pushed back to GitHub cleanly. |
| **Peer Review Record Synchronization** | *"อันนี้ไฟล์ของเพื่อน เอามาดัดแปลงเป็น Reviewer.md ของกุ"* | **Documentation Perfection:** AI extracted exact quotes, review comments, and PR link IDs from my peer review screenshots with `@osizk` and formatted `docs/lab-01/reviewer.md` matching my exact perspective. |

---

## 💡 Key Takeaways & Reflection Summary

1. **Task Decoupling & Strict Branch Discipline:**
   - Working with AI requires clear boundaries for each Git branch. When AI generated Issue 4 features prematurely during Issue 3, explicitly prompting AI to limit changes to acceptance criteria prevented bloated PRs and ensured clean peer reviews.

2. **Automated Testing & Environment Troubleshooting:**
   - AI proved invaluable for diagnosing local environment friction (PostgreSQL connection auth, Vite/Vitest async UI mocking, and Supertest route assertion) without hardcoding fallbacks or bypassing test suites.

3. **Pair-Programming Efficiency:**
   - Using natural Thai prompts combined with direct terminal execution enabled fast iterations while retaining full control over Git branch strategy, code quality, and peer review history.
