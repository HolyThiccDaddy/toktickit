# AI Use & Reflection — Lab 1 TokTickIT

I used the **Antigravity Coding Agent** through my Google Cloud Platform account with **Gemini 3.5 Flash / Gemini 3.6 Flash** as the primary LLM (Thinking level: Medium).

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| **Plan Lab 1 Implementation** | Read the enclosed TokTickIT Lab 1 requirements. Summarize the four GitHub Issues, their dependencies, required outputs, and required automated tests. Propose an implementation order... | Worked in one shot. Gave a clear step-by-step breakdown of all 4 issues. |
| **Set Up Full-Stack Project** | Setup the TokTickIT project tech stack as given in Lab 1 using React, TypeScript, Vite, and Bootstrap for frontend, and Node.js, Express, and TypeScript for backend... | Required follow-up prompts to detail folder structure alignment. |
| **Implement Health Check** | Add GET /api/health to the existing Express backend. It must return HTTP 200 with status=ok and service=TokTickIT API. Add Supertest test... | Generated clean endpoint and Supertest spec directly. |
| **Category Seed & Schema** | Create the Prisma Category model with id, unique name, createdAt. Add migration and seed script for 4 categories using upsert... | Correctly implemented idempotent upsert logic. |
| **Display Category List** | Create GET /api/categories endpoint returning categories from PostgreSQL. Update React UI with [Check System] button, loading state... | UI loading state worked smoothly with Bootstrap components. |
| **Review Final Lab 1 Work** | Review completed TokTickIT Lab 1 implementation against all acceptance criteria and generate test coverage report... | Verified all acceptance criteria were satisfied before release PR. |

## Reflection Summary

Using the AI agent accelerated setting up TypeScript boilerplate and Supertest mocks. Key learning: breaking down tasks into modular prompts for each feature branch allowed maintaining full control over code quality, tests, and Git flow.
