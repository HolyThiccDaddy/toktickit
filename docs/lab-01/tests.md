# Automated Test Specifications — Lab 1 TokTickIT

The following table summarizes all automated tests implemented and verified for Lab 1:

| Test File (`tests/lab-01/`) | Tool | Test Description | Status |
| :--- | :--- | :--- | :---: |
| `API-01` (`server/tests/lab-01/health.test.ts`) | Supertest | Health endpoint returns 200 and expected JSON | **PASS** |
| `API-02` (`server/tests/lab-01/categories.test.ts`) | Supertest | Categories endpoint returns the four seeded categories | **PASS** |
| `UI-01` (`client/tests/lab-01/App.test.tsx`) | Vitest | TokTickIT heading renders | **PASS** |
| `UI-02` (`client/tests/lab-01/App.test.tsx`) | Vitest | Loading state changes to category list | **PASS** |
| `UI-03` (`client/tests/lab-01/App.test.tsx`) | Vitest | API failure displays a useful error message | **PASS** |
