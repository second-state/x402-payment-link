import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const paramsSchema = z.object({
  slug: z.string(),
});

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url().optional(),
  price: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
});

export async function GET(_req: Request, context: { params: unknown }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { slug: parsed.data.slug, userId: session.user.id },
    include: { prices: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PUT(req: Request, context: { params: unknown }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsedBody = updateSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsedBody.error.format() }, { status: 400 });
  }

  const { slug } = parsedParams.data;
  const data = parsedBody.data;

  try {
    const existing = await prisma.product.findFirst({
      where: { slug, userId: session.user.id },
      include: { prices: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: {
          slug: data.slug ?? slug,
          name: data.name,
          description: data.description,
          image: data.image,
        },
      });

      const existingPrice = existing.prices[0];
      if (existingPrice) {
        await tx.price.update({
          where: { id: existingPrice.id },
          data: { amount: data.price, shipping: data.shipping },
        });
      } else {
        await tx.price.create({
          data: {
            productId: existing.id,
            amount: data.price,
            shipping: data.shipping,
          },
        });
      }

      const prices = await tx.price.findMany({ where: { productId: existing.id } });
      return { ...updated, prices };
    });
    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists for this user" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
