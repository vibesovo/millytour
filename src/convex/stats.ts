import { query, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";

/**
 * Owner statistikasi — @mtour_stats_bot uchun ma'lumot manbasi.
 *
 * Ikki xil kirish:
 *   - `full`          — public query, faqat administrator (owner) uchun.
 *   - `fullInternal`  — internal query, faqat server kodidan (stats bot
 *                       webhook oqimi) chaqiriladi; owner tekshiruvi
 *                       telegram.ts'dagi OWNER_TELEGRAM_ID bilan bajariladi.
 *
 * Barcha ko'rsatkichlar haqiqiy jadval hisob-kitoblaridan olinadi
 * (o'ylab topilmaydi): users, bookings, payments, plans, providers, reviews.
 */

/** Davlat nomini normallashtirish (Turist = turizm...). */
function normalizeCountry(raw: string | undefined): string {
  if (!raw) return "Noma'lum";
  const c = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    uzbekistan: "O'zbekiston",
    "o'zbekiston": "O'zbekiston",
    russia: "Rossiya",
    "россия": "Rossiya",
    "russian federation": "Rossiya",
    kazakhstan: "Qozog'iston",
    "казахстан": "Qozog'iston",
    tajikistan: "Tojikiston",
    kyrgyzstan: "Qirg'iziston",
    turkmenistan: "Turkmaniston",
    turkey: "Turkiya",
    "türkiye": "Turkiya",
    "турция": "Turkiya",
    usa: "AQSH",
    "united states": "AQSH",
    germany: "Germaniya",
    deutschland: "Germaniya",
    france: "Fransiya",
    italy: "Italiya",
    italia: "Italiya",
    china: "Xitoy",
    india: "Hindiston",
    iran: "Eron",
    ukraine: "Ukraina",
    "украина": "Ukraina",
    israel: "Isroil",
    "south korea": "Koreya",
    korea: "Koreya",
    japan: "Yaponiya",
    "united kingdom": "Buyuk Britaniya",
    spain: "Ispaniya",
    poland: "Polsha",
    azerbaijan: "Ozarbayjon",
    afghanistan: "Afg'oniston",
    pakistan: "Pokiston",
    belarus: "Belarus",
  };
  return map[c] ?? raw.trim();
}

/** Barcha ko'rsatkichlarni yig'adi — public va internal query'lar shuni ishlatadi. */
async function collectStats(ctx: QueryCtx) {
  const now = Date.now();
  const todayStart = new Date(new Date(now).toISOString().slice(0, 10)).getTime();

  const users = await ctx.db.query("users").collect();
  const bookings = await ctx.db.query("bookings").collect();
  const payments = await ctx.db.query("payments").collect();
  const plans = await ctx.db.query("plans").collect();
  const providers = await ctx.db.query("providers").collect();
  const reviews = await ctx.db.query("reviews").collect();

  /* ── Foydalanuvchilar ─────────────────────────────────────────────── */
  const realUsers = users.filter((u) => !u.isAnonymous);
  const guests = users.filter((u) => u.isAnonymous);
  const todayUsers = users.filter((u) => u._creationTime >= todayStart).length;

  // Davlatlar: users.country bo'yicha; bo'sh bo'lsa "Noma'lum"
  const countryMap = new Map<string, number>();
  for (const u of realUsers) {
    const country = normalizeCountry(u.country);
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
  }
  const countries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  // Til taqsimoti — qaysi tilda ko'proq foydalaniladi
  const langMap = new Map<string, number>();
  for (const u of users) {
    const lang = (u.language ?? "uz").toLowerCase();
    langMap.set(lang, (langMap.get(lang) ?? 0) + 1);
  }
  const languages = Array.from(langMap.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  /* ── Buyurtmalar ─────────────────────────────────────────────────── */
  const byStatus = new Map<string, number>();
  const byKind = new Map<string, number>();
  const cityMap = new Map<string, number>();
  let revenue = 0;
  let paidCount = 0;
  for (const b of bookings) {
    byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
    byKind.set(b.kind, (byKind.get(b.kind) ?? 0) + 1);
    const city = b.city.split("·")[0].trim() || "—";
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    if (b.paymentStatus === "paid") {
      revenue += b.totalPrice;
      paidCount += 1;
    }
  }
  const cities = Array.from(cityMap.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  /* ── To'lovlar ───────────────────────────────────────────────────── */
  const paymentsByMethod = new Map<string, number>();
  for (const p of payments) {
    paymentsByMethod.set(p.method, (paymentsByMethod.get(p.method) ?? 0) + 1);
  }

  /* ── Hamkorlar ───────────────────────────────────────────────────── */
  const providersByDirection = new Map<string, number>();
  let approvedProviders = 0;
  for (const p of providers) {
    providersByDirection.set(p.direction, (providersByDirection.get(p.direction) ?? 0) + 1);
    if (p.status === "approved") approvedProviders += 1;
  }

  /* ── Oxirgi 7 kun ────────────────────────────────────────────────── */
  const dailyTrend: { day: string; users: number; bookings: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date(now - i * 24 * 3600 * 1000);
    const key = dayStart.toISOString().slice(0, 10);
    const start = new Date(`${key}T00:00:00.000Z`).getTime();
    const end = start + 24 * 3600 * 1000;
    dailyTrend.push({
      day: key,
      users: users.filter((u) => u._creationTime >= start && u._creationTime < end).length,
      bookings: bookings.filter((b) => b.createdAt >= start && b.createdAt < end).length,
    });
  }

  const avgCheck = paidCount > 0 ? Math.round((revenue / paidCount) * 100) / 100 : 0;
  const avgRating =
    reviews.length === 0
      ? 0
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  return {
    generatedAt: now,
    users: {
      total: users.length,
      real: realUsers.length,
      guests: guests.length,
      today: todayUsers,
      countries,
      languages,
    },
    bookings: {
      total: bookings.length,
      today: bookings.filter((b) => b.createdAt >= todayStart).length,
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      byKind: Array.from(byKind.entries())
        .map(([kind, count]) => ({ kind, count }))
        .sort((a, b) => b.count - a.count),
    },
    revenue: {
      total: Math.round(revenue * 100) / 100,
      paidCount,
      avgCheck,
      pending: payments.filter((p) => p.status === "pending").length,
      byMethod: Array.from(paymentsByMethod.entries()).map(([method, count]) => ({
        method,
        count,
      })),
    },
    demand: {
      cities,
      plans: plans.length,
      providers: {
        total: providers.length,
        approved: approvedProviders,
        byDirection: Array.from(providersByDirection.entries()).map(([direction, count]) => ({
          direction,
          count,
        })),
      },
      avgRating,
    },
    dailyTrend,
  };
}

/** Webhook oqimi uchun ichki versiya — owner tekshiruvi telegram.ts'da. */
export const fullInternal = internalQuery({
  args: {},
  handler: async (ctx) => collectStats(ctx),
});

/** Public versiya — faqat administrator (owner) uchun. */
export const full = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx).catch(() => null);
    if (!me || me.role !== "admin") {
      throw new Error("Bu hisobot faqat loyiha egasiga ko'rinadi.");
    }
    return collectStats(ctx);
  },
});
