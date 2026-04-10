import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SalesPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const [clients, deals] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
      take: 25,
      include: { _count: { select: { deals: true, projects: true } } },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { client: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Продажи</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Клиенты и сделки</p>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Клиенты</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {clients.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Клиентов пока нет.</li>
          ) : (
            clients.map((c) => (
              <li key={c.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-sm text-slate-500">
                  Сделок: {c._count.deals} · Проектов: {c._count.projects}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Сделки</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {deals.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Сделок пока нет.</li>
          ) : (
            deals.map((d) => (
              <li key={d.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">{d.title}</p>
                <p className="text-sm text-slate-500">
                  {d.client.name} · {d.stage} · {Number(d.amount).toLocaleString("ru-RU")} {d.currency}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
