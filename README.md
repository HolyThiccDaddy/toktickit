# TokTickIT — Lab 2 Requester Ticketing MVP

TokTickIT is a full-stack, requester-facing IT service-desk application built for Lab 2. A temporary Development Requester selector simulates the current user context until real authentication is introduced in Lab 3. Requesters can create tickets, upload permitted evidence, find their own tickets, open read-only details, and manage attachments with ownership protection.

## Scope and technology

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Testing:** Vitest, Supertest, React Testing Library, Playwright
- **Architecture:** Monorepo with `client/`, `server/`, and repository-root E2E specs

Lab 2 deliberately excludes real authentication, IT Staff workflow, comments/notes, Actions Taken, administration, and status transitions beyond `NEW`.

## Repository structure

```text
toktickit/
├── client/                     # React UI, component tests, and Playwright dependency
├── server/                     # Express API, Prisma schema/migrations, and API tests
├── e2e/                        # Playwright journeys and deterministic setup/teardown
├── docs/lab-02/                # Lab 2 contract, test plan, AI log, and review record
└── artifacts/lab-02/           # Test output and responsive/visual evidence
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

The Playwright command starts isolated services, resets deterministic fixtures in `toktickit_test`, checks desktop/tablet/mobile journeys, and writes JSON results to `artifacts/lab-02/e2e-results.json` plus PNG evidence under `artifacts/lab-02/screenshots/`.

## API surface

- `GET /api/health` — service health
- `GET /api/requesters` — active Development Requesters
- `GET /api/categories` — active ticket categories
- `GET /api/related-systems` — active related systems
- `POST /api/tickets` — create a `NEW` requester-owned ticket
- `GET /api/tickets` — requester-scoped search, filtering, sorting, and pagination
- `GET /api/tickets/:id` — owned read-only ticket detail
- `POST /api/tickets/:id/attachments` — add a validated attachment
- `GET /api/attachments/:id/download` — download an active attachment
- `DELETE /api/attachments/:id` — soft-remove an owned attachment with a reason

Requester identity is supplied only through the `X-Requester-Id` header. Attachment uploads enforce allowed type, extension, magic bytes, size, count, ownership, and compensating cleanup rules.

## Lab 2 documentation

- [Sprint specification](docs/lab-02/specification.md)
- [REST API contract](docs/lab-02/api-spec.md)
- [UI specification](docs/lab-02/ui-spec.md)
- [Test plan and results](docs/lab-02/tests.md)
- [AI use and reflection](docs/lab-02/ai-use.md)
- [Peer-review record](docs/lab-02/reviewer.md)
- [Lab 2 visual evidence](artifacts/lab-02/screenshots/)

The core Lab 2 implementation was integrated into `main` by release PR #27 (`a145b057`). The README/documentation update was promoted by PR #29 (`2d963f7`), and the final evidence/report update was promoted by PR #32 (`10d902b`).
