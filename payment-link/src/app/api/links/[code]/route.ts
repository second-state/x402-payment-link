import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { authenticateApiKey } from "@/lib/api-key";

const paramsSchema = z.object({
  code: z.string(),
});

const updateSchema = z.object({
  network: z.enum(["base", "base-sepolia", "base-mainnet"]).optional(),
  payToAddress: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  requireShipping: z.coerce.boolean().optional(),
});

function serializeLink(link: any) {
  return { ...link, network: link.network?.replace("_", "-") };
}

export async function GET(_req: Request, context: { params: unknown }) {
  const apiUser = await authenticateApiKey();
  const session = await auth();
  const userId = apiUser?.id || session?.user?.id;
  const isApiKey = Boolean(apiUser);
  if (!userId && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const link = await prisma.link.findFirst({
    where: isApiKey ? { code: parsed.data.code } : { code: parsed.data.code, userId },
    include: {
      linkProducts: {
        include: {
          product: {
            include: {
              prices: true,
            },
          },
          price: true,
        },
      },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ link: serializeLink(link) });
}

export async function PUT(req: Request, context: { params: unknown }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsedBody = updateSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsedBody.error.format() }, { status: 400 });
  }

  const code = parsedParams.data.code;
  const data = parsedBody.data;

  const existing = await prisma.link.findFirst({
    where: { code, userId: session.user.id },
    include: {
      linkProducts: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const link = await prisma.link.update({
    where: { id: existing.id },
    data: {
      network: data.network ? (data.network.replace("-", "_") as "base" | "base_sepolia" | "base_mainnet") : existing.network,
      payToAddress: data.payToAddress ?? existing.payToAddress,
      successUrl: data.successUrl ?? existing.successUrl,
      cancelUrl: data.cancelUrl ?? existing.cancelUrl,
      requireShipping: data.requireShipping ?? existing.requireShipping,
    },
    include: {
      linkProducts: {
        include: { product: true, price: true },
      },
    },
  });

  return NextResponse.json({ link: serializeLink(link) });
}
