import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const [invoices, payments, expenses, bankAccounts] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { issuedAt: "desc" },
      take: 30,
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId },
      orderBy: { paidAt: "desc" },
      take: 20,
      include: { invoice: true },
    }),
    prisma.expense.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { incurredAt: "desc" },
      take: 20,
    }),
    prisma.bankAccount.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Финансы</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Счета, платежи, расходы и счета в банке</p>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Счета в банке</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {bankAccounts.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Счета не добавлены.</li>
          ) : (
            bankAccounts.map((b) => (
              <li key={b.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">{b.name}</p>
                <p className="text-sm text-slate-500">
                  {b.currency}
                  {b.balanceHint != null
                    ? ` · ориентир: ${Number(b.balanceHint).toLocaleString("ru-RU")}`
                    : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Счета к оплате (инвойсы)</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {invoices.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Счетов нет.</li>
          ) : (
            invoices.map((inv) => (
              <li key={inv.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">
                  № {inv.number} · {inv.status}
                </p>
                <p className="text-sm text-slate-500">
                  {Number(inv.amount).toLocaleString("ru-RU")} {inv.currency}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Платежи</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {payments.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Платежей нет.</li>
          ) : (
            payments.map((p) => (
              <li key={p.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">
                  {Number(p.amount).toLocaleString("ru-RU")} {p.currency}
                </p>
                <p className="text-sm text-slate-500">
                  {p.paidAt.toLocaleDateString("ru-RU")}
                  {p.invoice ? ` · счёт № ${p.invoice.number}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Расходы</h2>
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {expenses.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Расходов нет.</li>
          ) : (
            expenses.map((e) => (
              <li key={e.id} className="px-4 py-4">
                <p className="font-medium text-slate-900 dark:text-white">{e.category}</p>
                <p className="text-sm text-slate-500">
                  {Number(e.amount).toLocaleString("ru-RU")} {e.currency} ·{" "}
                  {e.incurredAt.toLocaleDateString("ru-RU")}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
