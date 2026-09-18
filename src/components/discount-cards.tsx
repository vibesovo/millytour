import { useEffect, useState } from "react";
import { useRestMutation, useRestQuery } from "@/api/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Clock,
  Gem,
  Image as ImageIcon,
  Palette,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Price } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import {
  CARD_CITIES,
  CARD_COLORS,
  MillyCardVisual,
  cityById,
  colorById,
  type CardStyleId,
} from "@/components/milly-card";
import {
  CARD_TIERS,
  PAYMENT_METHODS,
  TIER_IDS,
  TIER_META,
  perMonth,
  type CardTier,
  type TierId,
} from "@/data/card-tiers";

/**
 * Landing bo'limi: Milly Card chegirma kartalari.
 *
 * Tanlov ixcham va karta ostida turadi:
 *
 *   1. Muddat  — 3 / 6 / 12 oy segmenti (Apple uslubidagi switch).
 *   2. Dizayn  — kartaning ostida 3 uslub: Naqshli · Oddiy · Rasmlik.
 *                Naqshli/Oddiyda RANG, Rasmlikda SHAHAR (Samarqand, Buxoro,
 *                Xiva, Toshkent) tanlanadi.
 *   3. Tarif   — tanlangan muddatning imtiyozlari va narxi; xarid shu yerda.
 *
 * "Barcha tariflar" alohida blok yo'q — 3 chi bo'lim ("Sizning tarifingiz")
 * muddat segmentidan tanlanganni ko'rsatadi.
 *
 * Tanlov localStorage'da saqlanadi — sahifa yangilansa ham qoladi
 * (xarid server tomonda `design` maydoni orqali yakunlanadi).
 */

const STORAGE_KEY = "milly-card-preference";

type CardPreference = { style: CardStyleId; variant: string };

function loadPreference(): CardPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CardPreference>;
      if (
        (parsed.style === "pattern" || parsed.style === "plain" || parsed.style === "city") &&
        typeof parsed.variant === "string" &&
        parsed.variant
      ) {
        return { style: parsed.style, variant: parsed.variant };
      }
    }
  } catch {
    /* localStorage bo'lmasa — standart tanlov */
  }
  return { style: "city", variant: "samarqand" };
}

/** Dizaynni backend tushunadigan id ga aylantirish (design maydoni uchun). */
export function preferenceToDesignId(p: CardPreference): string {
  if (p.style === "city") return p.variant; // samarqand | buxoro | xiva | toshkent
  return `${p.style}:${p.variant}`; // pattern:firuza | plain:oq ...
}

const STYLE_TABS: { id: CardStyleId; label: string; icon: typeof Palette }[] = [
  { id: "pattern", label: "Naqshli", icon: Palette },
  { id: "plain", label: "Oddiy", icon: Palette },
  { id: "city", label: "Rasmlik", icon: ImageIcon },
];

export function DiscountCardsSection({ id }: { id?: string }) {
  const { user } = useAuth();
  const liveTiers = useRestQuery("discountCards", "tiers");
  const activeCard = useRestQuery("discountCards", "active", {}, Boolean(user));
  const purchase = useRestMutation("discountCards", "purchase");

  const [pref, setPref] = useState<CardPreference>(() => loadPreference());
  const [tierId, setTierId] = useState<TierId>("6");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [busy, setBusy] = useState(false);

  /** Tanlov o'zgarsa — darhol saqlash. */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    } catch {
      /* ignore */
    }
  }, [pref]);

  const tiers: CardTier[] =
    liveTiers && liveTiers.length > 0 ? (liveTiers as unknown as CardTier[]) : CARD_TIERS;
  const selected = tiers.find((t) => t.id === tierId) ?? tiers.find((t) => t.id === "6") ?? tiers[0];
  const meta = TIER_META[tierId];

  const view = {
    id: String(selected.id),
    months: selected.months,
    discountPercent: selected.discountPercent,
    priceUsd: selected.priceUsd,
    name: meta.name,
  };
  const expiresAt = activeCard?.expiresAt ?? 0;

  /**
   * Tejamkorlik hisobi — o'ylab topilmaydi, tarif narxlaridan chiqariladi:
   * eng qisqa (3 oylik) kartani shu muddat davomida qayta-qayta olganda
   * qancha to'lanishini hisoblab, tanlangan tarif bilan solishtiramiz.
   */
  const baseTier = tiers.find((t) => t.id === "3") ?? tiers[0];
  const repeatCost =
    baseTier && selected.months && baseTier.months
      ? Math.round((selected.months / baseTier.months) * baseTier.priceUsd * 100) / 100
      : 0;
  const savings =
    repeatCost > selected.priceUsd ? Math.round((repeatCost - selected.priceUsd) * 100) / 100 : 0;
  const savingsPercent = savings > 0 ? Math.round((savings / repeatCost) * 100) : 0;

  return (
    <section id={id} className="scroll-mt-24 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Gem className="h-3.5 w-3.5" /> Sayohat kartalari
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Milly Card — chegirma kartangiz
          </h2>
          <p className="mt-3 text-muted-foreground">
            Kartani o'zingizga yoqqan uslubda tanlang. Muddat davomida <b>har bir bron</b> — tur
            paketlar, mehmonxona, restoran, gid, transfer, tarjimon, fotograf va Milly AI dasturlari —
            avtomatik chegirma bilan hisoblanadi.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,430px)_1fr] lg:items-start">
          {/* ── Karta + uning ostida ixcham dizayn tanlash ─────────────────── */}
          <div className="lg:sticky lg:top-24">
            <motion.div
              key={`${pref.style}-${pref.variant}-${tierId}`}
              initial={{ opacity: 0, y: 14, rotateY: -8 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <MillyCardVisual
                style={pref.style}
                variant={pref.variant}
                tier={view}
                holder={user?.name}
                expiresAt={expiresAt}
              />
            </motion.div>

            {/* 1-blok: dizayn tanlash (kartaning ostida, ixcham) */}
            <div className="mt-5 rounded-2xl border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Palette className="h-3.5 w-3.5 text-primary" /> Dizayn
                </p>
                <p className="text-[11px] text-muted-foreground">Mening tanlaganim</p>
              </div>

              {/* Uslub: Naqshli · Oddiy · Rasmlik */}
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
                {STYLE_TABS.map((tab) => {
                  const picked = pref.style === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setPref((p) => ({
                          style: tab.id,
                          variant: tab.id === "city" ? "samarqand" : p.variant === "samarqand" ? "firuza" : p.variant,
                        }))
                      }
                      className={cn(
                        "press relative rounded-lg py-1.5 text-[12px] font-medium transition",
                        picked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={picked}
                    >
                      {picked && (
                        <motion.span
                          layoutId="milly-style-pill"
                          aria-hidden="true"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-card shadow-xs ring-1 ring-border"
                        />
                      )}
                      <span className="relative">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Rang (naqshli/oddiy) yoki shahar (rasmlik) */}
              {pref.style === "city" ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CARD_CITIES.map((c) => {
                    const picked = pref.variant === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPref({ style: "city", variant: c.id })}
                        className={cn(
                          "press rounded-full px-3 py-1 text-[12px] font-medium transition",
                          picked
                            ? "bg-primary text-primary-foreground"
                            : "border text-muted-foreground hover:text-foreground",
                        )}
                        aria-pressed={picked}
                      >
                        {picked && <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CARD_COLORS.map((c) => {
                    const picked = pref.variant === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.name}
                        aria-label={`${c.name} rangi`}
                        aria-pressed={picked}
                        onClick={() => setPref({ style: pref.style, variant: c.id })}
                        className={cn(
                          "press size-7 rounded-full transition",
                          c.swatch,
                          picked
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "ring-1 ring-black/10 hover:ring-primary/40",
                        )}
                      />
                    );
                  })}
                  <span className="self-center text-[11px] text-muted-foreground">
                    {colorById(pref.variant).name}
                  </span>
                </div>
              )}
            </div>

            {activeCard && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[13px]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Sizda <b>{activeCard.discountPercent}%</b> chegirmali karta faol —{" "}
                  {new Date(activeCard.expiresAt).toLocaleDateString("uz-UZ")} gacha
                </span>
              </div>
            )}
          </div>

          {/* ── O'ng panel: muddat + tarif ────────────────────────────────── */}
          <div className="space-y-7">
            {/* 2 — muddat */}
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" /> Muddatni tanlang
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Muddat qancha uzoq bo'lsa, chegirma shuncha katta va oylik narx shuncha arzon.
              </p>

              <div
                role="radiogroup"
                aria-label="Karta muddati"
                className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border bg-muted/40 p-1.5"
              >
                {TIER_IDS.map((tid) => {
                  const t = tiers.find((x) => x.id === tid) ?? CARD_TIERS.find((x) => x.id === tid)!;
                  const picked = tid === tierId;
                  const monthly = perMonth(t.priceUsd, t.months);
                  const cheapest = TIER_IDS.every((other) => {
                    const o = tiers.find((x) => x.id === other);
                    return !o || perMonth(o.priceUsd, o.months) >= monthly;
                  });
                  return (
                    <button
                      key={tid}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      onClick={() => setTierId(tid)}
                      className={cn(
                        "press relative flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition",
                        picked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {picked && (
                        <motion.span
                          layoutId="milly-tier-pill"
                          aria-hidden="true"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-card shadow-xs ring-1 ring-primary/30"
                        />
                      )}
                      <span className="relative block text-[15px] font-semibold">{tid} oy</span>
                      <span
                        className={cn(
                          "relative mt-0.5 block text-[11px] font-medium",
                          picked ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {t.discountPercent}% chegirma
                      </span>
                      <span className="relative mt-0.5 block text-[10px] text-muted-foreground tabular-nums">
                        ≈ ${monthly}/oy{cheapest ? " · tejamkor" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {savings > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-semibold text-eco">
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {selected.months} oyda ${savings} ({savingsPercent}%) tejaysiz
                  </span>
                </div>
              )}
            </div>

            {/* 3 — sizning tarifingiz (tanlangan muddat) */}
            <motion.div
              key={tierId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sizning tarifingiz
                  </p>
                  <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                    <meta.icon className={cn("h-5 w-5", meta.accent)} />
                    {meta.name} · {selected.months} oy
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-primary">{meta.badge}</p>
                </div>
                <div className="text-right">
                  <Price usd={selected.priceUsd} />
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    ≈ {perMonth(selected.priceUsd, selected.months)} USD/oy
                  </p>
                  {savings > 0 && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-eco/10 px-2 py-0.5 text-[11px] font-semibold text-eco">
                      <TrendingDown className="h-3 w-3" aria-hidden="true" />${savings} tejaysiz
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {selected.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-[13px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="press w-full sm:w-auto"
                  onClick={() => {
                    if (!user) {
                      toast.info("Avval ro'yxatdan o'ting", {
                        description: "Karta sizning hisobingizga bog'lanadi.",
                      });
                      return;
                    }
                    setOpen(true);
                  }}
                >
                  {meta.name} kartani xarid qilish
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  To'lov tasdiqlangach karta avtomatik faollashadi.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {meta.name} ·{" "}
              {pref.style === "city" ? cityById(pref.variant).name : colorById(pref.variant).name}
            </DialogTitle>
            <DialogDescription>
              {view.discountPercent}% chegirma · {view.months} oy davomida barcha bronlarga.
            </DialogDescription>
          </DialogHeader>

          <MillyCardVisual
            style={pref.style}
            variant={pref.variant}
            tier={view}
            holder={user?.name}
          />

          <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Karta narxi</span>
            <Price usd={view.priceUsd} />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-primary" /> To'lov usuli
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "press rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition",
                    method === m.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/60",
                  )}
                  aria-pressed={method === m.id}
                >
                  {m.label}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="press w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await purchase({
                  tier: tierId,
                  method,
                  design: preferenceToDesignId(pref),
                });
                toast.success("To'lov yaratildi", {
                  description: "Tasdiqlangach karta faollashadi va kabinetda ko'rinadi.",
                });
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Yuborilmoqda…" : "Xarid qilish"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
