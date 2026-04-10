import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: {
      client: true,
      _count: { select: { tasks: true, timeEntries: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Проекты</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Статусы, задачи и учёт времени</p>
      </header>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {projects.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">Проектов пока нет.</li>
        ) : (
          projects.map((p) => (
            <li key={p.id} className="px-4 py-4">
              <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
              <p className="text-sm text-slate-500">
                {p.client.name} · {p.status} · задач: {p._count.tasks}, записей времени:{" "}
                {p._count.timeEntries}
                {p.budgetPlanned != null
                  ? ` · бюджет: ${Number(p.budgetPlanned).toLocaleString("ru-RU")} ${p.currency}`
                  : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
