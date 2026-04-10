import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { ProjectsBoard, type ProjectListItem } from "@/components/projects/projects-board";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const [projects, clients, memberships] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, timeEntries: true } },
      },
    }),
    prisma.client.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const initialProjects: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    workType: p.workType,
    status: p.status,
    budgetPlanned: p.budgetPlanned != null ? Number(p.budgetPlanned) : null,
    currency: p.currency,
    createdAt: p.createdAt.toISOString(),
    client: p.client ? { id: p.client.id, name: p.client.name } : null,
    owner: p.owner
      ? {
          id: p.owner.id,
          label: p.owner.name?.trim() || p.owner.email,
        }
      : null,
    taskCount: p._count.tasks,
    timeEntryCount: p._count.timeEntries,
  }));

  const members = memberships.map((m) => ({
    id: m.user.id,
    label: m.user.name?.trim() || m.user.email,
  }));

  const canEdit = session.user.role !== Role.VIEWER;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Проекты</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Строки списка, ответственные и типы проектов</p>
      </header>

      <ProjectsBoard
        initialProjects={initialProjects}
        initialClients={clients}
        members={members}
        canEdit={canEdit}
      />
    </div>
  );
}
