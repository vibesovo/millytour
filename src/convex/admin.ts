import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";
import { getCurrentUser } from "./users";
import { roleValidator, type Direction } from "./schema";
import { MONTHLY_FEE } from "./providers";

/** Tizimda administrator bormi — birinchi administratorni tayinlash uchun. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const admins = await ctx.db.query("users").collect();
    const adminCount = admins.filter((u) => u.role === "admin").length;
    return {
      isSignedIn: user !== null,
      isAdmin: user?.role === "admin",
      adminCount,
    };
  },
});

/** Faqat administrator hali yo'q bo'lsa ishlaydi. */
export const claimAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const all = await ctx.db.query("users").collect();
    const adminCount = all.filter((u) => u.role === "admin").length;
    if (adminCount > 0 && user.role !== "admin") {
      throw new Error("Administrator allaqachon tayinlangan.");
    }
    await ctx.db.patch(user._id, { role: "admin" });
    return { ok: true };
  },
});

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, { userId, role }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(userId, { role });
    return { ok: true };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [users, providers, bookings, items, events] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("providers").collect(),
      ctx.db.query("bookings").collect(),
      ctx.db.query("marketItems").collect(),
      ctx.db.query("botEvents").collect(),
    ]);

    const paid = bookings.filter((b) => b.paymentStatus === "paid");
    const gross = paid.reduce((sum, b) => sum + b.totalPrice, 0);
    const subscriptionRevenue = providers
      .filter((p) => p.subscription === "active")
      .reduce((sum, p) => sum + p.monthlyFee, 0);

    const byDirection = (["guide", "transfer", "artisan", "hotel"] as Direction[]).map(
      (direction) => {
        const rows = providers.filter((p) => p.direction === direction);
        return {
          direction,
          total: rows.length,
          approved: rows.filter((p) => p.status === "approved").length,
          pending: rows.filter((p) => p.status === "pending").length,
          mrr: rows.filter((p) => p.subscription === "active").length * MONTHLY_FEE[direction],
        };
      },
    );

    const days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - i));
      const start = date.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const dayBookings = bookings.filter((b) => b.createdAt >= start && b.createdAt < end);
      return {
        day: `${date.getDate()}/${date.getMonth() + 1}`,
        bookings: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    });

    return {
      totals: {
        users: users.length,
        tourists: users.filter((u) => u.role !== "admin" && u.role !== "member").length,
        providers: providers.length,
        pendingProviders: providers.filter((p) => p.status === "pending").length,
        approvedProviders: providers.filter((p) => p.status === "approved").length,
        bookings: bookings.length,
        openBookings: bookings.filter((b) => b.status === "new").length,
        gross,
        commission: Math.round(gross * 0.12),
        subscriptionRevenue,
        pendingItems: items.filter((i) => i.status === "pending").length,
        botEvents: events.length,
      },
      byDirection,
      series: days,
      recentBookings: bookings.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
      topProviders: providers
        .sort((a, b) => b.completedOrders - a.completedOrders)
        .slice(0, 5),
    };
  },
});

/** Demo ma'lumotlar: panellar bo'sh ko'rinmasligi uchun bir marta yuklanadi. */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("providers").collect();
    if (existing.length > 0) {
      return { seeded: false, reason: "Ma'lumot allaqachon mavjud." };
    }

    const demo: Array<{
      direction: Direction;
      businessName: string;
      city: string;
      phone: string;
      status: "approved" | "pending";
      rating: number;
      ratingCount: number;
      completedOrders: number;
      telegramUsername: string;
    }> = [
      {
        direction: "guide",
        businessName: "Dilshod Rasulov — shahar gidlar jamoasi",
        city: "Samarqand",
        phone: "+998 91 234 56 78",
        status: "approved",
        rating: 4.9,
        ratingCount: 187,
        completedOrders: 203,
        telegramUsername: "dilshod_guide",
      },
      {
        direction: "transfer",
        businessName: "Zarafshon Transfer",
        city: "Buxoro",
        phone: "+998 93 111 22 33",
        status: "approved",
        rating: 4.7,
        ratingCount: 96,
        completedOrders: 148,
        telegramUsername: "zarafshon_transfer",
      },
      {
        direction: "artisan",
        businessName: "Rishton kulolchilik ustaxonasi",
        city: "Rishton",
        phone: "+998 90 777 88 99",
        status: "approved",
        rating: 4.9,
        ratingCount: 74,
        completedOrders: 121,
        telegramUsername: "rishton_ceramics",
      },
      {
        direction: "hotel",
        businessName: "Ichan Qal'a Boutique Hotel",
        city: "Xiva",
        phone: "+998 62 375 00 00",
        status: "pending",
        rating: 0,
        ratingCount: 0,
        completedOrders: 0,
        telegramUsername: "ichanqala_hotel",
      },
    ];

    const now = Date.now();
    for (const d of demo) {
      const providerId = await ctx.db.insert("providers", {
        direction: d.direction,
        businessName: d.businessName,
        contactName: d.businessName.split(" ")[0],
        city: d.city,
        phone: d.phone,
        telegramUsername: d.telegramUsername,
        telegramId: 100000000 + Math.floor(Math.random() * 999999),
        about: "millytour hamkori",
        languages: ["UZ", "RU", "EN"],
        status: d.status,
        monthlyFee: MONTHLY_FEE[d.direction],
        subscription: d.status === "approved" ? "active" : "trial",
        paidUntil: d.status === "approved" ? now + 30 * 24 * 3600 * 1000 : undefined,
        rating: d.rating,
        ratingCount: d.ratingCount,
        completedOrders: d.completedOrders,
        walletBalance: d.completedOrders * 90,
        rooms: d.direction === "hotel" ? 14 : undefined,
        licenseNumber: d.direction === "guide" ? "GID-2026-0451" : undefined,
        vehicle:
          d.direction === "transfer"
            ? {
                model: "Hyundai H1",
                year: 2022,
                seats: 8,
                plate: "80 A 777 BA",
                condition: "ok",
                conditionCheckedAt: now,
              }
            : undefined,
        source: "bot",
        createdAt: now - Math.floor(Math.random() * 30) * 24 * 3600 * 1000,
        approvedAt: d.status === "approved" ? now - 15 * 24 * 3600 * 1000 : undefined,
      });

      await ctx.db.insert("botEvents", {
        bot: "auth",
        direction: d.direction,
        providerId,
        kind: "registration",
        text: `${d.businessName} auth bot orqali ro'yxatdan o'tdi`,
        status: "sent",
        createdAt: now - 20 * 24 * 3600 * 1000,
      });
    }

    const demoBookings: Array<{
      kind: "package" | "guide" | "transfer" | "hotel" | "marketplace";
      title: string;
      city: string;
      days: number;
      guests: number;
      totalPrice: number;
      status: "new" | "confirmed" | "completed" | "cancelled";
      method: "click" | "payme" | "visa" | "mastercard";
    }> = [
      { kind: "package", title: "Samarqand ikonik: Registondan Shohi Zindaga", city: "Samarqand", days: 3, guests: 2, totalPrice: 598, status: "confirmed", method: "payme" },
      { kind: "package", title: "Buyuk Ipak yo'li grand-turi: 5 shahar", city: "Toshkent", days: 9, guests: 4, totalPrice: 3596, status: "new", method: "visa" },
      { kind: "guide", title: "Gid xizmati — Samarqand, 2 kun", city: "Samarqand", days: 2, guests: 6, totalPrice: 180, status: "new", method: "click" },
      { kind: "transfer", title: "Aeroport transferi — Toshkent", city: "Toshkent", days: 1, guests: 3, totalPrice: 45, status: "completed", method: "mastercard" },
      { kind: "marketplace", title: "Rishton likopchasi — lakabi naqsh × 2", city: "Rishton", days: 6, guests: 1, totalPrice: 96, status: "completed", method: "payme" },
      { kind: "hotel", title: "Ichan Qal'a Boutique — 2 kecha", city: "Xiva", days: 2, guests: 2, totalPrice: 210, status: "confirmed", method: "click" },
      { kind: "package", title: "Zomin milliy bog'i — archa o'rmonida ekotur", city: "Zomin", days: 2, guests: 2, totalPrice: 318, status: "completed", method: "payme" },
      { kind: "package", title: "Farg'ona vodiysi: Rishton kulolchilik va Marg'ilon atlas", city: "Farg'ona", days: 3, guests: 2, totalPrice: 438, status: "cancelled", method: "visa" },
    ];

    for (const b of demoBookings) {
      await ctx.db.insert("bookings", {
        reference: `MLT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        kind: b.kind,
        title: b.title,
        city: b.city,
        startDate: new Date(now + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        days: b.days,
        guests: b.guests,
        totalPrice: b.totalPrice,
        currency: "USD",
        status: b.status,
        paymentMethod: b.method,
        paymentStatus: b.status === "cancelled" ? "refunded" : "paid",
        createdAt: now - Math.floor(Math.random() * 13) * 24 * 3600 * 1000,
        updatedAt: now,
      });
    }

    await ctx.db.insert("marketItems", {
      title: "Samarqand koshin panosi",
      category: "Kulolchilik",
      city: "Samarqand",
      price: 74,
      seller: "Rishton kulolchilik ustaxonasi",
      handmadeDays: 9,
      status: "pending",
      source: "bot",
      createdAt: now,
    });

    return { seeded: true };
  },
});
