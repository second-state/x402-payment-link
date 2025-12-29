import crypto from "crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

const API_KEY_HEADER = "authorization"; // expect "Bearer <key>"

export function generateApiKey() {
  return crypto.randomBytes(24).toString("base64url"); // ~32 chars URL-safe
}

export async function hashApiKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("base64");
}

export async function authenticateApiKey() {
  const hdrs = await headers();
  const authHeader = hdrs.get(API_KEY_HEADER);
  if (!authHeader) return null;
  const [scheme, key] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !key) return null;

  const hashed = await hashApiKey(key);
  const apiKey = await prisma.apiKey.findFirst({
    where: { hashedKey: hashed, revokedAt: null },
    include: { user: true },
  });
  if (!apiKey) return null;
  return apiKey.user;
}
