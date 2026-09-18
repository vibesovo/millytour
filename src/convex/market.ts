import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";

/** Approve qilingan hamkor mahsulotlari — sayt katalogiga qo'shiladi. */
export const approved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("marketItems")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
  },
});

/** Hamkor panelidan mahsulot qo'shish. */
export const addItem = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    price: v.number(),
    handmadeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      throw new Error("Hamkor profili topilmadi.");
    }
    if (provider.direction !== "artisan") {
      throw new Error("Mahsulot joylash faqat hunarmandlar uchun.");
    }
    const id = await ctx.db.insert("marketItems", {
      providerId: provider._id,
      title: args.title,
      category: args.category,
      city: provider.city,
      price: args.price,
      seller: provider.businessName,
      handmadeDays: args.handmadeDays ?? 7,
      status: "pending",
      source: "panel",
      createdAt: Date.now(),
    });
    return { itemId: id };
  },
});

export const myItems = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return [];
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      return [];
    }
    const rows = await ctx.db
      .query("marketItems")
      .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const pending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("marketItems")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const moderate = mutation({
  args: {
    itemId: v.id("marketItems"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, { itemId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(itemId, { status });
    return { ok: true };
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("marketItems") },
  handler: async (ctx, { itemId }) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item) {
      return { ok: true };
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (user.role !== "admin" && item.providerId !== provider?._id) {
      throw new Error("Bu mahsulotni o'chirish huquqi yo'q.");
    }
    await ctx.db.delete(itemId);
    return { ok: true };
  },
});
