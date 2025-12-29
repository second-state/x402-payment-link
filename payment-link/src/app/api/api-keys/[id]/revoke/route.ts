import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string(),
});

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: parsed.data.id },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (apiKey.revokedAt) {
    return NextResponse.json({ error: "Already revoked" }, { status: 400 });
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
