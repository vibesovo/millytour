import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";

/** Sharhlar: reyting ham paketga, ham hamkorga shu yerdan qayta hisoblanadi. */

export const create = mutation({
  args: {
    bookingId: v.id("bookings"),
    rating: v.number(),
    text: v.string(),
  },
  handler: async (ctx, { bookingId, rating, text }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Buyurtma topilmadi.");
    }
    if (booking.userId !== user._id) {
      throw new Error("Faqat o'z buyurtmangizga sharh yozishingiz mumkin.");
    }
    if (booking.status !== "completed" && booking.status !== "confirmed") {
      throw new Error("Sharh faqat tasdiqlangan yoki bajarilgan buyurtmaga yoziladi.");
    }
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .first();
    if (existing) {
      throw new Error("Bu buyurtmaga allaqachon sharh yozilgan.");
    }

    const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
    const reviewId = await ctx.db.insert("reviews", {
      userId: user._id,
      bookingId,
      packageSlug: booking.packageSlug,
      providerId: booking.providerId,
      authorName: user.name ?? "Millytour sayohatchisi",
      rating: safeRating,
      text: text.trim().slice(0, 1200),
      visible: true,
      createdAt: Date.now(),
    });

    // Paket reytingi (bazadagi paketlar uchun)
    if (booking.packageSlug) {
      const pkg = await ctx.db
        .query("packages")
        .withIndex("by_slug", (q) => q.eq("slug", booking.packageSlug!))
        .first();
      if (pkg) {
        const all = await ctx.db
          .query("reviews")
          .withIndex("by_package", (q) => q.eq("packageSlug", booking.packageSlug))
          .collect();
        const visible = all.filter((r) => r.visible);
        const avg = visible.reduce((sum, r) => sum + r.rating, 0) / Math.max(visible.length, 1);
        await ctx.db.patch(pkg._id, {
          rating: Math.round(avg * 10) / 10,
          reviews: pkg.reviews + 1,
          updatedAt: Date.now(),
        });
      }
    }

    // Hamkor reytingi
    if (booking.providerId) {
      const provider = await ctx.db.get(booking.providerId);
      if (provider) {
        const all = await ctx.db
          .query("reviews")
          .withIndex("by_provider", (q) => q.eq("providerId", booking.providerId))
          .collect();
        const visible = all.filter((r) => r.visible);
        const avg = visible.reduce((sum, r) => sum + r.rating, 0) / Math.max(visible.length, 1);
        await ctx.db.patch(provider._id, {
          rating: Math.round(avg * 10) / 10,
          ratingCount: visible.length,
        });
        await ctx.db.insert("botEvents", {
          bot: "main",
          direction: provider.direction,
          providerId: provider._id,
          kind: "review",
          text: `Yangi sharh: ${safeRating}/5 — ${booking.title}`,
          status: "sent",
          createdAt: Date.now(),
        });
      }
    }

    return { reviewId };
  },
});

export const forPackage = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_package", (q) => q.eq("packageSlug", slug))
      .collect();
    return rows
      .filter((r) => r.visible)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 8);
  },
});

export const forProvider = query({
  args: { providerId: v.id("providers"), limit: v.optional(v.number()) },
  handler: async (ctx, { providerId, limit }) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_provider", (q) => q.eq("providerId", providerId))
      .collect();
    return rows
      .filter((r) => r.visible)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 20);
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return [];
    }
    return await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/** Bosh sahifadagi "Sayohatchilar fikri" bo'limi uchun. */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("reviews").collect();
    return rows
      .filter((r) => r.visible && r.text.length > 20)
      .sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt)
      .slice(0, limit ?? 6);
  },
});

export const setVisible = mutation({
  args: { reviewId: v.id("reviews"), visible: v.boolean() },
  handler: async (ctx, { reviewId, visible }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(reviewId, { visible });
    return { ok: true };
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("reviews").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});
