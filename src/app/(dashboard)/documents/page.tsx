import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;

  const documents = await prisma.document.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      approvals: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Документооборот</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Версии файлов и согласования</p>
      </header>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {documents.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">Документов пока нет.</li>
        ) : (
          documents.map((doc) => (
            <li key={doc.id} className="px-4 py-4">
              <p className="font-medium text-slate-900 dark:text-white">{doc.title}</p>
              <p className="text-sm text-slate-500">
                Тип связи: {doc.entityType}
                {doc.entityId ? ` · ${doc.entityId.slice(0, 8)}…` : ""}
                {doc.versions[0] ? ` · версия ${doc.versions[0].version}` : ""}
              </p>
              {doc.approvals.length > 0 ? (
                <p className="mt-1 text-xs text-slate-400">
                  Согласования:{" "}
                  {doc.approvals.map((a) => `${a.status}${a.comment ? ` (${a.comment})` : ""}`).join(", ")}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
