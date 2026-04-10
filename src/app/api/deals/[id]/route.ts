import { type Deal, DealStage, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchBody = z.object({
  stage: z.nativeEnum(DealStage),
  lostReason: z.string().max(2000).optional().nullable(),
});

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
  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!deal) {
    return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
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

  const { stage, lostReason } = parsed.data;
  if (stage === DealStage.LOST) {
    const reason = lostReason?.trim() ?? "";
    if (!reason) {
      return NextResponse.json(
        { error: "Укажите причину провала" },
        { status: 400 },
      );
    }
    const updated = await prisma.deal.update({
      where: { id },
      data: { stage: DealStage.LOST, lostReason: reason },
      include: { client: true },
    });
    return NextResponse.json({ deal: serializeDeal(updated) });
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: { stage, lostReason: null },
    include: { client: true },
  });
  return NextResponse.json({ deal: serializeDeal(updated) });
}

function serializeDeal(d: Deal & { client: { id: string; name: string } }) {
  return {
    id: d.id,
    title: d.title,
    stage: d.stage,
    lostReason: d.lostReason,
    amount: Number(d.amount),
    currency: d.currency,
    client: { id: d.client.id, name: d.client.name },
  };
}
