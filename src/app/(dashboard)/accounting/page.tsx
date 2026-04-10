import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountingPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const [accounts, entries] = await Promise.all([
    prisma.account.findMany({
      where: { organizationId: orgId },
      orderBy: [{ type: "asc" }, { code: "asc" }],
      take: 100,
    }),
    prisma.journalEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { entryDate: "desc" },
      take: 20,
      include: { lines: { include: { account: true } } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Бухгалтерия</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">План счетов и журнал проводок (упрощённый учёт)</p>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Счета</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {accounts.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              План счетов пуст. Добавьте счета через миграции или администрирование БД.
            </li>
          ) : (
            accounts.map((a) => (
              <li key={a.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">
                  {a.code} · {a.name}
                </p>
                <p className="text-sm text-slate-500">{a.type}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Последние проводки</h2>
        <ul className="mt-4 space-y-4">
          {entries.length === 0 ? (
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Записей журнала пока нет.
            </li>
          ) : (
            entries.map((je) => (
              <li
                key={je.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {je.entryDate.toLocaleDateString("ru-RU")}
                  {je.description ? ` · ${je.description}` : ""}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {je.lines.map((line) => (
                    <li key={line.id}>
                      {line.account.code} {line.account.name}: дебет{" "}
                      {Number(line.debit).toLocaleString("ru-RU")}, кредит{" "}
                      {Number(line.credit).toLocaleString("ru-RU")}
                    </li>
                  ))}
                </ul>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
