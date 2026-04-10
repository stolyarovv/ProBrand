import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesFunnelBoard, type FunnelDeal } from "@/components/sales/sales-funnel-board";

export default async function SalesPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const dealRows = await prisma.deal.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { client: true },
  });

  const initialDeals: FunnelDeal[] = dealRows.map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    lostReason: d.lostReason,
    amount: Number(d.amount),
    currency: d.currency,
    client: { id: d.client.id, name: d.client.name },
  }));

  const canEdit = session.user.role !== Role.VIEWER;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Продажи</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Перетаскивайте сделки по этапам воронки. В «Провал» нужно указать причину — она сохранится в карточке.
        </p>
      </header>

      <SalesFunnelBoard initialDeals={initialDeals} canEdit={canEdit} />
    </div>
  );
}
