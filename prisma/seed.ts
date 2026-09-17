import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user -----------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, passwordHash, name: "Admin", role: "ADMIN" },
      update: { passwordHash },
    });
    console.log(`Usuario admin listo: ${adminEmail}`);
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD no configurados: no se creó usuario admin.");
  }

  // --- Example workspace hierarchy (only inserted if missing) ----------
  const workspace = await prisma.workspace.upsert({
    where: { slug: "principal" },
    create: { name: "Principal", slug: "principal" },
    update: {},
  });

  await prisma.project.upsert({
    where: { code: "INBOX" },
    create: { workspaceId: workspace.id, name: "Inbox", slug: "inbox", code: "INBOX", description: "Capturas sin clasificar." },
    update: {},
  });

  const holaSalta = await prisma.project.upsert({
    where: { code: "HS" },
    create: { workspaceId: workspace.id, name: "HolaSalta", slug: "holasalta", code: "HS" },
    update: {},
  });

  const lvr = await prisma.project.upsert({
    where: { code: "LVR" },
    create: { workspaceId: workspace.id, name: "La Voz Riojana", slug: "la-voz-riojana", code: "LVR" },
    update: {},
  });

  for (const name of ["WordPress", "Autopublicador", "Ops", "Infraestructura"]) {
    await prisma.module.upsert({
      where: { projectId_slug: { projectId: holaSalta.id, slug: name.toLowerCase() } },
      create: { projectId: holaSalta.id, name, slug: name.toLowerCase() },
      update: {},
    });
  }

  for (const name of ["Web", "Autopublicador", "Ops"]) {
    await prisma.module.upsert({
      where: { projectId_slug: { projectId: lvr.id, slug: name.toLowerCase() } },
      create: { projectId: lvr.id, name, slug: name.toLowerCase() },
      update: {},
    });
  }

  const aliasSeed: [string, string][] = [
    ["hola salta", "HS"],
    ["holasalta", "HS"],
    ["hs", "HS"],
    ["la voz riojana", "LVR"],
    ["voz riojana", "LVR"],
    ["lvr", "LVR"],
  ];

  for (const [term, projectCode] of aliasSeed) {
    const project = await prisma.project.findUnique({ where: { code: projectCode } });
    if (!project) continue;
    await prisma.alias.upsert({
      where: { term },
      create: { term, projectId: project.id },
      update: { projectId: project.id },
    });
  }

  console.log("Seed completo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
