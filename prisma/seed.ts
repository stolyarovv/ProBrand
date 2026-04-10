import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const ownerPasswordHash = await bcrypt.hash("2026Staliarou", 10);

  const org = await prisma.organization.upsert({
    where: { id: "seed-org-probrand" },
    create: {
      id: "seed-org-probrand",
      name: "ProBrand Agency",
    },
    update: { name: "ProBrand Agency" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "stolyarov.vb@gmail.com" },
    create: {
      email: "stolyarov.vb@gmail.com",
      name: "Столяров",
      passwordHash: ownerPasswordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.ADMIN,
        },
      },
    },
    update: {
      passwordHash: ownerPasswordHash,
      name: "Столяров",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: org.id,
      },
    },
    create: {
      userId: owner.id,
      organizationId: org.id,
      role: Role.ADMIN,
    },
    update: { role: Role.ADMIN },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@probrand.local" },
    create: {
      email: "admin@probrand.local",
      name: "Администратор",
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.ADMIN,
        },
      },
    },
    update: {
      passwordHash,
      name: "Администратор",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: Role.ADMIN,
    },
    update: { role: Role.ADMIN },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@probrand.local" },
    create: {
      email: "manager@probrand.local",
      name: "Менеджер",
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.MANAGER,
        },
      },
    },
    update: { passwordHash },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: manager.id,
        organizationId: org.id,
      },
    },
    create: {
      userId: manager.id,
      organizationId: org.id,
      role: Role.MANAGER,
    },
    update: { role: Role.MANAGER },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@probrand.local" },
    create: {
      email: "viewer@probrand.local",
      name: "Наблюдатель",
      passwordHash,
      memberships: {
        create: {
          organizationId: org.id,
          role: Role.VIEWER,
        },
      },
    },
    update: { passwordHash },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: viewer.id,
        organizationId: org.id,
      },
    },
    create: {
      userId: viewer.id,
      organizationId: org.id,
      role: Role.VIEWER,
    },
    update: { role: Role.VIEWER },
  });

  let demoClient = await prisma.client.findFirst({
    where: { organizationId: org.id, name: "Демо-клиент" },
  });
  if (!demoClient) {
    demoClient = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: "Демо-клиент",
        email: "client@example.com",
      },
    });
  }

  const demoDeal = await prisma.deal.findFirst({
    where: { organizationId: org.id, title: "Брендинг Q2" },
  });
  if (!demoDeal) {
    await prisma.deal.create({
      data: {
        organizationId: org.id,
        clientId: demoClient.id,
        ownerId: manager.id,
        title: "Брендинг Q2",
        amount: 450000,
        currency: "RUB",
      },
    });
  }

  console.log(
    "Seed OK. Владелец: stolyarov.vb@gmail.com · демо: admin@/manager@/viewer@probrand.local — пароль admin123",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
