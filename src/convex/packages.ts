import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin, reference } from "./lib/access";
import { getCurrentUser } from "./users";
import { TOUR_PACKAGES } from "../data/catalog";
import {
  packageBadgeValidator,
  packageCategoryValidator,
  packageStatusValidator,
} from "./schema";

/**
 * Tur paketlar katalogi. Administrator bazaga ko'chirgach (seedCatalog),
 * narx/badge/holat shu yerdan boshqariladi. Baza bo'sh bo'lsa sayt
 * `src/data/catalog.ts` dagi statik katalogga qaytadi — shu sababli
 * sayt hech qachon bo'sh ko'rinmaydi.
 */

export type PackageRow = {
  key: string;
  dbId: string | null;
  slug: string;
  title: string;
  summary: string;
  category: "historical" | "eco" | "craft" | "pilgrimage" | "adventure";
  city: string;
  region: string;
  days: number;
  nights: number;
  priceFrom: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  groupSize: string;
  nextDeparture: string;
  languages: string[];
  includes: string[];
  highlights: string[];
  image: string;
  alt: string;
  badge?: "Best Seller" | "Hot Deal" | "New";
  status: "published" | "draft" | "archived";
  featured: boolean;
  source: "catalog" | "admin";
};

function fromDoc(doc: Doc<"packages">): PackageRow {
  return {
    key: doc._id,
    dbId: doc._id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    category: doc.category,
    city: doc.city,
    region: doc.region,
    days: doc.days,
    nights: doc.nights,
    priceFrom: doc.priceFrom,
    oldPrice: doc.oldPrice,
    rating: doc.rating,
    reviews: doc.reviews,
    groupSize: doc.groupSize,
    nextDeparture: doc.nextDeparture,
    languages: doc.languages,
    includes: doc.includes,
    highlights: doc.highlights,
    image: doc.image,
    alt: doc.alt,
    badge: doc.badge,
    status: doc.status,
    featured: doc.featured,
    source: doc.source,
  };
}

function fromCatalog(t: (typeof TOUR_PACKAGES)[number]): PackageRow {
  return {
    key: `catalog:${t.slug}`,
    dbId: null,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    category: t.category,
    city: t.city,
    region: t.region,
    days: t.days,
    nights: t.nights,
    priceFrom: t.priceFrom,
    oldPrice: t.oldPrice,
    rating: t.rating,
    reviews: t.reviews,
    groupSize: t.groupSize,
    nextDeparture: t.nextDeparture,
    languages: t.languages,
    includes: t.includes,
    highlights: t.highlights,
    image: t.image,
    alt: t.alt,
    badge: t.badge,
    status: "published",
    featured: Boolean(t.badge),
    source: "catalog",
  };
}

function sortRows(rows: PackageRow[]) {
  return [...rows].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      b.rating * b.reviews - a.rating * a.reviews,
  );
}

/** Sayt uchun paketlar ro'yxati (baza bo'sh bo'lsa statik katalog). */
export const list = query({
  args: {
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("packages").collect();
    const published = docs.filter((d) => d.status === "published");
    let rows =
      published.length > 0 ? published.map(fromDoc) : TOUR_PACKAGES.map(fromCatalog);

    if (args.category && args.category !== "all") {
      rows = rows.filter((r) => r.category === args.category);
    }
    if (args.city) {
      const needle = args.city.toLowerCase();
      rows = rows.filter(
        (r) => r.city.toLowerCase().includes(needle) || r.region.toLowerCase().includes(needle),
      );
    }
    if (args.q) {
      const needle = args.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(needle) ||
          r.city.toLowerCase().includes(needle) ||
          r.highlights.some((h) => h.toLowerCase().includes(needle)),
      );
    }

    const sorted = sortRows(rows);
    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

/**
 * "Aynan siz uchun" — foydalanuvchining oldingi bronlari, qiziqishlari va
 * paket reytingi asosida saralangan tavsiyalar (sababi bilan).
 */
export const recommended = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    const docs = await ctx.db.query("packages").collect();
    const published = docs.filter((d) => d.status === "published");
    const rows =
      published.length > 0 ? published.map(fromDoc) : TOUR_PACKAGES.map(fromCatalog);

    let cities: string[] = [];
    let interests: string[] = [];
    if (user) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      cities = bookings.map((b) => b.city.toLowerCase());
      interests = user.interests ?? [];
    }

    const scored = rows.map((row) => {
      const cityKey = row.city.toLowerCase();
      const visited = cities.some((c) => c.includes(cityKey) || cityKey.includes(c));
      const interestMatch = interests.some(
        (i) =>
          row.category === i.toLowerCase() ||
          row.highlights.some((h) => h.toLowerCase().includes(i.toLowerCase())),
      );
      const score =
        row.rating * 2 +
        Math.min(row.reviews / 100, 3) +
        (visited ? 3 : 0) +
        (interestMatch ? 2 : 0) +
        (row.featured ? 1 : 0);
      const reason = visited
        ? `${row.city} yo'nalishida bo'lgansiz — mavsumiy chegirma mavjud`
        : interestMatch
          ? `Qiziqishlaringizga mos paket (${row.category})`
          : cities.length === 0
            ? "Yangi sayohatchilar uchun eng yuqori bahoga ega"
            : "Eng ko'p tanlangan paketlardan biri";
      return { ...row, reason, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit ?? 6);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("packages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (doc && doc.status !== "archived") {
      return fromDoc(doc);
    }
    const fallback = TOUR_PACKAGES.find((t) => t.slug === slug);
    return fallback ? fromCatalog(fallback) : null;
  },
});

/** Administrator uchun to'liq ro'yxat (qoralama va arxiv bilan). */
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const docs = await ctx.db.query("packages").collect();
    return docs.sort((a, b) => b.updatedAt - a.updatedAt).map(fromDoc);
  },
});

/** Statik katalogni bazaga ko'chirish (bir marta). */
export const seedCatalog = mutation({
  args: { overwritePrices: v.optional(v.boolean()) },
  handler: async (ctx, { overwritePrices }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const tour of TOUR_PACKAGES) {
      const existing = await ctx.db
        .query("packages")
        .withIndex("by_slug", (q) => q.eq("slug", tour.slug))
        .first();

      if (existing) {
        if (overwritePrices) {
          await ctx.db.patch(existing._id, {
            priceFrom: tour.priceFrom,
            oldPrice: tour.oldPrice,
            updatedAt: now,
          });
          updated += 1;
        }
        continue;
      }

      await ctx.db.insert("packages", {
        slug: tour.slug,
        title: tour.title,
        summary: tour.summary,
        category: tour.category,
        city: tour.city,
        region: tour.region,
        days: tour.days,
        nights: tour.nights,
        priceFrom: tour.priceFrom,
        oldPrice: tour.oldPrice,
        rating: tour.rating,
        reviews: tour.reviews,
        groupSize: tour.groupSize,
        nextDeparture: tour.nextDeparture,
        languages: tour.languages,
        includes: tour.includes,
        highlights: tour.highlights,
        image: tour.image,
        alt: tour.alt,
        badge: tour.badge,
        status: "published",
        featured: Boolean(tour.badge),
        source: "catalog",
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted, updated, total: TOUR_PACKAGES.length };
  },
});

/** Narx, badge, holat va tavsiya etilishini boshqarish. */
export const update = mutation({
  args: {
    packageId: v.id("packages"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    priceFrom: v.optional(v.number()),
    oldPrice: v.optional(v.number()),
    badge: v.optional(packageBadgeValidator),
    clearBadge: v.optional(v.boolean()),
    status: v.optional(packageStatusValidator),
    featured: v.optional(v.boolean()),
    nextDeparture: v.optional(v.string()),
    groupSize: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { packageId, clearBadge, ...rest } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    if (clearBadge) {
      patch.badge = undefined;
    }
    await ctx.db.patch(packageId, patch);
    return { ok: true };
  },
});

/** Yangi paket qo'shish. */
export const create = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    category: packageCategoryValidator,
    city: v.string(),
    region: v.string(),
    days: v.number(),
    nights: v.number(),
    priceFrom: v.number(),
    oldPrice: v.optional(v.number()),
    image: v.string(),
    alt: v.string(),
    groupSize: v.string(),
    nextDeparture: v.string(),
    languages: v.array(v.string()),
    includes: v.array(v.string()),
    highlights: v.array(v.string()),
    badge: v.optional(packageBadgeValidator),
    featured: v.boolean(),
    status: packageStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slugBase = args.title
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF ]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const slug = `${slugBase || "paket"}-${reference().slice(-4).toLowerCase()}`;
    const existing = await ctx.db
      .query("packages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      throw new Error("Bu nomdagi paket allaqachon mavjud.");
    }
    const now = Date.now();
    const packageId = await ctx.db.insert("packages", {
      ...args,
      slug,
      rating: 0,
      reviews: 0,
      source: "admin",
      createdAt: now,
      updatedAt: now,
    });
    return { packageId, slug };
  },
});
