import { type Deal, DealStage, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const postBody = z
  .object({
    clientId: z.string().cuid().optional(),
    newClientName: z.string().min(1).max(200).optional(),
    title: z.string().min(1).max(300),
    amount: z.coerce.number().min(0).optional().default(0),
    currency: z.string().length(3).optional().default("RUB"),
  })
  .superRefine((data, ctx) => {
    const hasNew = !!(data.newClientName && data.newClientName.trim());
    const hasId = !!data.clientId;
    if (!hasNew && !hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите клиента или укажите имя нового лида",
        path: ["clientId"],
      });
    }
    if (hasNew && hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите только один вариант: клиент из списка или новое имя",
        path: ["newClientName"],
      });
    }
  });

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

  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Некорректные данные";
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  const { clientId, newClientName, title, amount, currency } = parsed.data;

  let resolvedClientId: string;

  if (newClientName?.trim()) {
    const client = await prisma.client.create({
      data: {
        organizationId: orgId,
        name: newClientName.trim(),
      },
    });
    resolvedClientId = client.id;
  } else {
    const client = await prisma.client.findFirst({
      where: { id: clientId!, organizationId: orgId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
    }
    resolvedClientId = client.id;
  }

  const deal = await prisma.deal.create({
    data: {
      organizationId: orgId,
      clientId: resolvedClientId,
      title: title.trim(),
      stage: DealStage.LEAD,
      amount,
      currency,
    },
    include: { client: true },
  });

  return NextResponse.json({ deal: serializeDeal(deal) }, { status: 201 });
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
