import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const querySchema = z.object({
  includePrices: z.coerce.boolean().optional(),
});

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url().optional(),
  price: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  const includePrices = parsed.success && parsed.data.includePrices;

  const products = await prisma.product.findMany({
    where: { active: true, userId: session.user.id },
    orderBy: { slug: "asc" },
    include: includePrices ? { prices: true } : undefined,
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        image: data.image,
        userId: session.user.id,
        prices: {
          create: [
            {
              amount: data.price,
              shipping: data.shipping,
            },
          ],
        },
      },
      include: { prices: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
