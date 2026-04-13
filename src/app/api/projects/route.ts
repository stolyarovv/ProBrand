import { type Client, type Project, ProjectKind, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectPostBodySchema } from "@/lib/validations/project";

async function assertUserInOrg(organizationId: string, userId: string) {
  const m = await prisma.membership.findFirst({
    where: { organizationId, userId },
  });
  return !!m;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const orgId = session?.user?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (role === Role.VIEWER) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = projectPostBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    name,
    kind,
    workType,
    clientId,
    newClientName,
    ownerId,
    budgetPlanned,
    currency,
    archiveState,
  } = parsed.data;

  if (ownerId) {
    const ok = await assertUserInOrg(orgId, ownerId);
    if (!ok) {
      return NextResponse.json({ error: "Ответственный не найден в организации" }, { status: 400 });
    }
  }

  let resolvedClientId: string | null = null;

  if (kind === ProjectKind.COMMERCIAL) {
    if (newClientName?.trim()) {
      const client = await prisma.client.create({
        data: {
          organizationId: orgId,
          name: newClientName.trim(),
        },
      });
      resolvedClientId = client.id;
    } else if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId, deletedAt: null },
      });
      if (!client) {
        return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
      }
      resolvedClientId = client.id;
    }
  } else if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId, deletedAt: null },
    });
    if (client) {
      resolvedClientId = client.id;
    }
  }

  const project = await prisma.project.create({
    data: {
      organizationId: orgId,
      clientId: resolvedClientId,
      ownerId: ownerId ?? null,
      name: name.trim(),
      kind,
      workType,
      archiveState,
      budgetPlanned: budgetPlanned ?? null,
      currency,
    },
    include: {
      client: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
}

function serializeProject(
  p: Project & {
    client: Client | null;
    owner: { id: string; name: string | null; email: string } | null;
  },
) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    workType: p.workType,
    archiveState: p.archiveState,
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
    taskCount: 0,
    timeEntryCount: 0,
  };
}
