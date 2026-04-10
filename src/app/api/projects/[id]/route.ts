import { Prisma, ProjectKind, ProjectWorkType, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchBody = z.object({
  ownerId: z.string().cuid().optional().nullable(),
  kind: z.nativeEnum(ProjectKind).optional(),
  workType: z.nativeEnum(ProjectWorkType).optional(),
  budgetPlanned: z.coerce.number().min(0).optional().nullable(),
});

async function assertUserInOrg(organizationId: string, userId: string) {
  const m = await prisma.membership.findFirst({
    where: { organizationId, userId },
  });
  return !!m;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const orgId = session?.user?.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (role === Role.VIEWER) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { id } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!project) {
    return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const { ownerId, kind, workType, budgetPlanned } = parsed.data;

  if (ownerId !== undefined && ownerId !== null) {
    const ok = await assertUserInOrg(orgId, ownerId);
    if (!ok) {
      return NextResponse.json({ error: "Ответственный не найден в организации" }, { status: 400 });
    }
  }

  const nextKind = kind ?? project.kind;
  if (nextKind === ProjectKind.COMMERCIAL && !project.clientId) {
    return NextResponse.json(
      { error: "Сначала укажите клиента у проекта, чтобы перевести его в коммерческие" },
      { status: 400 },
    );
  }

  const updateData: Prisma.ProjectUncheckedUpdateInput = {};
  if (ownerId !== undefined) {
    updateData.ownerId = ownerId;
  }
  if (kind !== undefined) {
    updateData.kind = kind;
  }
  if (workType !== undefined) {
    updateData.workType = workType;
  }
  if (budgetPlanned !== undefined) {
    updateData.budgetPlanned = budgetPlanned;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: updateData,
    include: {
      client: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true, timeEntries: true } },
    },
  });

  return NextResponse.json({
    project: {
      id: updated.id,
      name: updated.name,
      kind: updated.kind,
      workType: updated.workType,
      status: updated.status,
      budgetPlanned: updated.budgetPlanned != null ? Number(updated.budgetPlanned) : null,
      currency: updated.currency,
      createdAt: updated.createdAt.toISOString(),
      client: updated.client ? { id: updated.client.id, name: updated.client.name } : null,
      owner: updated.owner
        ? {
            id: updated.owner.id,
            label: updated.owner.name?.trim() || updated.owner.email,
          }
        : null,
      taskCount: updated._count.tasks,
      timeEntryCount: updated._count.timeEntries,
    },
  });
}
