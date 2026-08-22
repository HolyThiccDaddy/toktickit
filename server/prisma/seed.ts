import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

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
  console.log("Seeded 4 categories.");

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
  console.log("Seeded 7 related systems.");

  // 3. Seed Development Requesters (4 active, 1 inactive)
  const requesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Human Resources", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", department: "Information Technology", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", department: "Finance & Accounting", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", department: "Marketing & Communications", isActive: true },
    { name: "Robert Taylor", email: "robert.taylor@example.com", department: "Operations", isActive: false },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, department: req.department, isActive: req.isActive },
      create: { name: req.name, email: req.email, department: req.department, isActive: req.isActive },
    });
  }
  console.log("Seeded 5 development requesters (4 active, 1 inactive).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });