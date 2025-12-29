import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { authenticateApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const apiUser = await authenticateApiKey();
  const session = await auth();
  const userId = apiUser?.id || session?.user?.id;
  const isApiKey = Boolean(apiUser);
  if (!userId && !isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: userId ? { link: { userId } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      total: o.total.toString(),
    })),
  });
}

const createSchema = z.object({
  orderId: z.string(),
  linkCode: z.string(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive().default(1),
  total: z.coerce.number().nonnegative().default(0),
  currency: z.string().optional(),
  requireShipping: z.coerce.boolean().optional(),
  payment: z.coerce.boolean().optional(),
  txHash: z.string().optional().nullable(),
  txNetwork: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const apiUser = await authenticateApiKey();
  const session = await auth();
  if (!apiUser && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;

  const link = await prisma.link.findFirst({
    where: { code: data.linkCode },
  });
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const total = new Prisma.Decimal(data.total || 0);
  const payment = data.payment ?? false;
  const requireShipping = data.requireShipping ?? link.requireShipping;

  const order = await prisma.order.upsert({
    where: { orderId: data.orderId },
    create: {
      orderId: data.orderId,
      linkId: link.id,
      linkCode: link.code,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      name: data.name ?? undefined,
      address1: data.address1 ?? undefined,
      address2: data.address2 ?? undefined,
      state: data.state ?? undefined,
      zip: data.zip ?? undefined,
      country: data.country ?? undefined,
      quantity: data.quantity,
      total,
      currency: data.currency || "USD",
      requireShipping,
      payment,
      txHash: data.txHash ?? undefined,
      txNetwork: data.txNetwork ?? undefined,
      paidAt: payment ? new Date() : null,
    },
    update: {
      linkId: link.id,
      linkCode: link.code,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      name: data.name ?? undefined,
      address1: data.address1 ?? undefined,
      address2: data.address2 ?? undefined,
      state: data.state ?? undefined,
      zip: data.zip ?? undefined,
      country: data.country ?? undefined,
      quantity: data.quantity,
      total,
      currency: data.currency || "USD",
      requireShipping,
      payment,
      txHash: data.txHash ?? undefined,
      txNetwork: data.txNetwork ?? undefined,
      paidAt: payment ? new Date() : null,
    },
  });

  return NextResponse.json({
    order: {
      ...order,
      total: order.total.toString(),
    },
  });
}
