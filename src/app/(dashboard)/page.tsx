import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sectionsForRole } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import Link from "next/link";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const orgId = session!.user.organizationId;
  const role = session!.user.role as Role;
  const allowed = new Set(sectionsForRole(role));

  const [clients, deals, projects, invoices, documents, journalEntries] = await Promise.all([
    prisma.client.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.deal.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.project.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.invoice.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.document.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.journalEntry.count({ where: { organizationId: orgId } }),
  ]);

  const tiles: {
    label: string;
    value: number;
    href: string;
    section: "sales" | "finance" | "accounting" | "projects" | "documents";
  }[] = [
    { label: "Клиенты", value: clients, href: "/sales", section: "sales" },
    { label: "Сделки", value: deals, href: "/sales", section: "sales" },
    { label: "Проекты", value: projects, href: "/projects", section: "projects" },
    { label: "Счета", value: invoices, href: "/finance", section: "finance" },
    { label: "Проводки", value: journalEntries, href: "/accounting", section: "accounting" },
    { label: "Документы", value: documents, href: "/documents", section: "documents" },
  ];

  const visibleTiles = tiles.filter((t) => allowed.has(t.section));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Обзор</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Краткая сводка по организации и быстрый доступ к разделам.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{tile.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
