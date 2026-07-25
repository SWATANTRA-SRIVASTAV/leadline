import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin1234", 10);
  const memberHash = await bcrypt.hash("member1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@leadline.dev" },
    update: {},
    create: {
      name: "Amara Chen",
      email: "admin@leadline.dev",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@leadline.dev" },
    update: {},
    create: {
      name: "Jonah Petrov",
      email: "member@leadline.dev",
      passwordHash: memberHash,
      role: "MEMBER",
    },
  });

  const sampleLeads = [
    {
      fullName: "Priya Nair",
      email: "priya@northfieldretail.com",
      company: "Northfield Retail",
      message: "Looking to consolidate 3 Shopify stores into one.",
      status: "QUALIFIED" as const,
      assignedToId: member.id,
    },
    {
      fullName: "Marcus Webb",
      email: "marcus@webbdesignco.com",
      company: "Webb Design Co",
      message: "Need a marketing site rebuild, Core Web Vitals are failing.",
      status: "NEW" as const,
      assignedToId: null,
    },
    {
      fullName: "Elena Fischer",
      email: "elena@fischerlabs.io",
      company: "Fischer Labs",
      message: "Interested in a full-stack rebuild of our internal tooling.",
      status: "PROPOSAL_SENT" as const,
      assignedToId: admin.id,
    },
  ];

  for (const data of sampleLeads) {
    const existing = await prisma.lead.findFirst({ where: { email: data.email } });
    if (existing) continue;
    const lead = await prisma.lead.create({ data: { ...data, source: "seed" } });
    await prisma.activity.create({
      data: { leadId: lead.id, type: "CREATED", detail: "Lead captured from seed" },
    });
  }

  console.log("Seeded:", { admin: admin.email, member: member.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
