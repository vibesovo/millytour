import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../users";

/** Convex Auth bilan bog'langan joriy foydalanuvchi (majburiy). */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Avval tizimga kiring.");
  }
  return user;
}

/** Millytour administratori huquqi. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Bu amal uchun administrator huquqi kerak.");
  }
  return user;
}

export async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  return user?.role === "admin";
}

export function reference() {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY3479";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MLT-${out}`;
}
