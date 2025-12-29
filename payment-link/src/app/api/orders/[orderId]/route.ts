import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { authenticateApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  orderId: z.string(),
});

export async function GET(_req: Request, context: { params: unknown }) {
  const apiUser = await authenticateApiKey();
  const session = await auth();
  if (!apiUser && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderId: parsedParams.data.orderId },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      ...order,
      total: order.total.toString(),
    },
  });
}

const updateSchema = z.object({
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive().optional(),
  total: z.coerce.number().nonnegative().optional(),
  currency: z.string().optional(),
  requireShipping: z.coerce.boolean().optional(),
  payment: z.coerce.boolean().optional(),
  txHash: z.string().optional().nullable(),
  txNetwork: z.string().optional().nullable(),
});

export async function PUT(req: Request, context: { params: unknown }) {
  const apiUser = await authenticateApiKey();
  const session = await auth();
  if (!apiUser && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderId: parsedParams.data.orderId },
    include: { link: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  const payment = data.payment ?? order.payment;
  const total = typeof data.total === "number" ? new Prisma.Decimal(data.total) : undefined;

  const updated = await prisma.order.update({
    where: { orderId: parsedParams.data.orderId },
    data: {
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      name: data.name ?? undefined,
      address1: data.address1 ?? undefined,
      address2: data.address2 ?? undefined,
      state: data.state ?? undefined,
      zip: data.zip ?? undefined,
      country: data.country ?? undefined,
      quantity: data.quantity ?? undefined,
      total: total ?? undefined,
      currency: data.currency ?? undefined,
      requireShipping: data.requireShipping ?? undefined,
      payment,
      txHash: data.txHash ?? undefined,
      txNetwork: data.txNetwork ?? undefined,
      paidAt: payment ? new Date() : order.paidAt,
    },
  });

  return NextResponse.json({
    order: {
      ...updated,
      total: updated.total.toString(),
    },
  });
}
