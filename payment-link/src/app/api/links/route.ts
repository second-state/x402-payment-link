import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  productSlugs: z.array(z.string()).min(1),
  network: z.enum(["base", "base-sepolia", "base-mainnet"]).default("base-sepolia"),
  payToAddress: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  requireShipping: z.coerce.boolean().optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

function serializeLink(link: any) {
  return { ...link, network: link.network?.replace("_", "-") };
}

function randomCode(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 50;

  const links = await prisma.link.findMany({
    take: limit,
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ links: links.map(serializeLink) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;

  const products = await prisma.product.findMany({
    where: { userId: session.user.id, slug: { in: data.productSlugs } },
    include: { prices: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (products.length !== data.productSlugs.length) {
    return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
  }
  if (products.some((p) => (p.prices ?? []).length === 0)) {
    return NextResponse.json({ error: "One or more products are missing prices" }, { status: 400 });
  }

  const code = randomCode(8);
  const link = await prisma.link.create({
      data: {
        code,
        network: data.network.replace("-", "_") as "base" | "base_sepolia" | "base_mainnet", // map to enum naming
        payToAddress: data.payToAddress,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
        requireShipping: data.requireShipping ?? true,
        userId: session.user.id,
        linkProducts: {
          create: products.map((p) => ({
            productId: p.id,
            priceId: p.prices[0]?.id ?? null,
          })),
        },
      },
    include: {
      linkProducts: {
        include: {
          product: true,
          price: true,
        },
      },
    },
  });

  return NextResponse.json({ link: serializeLink(link) }, { status: 201 });
}
