import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Pul birligi tizimi.
 *
 * Bu O'zbekiston loyihasi — narxlar bazada USD'da saqlanadi, lekin interfeys
 * standart holatda UZS ko'rsatadi (har doim), tepada esa tanlangan valyuta
 * ($, €, dirham) kichik qator bilan. Foydalanuvchi valyutani almashtirsa,
 * bosh liniya shu valyutada, pastdagi kichik qator esa har doim UZS'da turadi.
 */

export const CURRENCIES = [
  { id: "UZS", label: "UZS — so'm", short: "so'm", symbol: "so'm", before: false },
  { id: "USD", label: "USD — dollar", short: "USD", symbol: "$", before: true },
  { id: "EUR", label: "EUR — yevro", short: "EUR", symbol: "€", before: true },
  { id: "AED", label: "AED — dirham", short: "AED", symbol: "AED", before: false },
] as const;

export type CurrencyId = (typeof CURRENCIES)[number]["id"];

/** 1 birlik = necha UZS (statik kurs, keyin API bilan yangilanadi). */
const UZS_PER: Record<CurrencyId, number> = {
  UZS: 1,
  USD: 12650,
  EUR: 13950,
  AED: 3445,
};

type CurrencyCtx = {
  currency: CurrencyId;
  setCurrency: (c: CurrencyId) => void;
  /** USD summani tanlangan valyutaga o'tkazadi. */
  fromUsd: (usd: number) => number;
  /** Tanlangan valyutadagi summani USD'ga qaytaradi (kiritish maydonlari uchun). */
  toUsd: (amount: number) => number;
};

const Ctx = createContext<CurrencyCtx | null>(null);

const STORAGE_KEY = "millytour.currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyId>(() => {
    if (typeof window === "undefined") {
      return "UZS";
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "USD" || saved === "EUR" || saved === "AED" || saved === "UZS" ? saved : "UZS";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((c: CurrencyId) => setCurrencyState(c), []);

  const fromUsd = useCallback(
    (usd: number) => (usd / UZS_PER.UZS) * UZS_PER[currency],
    [currency],
  );

  const toUsd = useCallback(
    (amount: number) => (amount / UZS_PER[currency]) * UZS_PER.UZS,
    [currency],
  );

  const value = useMemo(() => ({ currency, setCurrency, fromUsd, toUsd }), [currency, setCurrency, fromUsd, toUsd]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCurrency CurrencyProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

export function currencyMeta(id: CurrencyId) {
  return CURRENCIES.find((c) => c.id === id) ?? CURRENCIES[0];
}

/** 1265000 → "1 265 000" (uzbekcha bo'shliq bilan guruhlash). */
export function group(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Asosiy bosh liniya: tanlangan valyutadagi narx matni. */
export function formatPrimary(usd: number, currency: CurrencyId) {
  const meta = currencyMeta(currency);
  const value = (usd / UZS_PER.UZS) * UZS_PER[currency];
  const text = currency === "UZS" ? group(value) : value >= 1000 ? group(value) : (Math.round(value * 10) / 10).toString();
  return meta.before ? `${meta.symbol}${text}` : `${text} ${meta.symbol}`;
}

/** Pastdagi kichik qator: har doim UZS'dagi ekvivalent (yoki UZS rejimida $). */
export function formatSecondary(usd: number, currency: CurrencyId) {
  const uzs = usd * UZS_PER.USD;
  if (currency === "UZS") {
    return `≈ $${group(usd)}`;
  }
  if (uzs >= 1_000_000) {
    return `≈ ${(Math.round(uzs / 10_000) / 100).toFixed(2)} mln so'm`;
  }
  return `≈ ${group(uzs)} so'm`;
}

/**
 * Narx: bosh qatorda tanlangan valyuta, pastida kichik qatorda qolgan biri
 * (UZS rejimida $, valyuta rejimida doim so'm) — ikkala qiymat ham ko'rinadi.
 */
export function Price({
  usd,
  className,
  secondaryClassName,
  suffix,
  hideSecondary = false,
}: {
  usd: number;
  className?: string;
  secondaryClassName?: string;
  suffix?: string;
  hideSecondary?: boolean;
}) {
  const { currency } = useCurrency();
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="font-bold whitespace-nowrap">
        {formatPrimary(usd, currency)}
        {suffix ? <span className="ml-1 text-[0.72em] font-medium opacity-70">{suffix}</span> : null}
      </span>
      {!hideSecondary && (
        <span className={cn("text-[0.72em] leading-tight font-medium text-muted-foreground whitespace-nowrap", secondaryClassName)}>
          {formatSecondary(usd, currency)}
        </span>
      )}
    </span>
  );
}

/** Faqat bitta qatorli ixcham narx (kichik joylar uchun). */
export function PriceInline({ usd, className }: { usd: number; className?: string }) {
  const { currency } = useCurrency();
  return (
    <span className={cn("whitespace-nowrap", className)} title={formatSecondary(usd, currency)}>
      {formatPrimary(usd, currency)}
      {currency !== "UZS" ? (
        <span className="ml-1.5 text-[0.72em] font-medium text-muted-foreground">
          {formatSecondary(usd, currency)}
        </span>
      ) : null}
    </span>
  );
}

/** Header'dagi pul birligi almashtirgichi. */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const active = currencyMeta(currency);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "group h-8 gap-1.5 rounded-full border border-border/70 px-2.5 font-semibold",
            "hover:bg-muted data-[state=open]:bg-muted",
            className,
          )}
          aria-label="Pul birligini almashtirish"
        >
          <span className="text-[12px] tracking-wide">{active.short}</span>
          <ChevronDown
            className="size-3 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      {/* p-1 (4px) + rounded-2xl (24px) → element radiusi 20px (rounded-xl). */}
      <DropdownMenuContent align="end" className="min-w-52 rounded-2xl p-1">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          Narxlar bosh liniyada
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setCurrency(c.id)}
            className={cn(
              "gap-2.5 rounded-xl px-2.5 py-2 text-[13px]",
              c.id === currency && "font-semibold text-primary",
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold text-foreground">
              {c.before ? c.symbol : c.short.slice(0, 3)}
            </span>
            <span className="flex-1">{c.label}</span>
            {c.id === currency && <Check className="size-3.5 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1" />
        <p className="px-2.5 py-1.5 text-[11px] leading-4 text-muted-foreground">
          Har bir narx ostida UZS'dagi ekvivalent ham ko'rsatiladi.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
