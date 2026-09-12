import { getPrisma } from "../src/prisma.js";
import { hashPassword, migrationPendingHash } from "../src/auth.js";

const requesterCredentials = [
  { id: 1, email: "jennifer.anderson@example.com", password: "RequesterOne!2026" },
  { id: 2, email: "michael.brown@example.com", password: "RequesterTwo!2026" },
  { id: 3, email: "sarah.johnson@example.com", password: "RequesterThree!2026" },
  { id: 4, email: "david.lee@example.com", password: "RequesterFour!2026" },
  { id: 5, email: "robert.taylor@example.com", password: "RequesterFive!2026" },
] as const;
const staffCredentials = [
  { email: "alex.staff@example.com", password: "StaffOne!2026", displayName: "Alex Staff", department: "Information Technology", active: true },
  { email: "casey.staff@example.com", password: "StaffTwo!2026", displayName: "Casey Staff", department: "Information Technology", active: true },
  { email: "jamie.staff@example.com", password: "StaffThree!2026", displayName: "Jamie Staff", department: "Information Technology", active: true },
  { email: "inactive.staff@example.com", password: "StaffFour!2026", displayName: "Inactive Staff", department: "Information Technology", active: false },
] as const;
const administratorCredentials = [
  { email: "admin@example.com", password: "AdminOne!2026", displayName: "TokTickIT Administrator", department: "Information Technology", active: true },
] as const;

export const SEED_CREDENTIALS = {
  requesters: requesterCredentials,
  staff: staffCredentials,
  administrators: administratorCredentials,
  all: [...requesterCredentials, ...staffCredentials, ...administratorCredentials],
} as const;

export const allSeedCredentials = SEED_CREDENTIALS.all;

const requesterCredentialsByEmail = new Map<string, (typeof requesterCredentials)[number]>(
  requesterCredentials.map((credential) => [credential.email, credential]),
);

/**
 * Return a deterministic local-only initial password for every migrated
 * requester. Standard fixtures keep their documented credentials; a requester
 * that was added during Lab 2 derives a non-secret fallback from its preserved
 * numeric ID. Re-seeding never replaces a hash that is no longer pending.
 */
export function initialPasswordForRequester(requester: { id: number; email: string }) {
  return requesterCredentialsByEmail.get(requester.email)?.password ?? `MigratedRequester-${requester.id}!2026`;
}

export async function seed(prisma = getPrisma()) {
  // 1. Seed Categories (4 required categories)
  const categories = [
    { name: "Account and Access", description: "Login, credentials, permissions, and account lifecycle" },
    { name: "Hardware", description: "Computers, laptops, peripherals, monitors, and physical equipment" },
    { name: "Software", description: "Operating systems, licensed productivity software, and system utilities" },
    { name: "Network", description: "Campus Wi-Fi, VPN connectivity, IP assignment, and network infrastructure" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: { name: cat.name, description: cat.description, isActive: true },
    });
  }

  // 2. Seed Related Systems (7 systems >= 6 required)
  const relatedSystems = [
    { name: "Email", description: "Corporate email services, webmail, and mailing lists" },
    { name: "Campus Wi-Fi", description: "Wireless network connectivity across campus buildings" },
    { name: "VPN", description: "Remote virtual private network access" },
    { name: "LEB2 App", description: "Online learning environment and course management platform" },
    { name: "Grade Submission App", description: "Faculty academic grading system" },
    { name: "Printer", description: "Networked department and lab printers" },
    { name: "Corporate Laptop", description: "Standard issued employee laptop hardware" },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: true },
      create: { name: sys.name, description: sys.description, isActive: true },
    });
  }

  // 3. Seed Development Requesters (4 active, 1 inactive)
  const requesters = [
    { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Human Resources", isActive: true },
    { id: 2, name: "Michael Brown", email: "michael.brown@example.com", department: "Information Technology", isActive: true },
    { id: 3, name: "Sarah Johnson", email: "sarah.johnson@example.com", department: "Finance & Accounting", isActive: true },
    { id: 4, name: "David Lee", email: "david.lee@example.com", department: "Marketing & Communications", isActive: true },
    { id: 5, name: "Robert Taylor", email: "robert.taylor@example.com", department: "Operations", isActive: false },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, department: req.department, isActive: req.isActive },
      create: { id: req.id, name: req.name, email: req.email, department: req.department, isActive: req.isActive },
    });
  }

  // 4b. Mirror Lab 2 requesters into the authenticated User model, then add
  // deterministic local-only IT Staff and Administrator fixtures. Existing
  // hashes are preserved so re-seeding never resets a changed password.
  const upsertUser = async (fixture: {
    id?: number;
    email: string;
    password: string;
    displayName: string;
    department: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMIN";
    active: boolean;
  }) => {
    const existing = await prisma.user.findUnique({ where: { email: fixture.email }, select: { passwordHash: true, mustChangePassword: true } });
    const passwordHash = !existing || existing.passwordHash === migrationPendingHash
      ? await hashPassword(fixture.password)
      : existing.passwordHash;
    return prisma.user.upsert({
      where: { email: fixture.email },
      update: {
        displayName: fixture.displayName,
        department: fixture.department,
        role: fixture.role,
        active: fixture.active,
        ...(existing?.passwordHash === migrationPendingHash ? { passwordHash, mustChangePassword: true } : {}),
      },
      create: {
        ...(fixture.id === undefined ? {} : { id: fixture.id }),
        email: fixture.email,
        displayName: fixture.displayName,
        department: fixture.department,
        role: fixture.role,
        passwordHash,
        mustChangePassword: true,
        active: fixture.active,
      },
    });
  };

  // Read the actual legacy table after the standard fixtures are upserted so
  // requesters added during Lab 2 also receive an initial credential.
  const requesterRows = await prisma.requesterUser.findMany({ orderBy: { id: "asc" } });
  for (const requester of requesterRows) {
    await upsertUser({
      id: requester.id,
      email: requester.email,
      password: initialPasswordForRequester(requester),
      displayName: requester.name,
      department: requester.department,
      role: "REQUESTER",
      active: requester.isActive,
    });
  }

  // Explicitly migrated requester IDs do not advance PostgreSQL's serial
  // sequence. Align it before creating new-role fixtures so auto-allocation
  // starts after the highest preserved user ID.
  const alignUserSequence = async () => prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM "User"), 1), 1), true)`);
  await alignUserSequence();

  for (const staff of SEED_CREDENTIALS.staff) {
    await upsertUser({ ...staff, role: "IT_STAFF" });
  }
  for (const admin of SEED_CREDENTIALS.administrators) {
    await upsertUser({ ...admin, role: "ADMIN" });
  }

  // Requester IDs mirror the migrated Lab 2 rows. Staff and Administrator IDs
  // are deliberately allocated by PostgreSQL so they cannot collide with a
  // legacy requester ID. Move the sequence past all resulting rows for future
  // admin-created users.
  await alignUserSequence();

  // 4. Initialize TicketCounter for current year if not exists
  const currentYear = new Date().getFullYear();
  await prisma.ticketCounter.upsert({
    where: { year: currentYear },
    update: {},
    create: { year: currentYear, lastSequence: 0 },
  });

  return {
    categoriesCount: categories.length,
    relatedSystemsCount: relatedSystems.length,
    requestersCount: requesterRows.length,
  };
}

async function main() {
  const result = await seed();
  console.log(`Seeded ${result.categoriesCount} categories.`);
  console.log(`Seeded ${result.relatedSystemsCount} related systems.`);
  console.log(`Seeded ${result.requestersCount} development requesters (4 active, 1 inactive).`);
  console.log(`Initialized ticket counter.`);
}

// Only execute directly when run as script
if (process.argv[1]?.includes("seed.ts") || process.argv[1]?.includes("seed.js")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
