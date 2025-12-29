import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashApiKey, generateApiKey } from "@/lib/api-key";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({ apiKeys: keys });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const rawKey = generateApiKey();
  const hashed = await hashApiKey(rawKey);

  const record = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      hashedKey: hashed,
    },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json(
    {
      apiKey: record,
      secret: rawKey, // only returned once
    },
    { status: 201 },
  );
}
