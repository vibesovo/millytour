import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { EVENTS, findTour } from "../data/catalog";

/**
 * Har oy takrorlanadigan turistik tadbirlar (festival, gastro kecha, trekking).
 *
 * Ma'lumot bazasi bo'sh bo'lsa katalog nusxasi ishlatiladi — shu tufayli
 * bo'lim hech qachon bo'sh ko'rinmaydi. Administrator `seed` bilan bazaga
 * ko'chirib, keyin tahrirlashi mumkin.
 */

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

export function monthName(month: number) {
  return MONTHS[(month - 1 + 12) % 12];
}

/** Joriy oydan keyingi eng yaqin takrorlanish necha oy qolgani. */
function monthsAhead(month: number, nowMonth: number) {
  return (month - nowMonth + 12) % 12;
}

function reasonFor(month: number, city: string, nowMonth: number) {
  const ahead = monthsAhead(month, nowMonth);
  if (ahead === 0) {
    return `${city} shahrida shu oy bo'lib o'tadi — joylar tez tugaydi.`;
  }
  if (ahead === 1) {
    return `Keyingi oy ${city} shahrida — hozir rejalashtirish eng qulay payt.`;
  }
  return `${ahead} oydan keyin ${city} shahrida — tayyorgarlik uchun qulay muddat.`;
}

export const list = query({
  args: {
    month: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const nowMonth = args.month ?? new Date().getMonth() + 1;
    const rows = await ctx.db.query("events").collect();
    const source =
      rows.length > 0
        ? rows
            .filter((r) => r.status === "published")
            .map((r) => ({
              slug: r.slug,
              title: r.title,
              city: r.city,
              month: r.month,
              dates: r.dates,
              kind: r.kind,
              summary: r.summary,
              packageSlugs: r.packageSlugs,
              directions: r.directions,
              price: r.price,
            }))
        : EVENTS.map((e) => ({ ...e }));

    const sorted = source.sort(
      (a, b) => monthsAhead(a.month, nowMonth) - monthsAhead(b.month, nowMonth),
    );

    return sorted.slice(0, args.limit ?? 6).map((e) => ({
      ...e,
      monthLabel: monthName(e.month),
      monthsAhead: monthsAhead(e.month, nowMonth),
      isCurrentMonth: monthsAhead(e.month, nowMonth) === 0,
      reason: reasonFor(e.month, e.city, nowMonth),
      packages: e.packageSlugs
        .map((slug) => findTour(slug))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .slice(0, 2)
        .map((t) => ({ slug: t.slug, title: t.title, city: t.city, priceFrom: t.priceFrom })),
    }));
  },
});

/** Administrator: tadbirlarni bazaga ko'chirish. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    let created = 0;
    for (const e of EVENTS) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", e.slug))
        .first();
      if (existing) {
        continue;
      }
      await ctx.db.insert("events", {
        ...e,
        status: "published",
        source: "catalog",
        createdAt: Date.now(),
      });
      created += 1;
    }
    return { created };
  },
});

/** Administrator ro'yxati. */
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("events").collect();
    return rows.sort((a, b) => a.month - b.month);
  },
});
