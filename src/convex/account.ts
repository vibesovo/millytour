import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/access";
import { getCurrentUser } from "./users";

/** Foydalanuvchi profili (til, Telegram holati, rol). */
export const profile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    return {
      name: user.name ?? null,
      email: user.email ?? null,
      language: user.language ?? "UZ",
      telegramId: user.telegramId ?? null,
      role: user.role ?? "user",
      interests: user.interests ?? [],
    };
  },
});

/** Interfeys tilini saqlash (UZ / RU / EN). */
export const setLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, { language }) => {
    const user = await requireUser(ctx);
    const normalized = language.toUpperCase().slice(0, 2);
    await ctx.db.patch(user._id, { language: normalized });
    return { language: normalized };
  },
});

/**
 * Onboarding yakuni: ism, shahar va qiziqishlar saqlanadi hamda `onboardedAt`
 * belgilanadi — endi onboarding oynasi qayta chiqmaydi.
 */
export const completeOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { name, city, interests }) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      name: name || user.name,
      country: city || user.country,
      interests: interests && interests.length > 0 ? interests : user.interests,
      onboardedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Turist qiziqishlarini saqlash — tavsiyalar shu asosida aniqlashtiriladi. */
export const setInterests = mutation({
  args: { interests: v.array(v.string()) },
  handler: async (ctx, { interests }) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { interests: interests.slice(0, 8) });
    return { ok: true };
  },
});
