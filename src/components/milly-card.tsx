import { BadgePercent, Building2, Castle, Landmark, Route, Sparkles, Sunrise } from "lucide-react";
import { cardPhoto, IMG } from "@/data/catalog";
import { cn } from "@/lib/utils";

/**
 * Milly Card vizual tizimi.
 *
 * Endi dizayn ikki qatlamdan iborat — uslub va uni tashqi ko'rinishi:
 *
 *   1. USLUB (style)   — `pattern` (naqshli) | `plain` (oddiy) | `city` (rasmlik)
 *   2. VARIANT         — pattern/plain uchun RANG, city uchun SHAHAR
 *
 * Masalan: "Naqshli + Firuza" yoki "Shahar + Samarqand (Registon)".
 *
 * Ro'yxat `src/convex/discountCards.ts → DESIGN_IDS` bilan bir xil bo'lishi
 * kerak — aks holda tanlangan dizayn saqlanmaydi (fallback: registon).
 */

export type CardStyleId = "pattern" | "plain" | "city";

export type CardDesignId = string;

export type CardColor = {
  id: string;
  name: string;
  /** Karta fon gradienti (oddiy va naqshli uslubda). */
  swatch: string;
  /** Naqsh chizg'ich rangi (naqshli uslubda). */
  line: string;
  /** Matn va urg'u rangi. */
  ink: string;
  chip: string;
};

export type CardCity = {
  id: string;
  name: string;
  photo: string;
  accent: string;
};

/* ── Naqshli va oddiy uslublar uchun rang variantlari ─────────────────── */
export const CARD_COLORS: CardColor[] = [
  {
    id: "midnight",
    name: "Tungi ko'k",
    swatch: "bg-gradient-to-br from-[#0b1f3a] via-[#123163] to-[#081729]",
    line: "#ffffff",
    ink: "rgba(255,255,255,0.92)",
    chip: "light",
  },
  {
    id: "firuza",
    name: "Firuza",
    swatch: "bg-gradient-to-br from-[#04302b] via-[#0d5b49] to-[#02201c]",
    line: "#eafff7",
    ink: "rgba(234,255,247,0.92)",
    chip: "light",
  },
  {
    id: "oltin",
    name: "Oltin qum",
    swatch: "bg-gradient-to-br from-[#3c1a0c] via-[#8a4a1e] to-[#2a1206]",
    line: "#ffe9cf",
    ink: "rgba(255,233,207,0.92)",
    chip: "light",
  },
  {
    id: "neon",
    name: "Ko'k chatsak",
    swatch: "bg-gradient-to-br from-[#141539] via-[#3b3f96] to-[#0b0b22]",
    line: "#dfe4ff",
    ink: "rgba(223,228,255,0.92)",
    chip: "light",
  },
  {
    id: "mova",
    name: "Movarannahr",
    swatch: "bg-gradient-to-br from-[#4a2c14] via-[#b07a34] to-[#2b1707]",
    line: "#ffefd6",
    ink: "rgba(255,239,214,0.92)",
    chip: "light",
  },
  {
    id: "oq",
    name: "Oq marmar",
    swatch: "bg-gradient-to-br from-slate-100 via-white to-slate-300",
    line: "#64748b",
    ink: "rgba(15,23,42,0.85)",
    chip: "dark",
  },
];

/* ── Rasmlik (shahar) uslubi uchun shahar variantlari ─────────────────── */
export const CARD_CITIES: CardCity[] = [
  {
    id: "samarqand",
    name: "Samarqand",
    photo: cardPhoto(IMG.registan),
    accent: "#e6c67a",
  },
  {
    id: "buxoro",
    name: "Buxoro",
    photo: cardPhoto(IMG.buxoro),
    accent: "#7ee0c8",
  },
  {
    id: "xiva",
    name: "Xiva",
    photo: cardPhoto(IMG.xiva),
    accent: "#ffcf8f",
  },
  {
    id: "toshkent",
    name: "Toshkent",
    photo: cardPhoto(IMG.toshkent),
    accent: "#a5b4fc",
  },
];

export function colorById(id: string | undefined): CardColor {
  return CARD_COLORS.find((c) => c.id === id) ?? CARD_COLORS[0];
}

export function cityById(id: string | undefined): CardCity {
  return CARD_CITIES.find((c) => c.id === id) ?? CARD_CITIES[0];
}

/**
 * Eski 6 dizayn id'lari bilan moslik — Dashboard'da saqlangan kartalar va
 * backend'dagi `design` maydoni hali shu formatda bo'lishi mumkin.
 */
export function designById(id: string | undefined): CardDesign {
  const legacy: Record<string, { style: CardStyleId; variant: string }> = {
    registon: { style: "city", variant: "samarqand" },
    buxoro: { style: "city", variant: "buxoro" },
    xiva: { style: "city", variant: "xiva" },
    toshkent: { style: "city", variant: "toshkent" },
    silk: { style: "pattern", variant: "mova" },
    modern: { style: "plain", variant: "oq" },
  };
  const d = legacy[id ?? ""] ?? { style: "city", variant: "samarqand" };
  return { style: d.style, variant: d.variant, id: id ?? "registon" };
}

export type CardDesign = {
  style: CardStyleId;
  variant: string;
  id: string;
};

export type CardTierView = {
  id: string;
  months: number;
  discountPercent: number;
  priceUsd: number;
  name: string;
};

/** Kartadagi milliy naqsh — naqshli uslubda ko'rinadi. */
function PatternLayer({ line }: { line: string }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.22]"
      viewBox="0 0 320 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="milly-star" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M22 3 L41 22 L22 41 L3 22 Z" fill="none" stroke={line} strokeWidth="0.8" />
          <circle cx="22" cy="22" r="5" fill="none" stroke={line} strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#milly-star)" />
    </svg>
  );
}

/** Oddiy uslubning nozik gridi — juda past kontrastda. */
function PlainLayer({ line }: { line: string }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.14]"
      viewBox="0 0 320 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="milly-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0 H0 V26" fill="none" stroke={line} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#milly-grid)" />
    </svg>
  );
}

/** Karta chipi — plastik karta ko'rinishini beradi. */
function CardChip({ tone }: { tone: "light" | "dark" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block overflow-hidden rounded-[4px] ring-1 ring-black/15",
        tone === "light"
          ? "h-6 w-9 bg-gradient-to-br from-[#f7e6b6] via-[#d9b567] to-[#a9812f]"
          : "h-6 w-9 bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600",
      )}
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/20" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/15" />
    </span>
  );
}

/** Uslub bo'yicha fon qatlami. */
function BackgroundLayers({ style, variant }: { style: CardStyleId; variant: string }) {
  if (style === "city") {
    const city = cityById(variant);
    return (
      <>
        <img
          src={city.photo}
          alt={`${city.name} — Milly Card fon rasmi`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top left, rgba(4,10,22,0.92) 0%, rgba(6,14,30,0.72) 55%, rgba(8,16,34,0.38) 100%)",
          }}
          aria-hidden="true"
        />
      </>
    );
  }
  const color = colorById(variant);
  return (
    <>
      <div className={cn("absolute inset-0", color.swatch)} aria-hidden="true" />
      {style === "pattern" ? (
        <PatternLayer line={color.line} />
      ) : (
        <PlainLayer line={color.line} />
      )}
    </>
  );
}

/**
 * Milly Card vizuali. `size="sm"` — kabinet/dashboard uchun ixcham variant.
 */
export function MillyCardVisual({
  style = "city",
  variant = "samarqand",
  tier,
  holder,
  expiresAt,
  size = "lg",
  className,
}: {
  style?: CardStyleId;
  variant?: string;
  tier: CardTierView;
  holder?: string;
  expiresAt?: number;
  size?: "lg" | "sm";
  className?: string;
}) {
  const light = style === "city" ? true : colorById(variant).chip === "dark";
  const accent = style === "city" ? cityById(variant).accent : colorById(variant).ink;
  const city = style === "city" ? cityById(variant) : null;
  const expiry =
    expiresAt && expiresAt > 0
      ? new Date(expiresAt).toLocaleDateString("uz-UZ", { month: "2-digit", year: "numeric" })
      : "—";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-xl",
        "aspect-[1.586/1]",
        "ring-1 ring-white/10",
        size === "sm" ? "p-4" : "p-5 sm:p-6",
        className,
      )}
    >
      <BackgroundLayers style={style} variant={variant} />

      {/* Yaltiroq nur — karta sirtini jonlantiradi */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute -top-1/2 -left-1/3 h-[220%] w-[45%] rotate-[18deg]",
          light ? "bg-white/40" : "bg-white/10",
          "blur-2xl",
        )}
      />

      <div className="relative flex h-full flex-col justify-between" style={{ color: accent }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.28em]">
              MILLY
              <span style={{ color: style === "city" ? accent : undefined }} className={style === "city" ? "" : "opacity-80"}>
                TOUR
              </span>
            </p>
            <p className="mt-0.5 truncate text-[10px] opacity-70">
              {city ? city.name : "Butun O'zbekiston"} · sayohat kartasi
            </p>
          </div>
          <Sparkles className="size-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BadgePercent className="size-6 shrink-0 opacity-80" aria-hidden="true" />
              <p className="truncate text-[13px] font-semibold tracking-wide">
                {tier.name} · {city ? city.name : "Zamonaviy"}
              </p>
            </div>
            <p
              className={cn(
                "mt-1 font-semibold leading-none tracking-tight text-white",
                size === "sm" ? "text-2xl" : "text-3xl sm:text-4xl",
              )}
            >
              {tier.discountPercent}%
              <span
                className={cn(
                  "ml-1.5 align-middle font-medium opacity-80",
                  size === "sm" ? "text-[10px]" : "text-[11px]",
                )}
              >
                chegirma
              </span>
            </p>
          </div>
          <CardChip tone={light ? "light" : "dark"} />
        </div>

        <div className="flex items-end justify-between gap-4 text-[10px] uppercase tracking-wider opacity-80">
          <div className="min-w-0">
            <p className="text-[8px] opacity-70">Karta egasi</p>
            <p className="mt-0.5 truncate text-[11px] font-medium normal-case tracking-normal">
              {holder?.trim() || "Millytour mehmoni"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[8px] opacity-70">Amal qiladi</p>
            <p className="mt-0.5 text-[11px] font-medium normal-case tracking-normal">
              {expiry} · {tier.months} oy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
