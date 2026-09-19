# TokTickIT — Lab 3 Authenticated IT Ticketing

TokTickIT is a full-stack IT service-desk application. Lab 3 replaces Lab 2's temporary Development Requester selector with authenticated sessions and adds the complete requester, IT Staff, and Administrator workflows. Requesters manage only their own tickets and attachments, IT Staff and Administrators operate the shared queue, and Administrators manage users safely.

## Scope and technology

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Testing:** Vitest, Supertest, React Testing Library, Playwright
- **Architecture:** Monorepo with `client/`, `server/`, and repository-root E2E specs

The released application includes the approved Lab 3 queue, ticket-detail, communication, and user-management workflows described in `docs/lab-03/`.

## Repository structure

```text
toktickit/
├── client/                     # React UI, component tests, and Playwright dependency
├── server/                     # Express API, Prisma schema/migrations, and API tests
├── e2e/                        # Playwright journeys and deterministic setup/teardown
├── docs/lab-02/                # Lab 2 contract, test plan, AI log, and review record
├── docs/lab-03/                # Lab 3 contract, test plan, AI log, and review record
├── artifacts/lab-02/           # Lab 2 test output and responsive/visual evidence
├── artifacts/lab-03/           # Lab 3 responsive/visual evidence
└── output/pdf/                 # Final submission reports
```

## Prerequisites

- Node.js **20 or higher** (required by the current Playwright dependency)
- PostgreSQL running locally on port `5432`
- A PostgreSQL role that can create databases

## Installation and environment

```bash
git clone https://github.com/HolyThiccDaddy/toktickit.git
cd toktickit
cd server
npm install
copy .env.example .env
cd ../client
npm install
```

Set `server/.env` to a local development database, for example:

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
TOKTICKIT_UPLOAD_ROOT=uploads
```

Create the dedicated test database before running destructive suites:

```bash
createdb -U toktickit toktickit_test
cd server
copy .env.test.example .env.test
npx prisma migrate deploy
npm run prisma:seed
```

`server/.env.test` is local-only and ignored by Git. Test setup requires a database name ending in `_test` and writes attachments beneath a test-only temporary directory.

## Run the application

```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

The API is available at `http://localhost:3000` and Vite serves the UI at `http://localhost:5173`.

## Verification commands

Run the smallest relevant suite first, then the full release checks:

```bash
cd server
npm test
npm run build

cd ../client
npm test
npm run build
npx playwright test
```

The Playwright command starts isolated services, resets deterministic fixtures in `toktickit_test`, checks requester, staff, and administrator journeys at desktop/tablet/mobile sizes, and writes JSON results plus PNG evidence under the `artifacts/` directories.

## API surface

- `GET /api/health` — service health
- `POST /api/auth/login` — create an authenticated session
- `POST /api/auth/logout` — revoke the current session
- `GET /api/auth/me` — return the current user summary
- `GET /api/auth/csrf` — issue a CSRF token for state-changing requests
- `POST /api/auth/change-password` — complete a first-login password change
- `GET /api/categories` — active ticket categories
- `GET /api/related-systems` — active related systems
- `POST /api/tickets` — create a `NEW` ticket owned by the signed-in Requester
- `GET /api/tickets` — session-scoped search, filtering, sorting, and pagination
- `GET /api/tickets/:id` — owned read-only ticket detail with public conversation
- `POST /api/tickets/:id/attachments` — add a validated attachment to an owned ticket
- `GET /api/attachments/:id/download` — download an active owned attachment
- `DELETE /api/attachments/:id` — soft-remove an owned attachment with a reason
- `GET/POST /api/tickets/:id/comments` — read or append public comments on an owned ticket
- `POST /api/tickets/:id/requester-resolution` — record the Requester's resolution indication
- `GET/PATCH /api/staff/tickets/:id/...` — staff/admin assignment, IT priority, and status operations
- `GET/POST /api/tickets/:id/notes` — internal notes for IT Staff and Administrators
- `GET/POST/PATCH /api/admin/users...` — Administrator user listing and safe account management

Protected identity is derived only from the server-side `toktickit_session` cookie; client-supplied requester, owner, author, and role values are ignored. State-changing requests require the server-issued CSRF token. Attachment uploads enforce allowed type, extension, magic bytes, size, count, ownership, and compensating cleanup rules.

## Lab 2 documentation

- [Sprint specification](docs/lab-02/specification.md)
- [REST API contract](docs/lab-02/api-spec.md)
- [UI specification](docs/lab-02/ui-spec.md)
- [Test plan and results](docs/lab-02/tests.md)
- [AI use and reflection](docs/lab-02/ai-use.md)
- [Peer-review record](docs/lab-02/reviewer.md)
- [Lab 2 visual evidence](artifacts/lab-02/screenshots/)

## Lab 3 documentation

- [Sprint specification](docs/lab-03/specification.md)
- [REST API contract](docs/lab-03/api-spec.md)
- [UI specification](docs/lab-03/ui-spec.md)
- [Test plan and results](docs/lab-03/tests.md)
- [AI use and reflection](docs/lab-03/ai-use.md)
- [Peer-review record](docs/lab-03/reviewer.md)
- [Final submission report source](docs/lab-03/LAB_03_FINAL_SUBMISSION_REPORT.md)
- [Final submission report PDF](output/pdf/LAB_03_FINAL_SUBMISSION_REPORT.pdf)

The core Lab 2 implementation was integrated into `main` by release PR #27 (`a145b057`). The README/documentation update was promoted by PR #29 (`2d963f7`), and the final evidence/report update was promoted by PR #32 (`10d902b`).

Lab 3 was integrated into `main` by Final Release PR #46 (`92fac36`) after peer-reviewed implementation PRs #40–#45 were merged into `lab3-staging`.
