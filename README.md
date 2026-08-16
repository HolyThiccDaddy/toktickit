# TokTickIT — IT Service Desk Application

TokTickIT is a full-stack IT Service Desk vertical slice built for **Lab 1**. The application features an Express TypeScript backend connected to a PostgreSQL database via Prisma ORM, and a React TypeScript frontend powered by Vite and Bootstrap.

---

## Technical Stack

- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Testing:** Vitest, Supertest, React Testing Library
- **Architecture:** Monorepo (`client/` and `server/`)

---

## Project Structure

```text
toktickit/
├── client/                 # Frontend React Application
│   ├── src/                # UI Components & API client
│   └── tests/lab-01/       # React Testing Library & Vitest specs
├── server/                 # Backend Express Application
│   ├── prisma/             # Prisma Schema & Database Seed Scripts
│   ├── src/                # Express API routes & Prisma singleton
│   └── tests/lab-01/       # Supertest API integration specs
└── docs/lab-01/            # Lab 1 Documentation & Peer Review Records
    ├── ai_use.md           # AI Use Log & Reflection
    ├── reviewer.md         # Peer Review Record with partner
    ├── tests.md            # Automated Test Specifications & Execution Logs
    └── screenshots/        # Application UI Screenshots
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL running locally on port `5432`

---

### Installation & Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HolyThiccDaddy/toktickit.git
   cd toktickit
   ```

2. **Configure Backend Environment:**
   Create a `server/.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"
   PORT=3000
   ```

3. **Install Dependencies:**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

---

## Database Migration & Seeding

Run the database migrations and seed script inside the `server/` directory:

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

*The seed script populates 4 IT request categories:*
1. Account and Access
2. Hardware
3. Software
4. Network

---

## Running the Application Locally

### 1. Start the Backend API Server
```bash
cd server
npm run dev
```
*API server runs at `http://localhost:3000`*

### 2. Start the Frontend Application
```bash
cd client
npm run dev
```
*Frontend app runs at `http://localhost:5173`*

---

## Automated Testing

### Run Backend Integration Tests
```bash
cd server
npm test
```
*Executes `health.test.ts` and `categories.test.ts` via Supertest & Vitest.*

### Run Frontend Component Tests
```bash
cd client
npm test
```
*Executes `App.test.tsx` via React Testing Library & Vitest.*

---

## API Endpoints

- `GET /api/health` — Returns system health status (`HTTP 200 { "status": "ok", "service": "TokTickIT API" }`)
- `GET /api/categories` — Returns list of seeded IT request categories (`HTTP 200 [{ "id": 1, "name": "Account and Access" }, ...]`)

---

## Lab Documentation

- [AI Use & Reflection Log](docs/lab-01/ai_use.md)
- [Peer Review Record](docs/lab-01/reviewer.md)
- [Automated Test Specifications](docs/lab-01/tests.md)
- [UI Screenshots](docs/lab-01/screenshots/)