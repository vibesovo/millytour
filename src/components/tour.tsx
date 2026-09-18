import { Link } from "react-router";
import { ArrowRight, Clock, Heart, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceInline } from "@/lib/currency";
import { TOUR_CATEGORIES, type CategoryId, type TourPackage } from "@/data/catalog";
import { cn } from "@/lib/utils";

/**
 * Tur turkumlari: "Barcha tur paketlar" + yo'nalish turlari
 * (tarixiy shaharlar, ekoturizm, hunarmandchilik, ziyorat, sarguzasht).
 */
export function CategoryTabs({
  value,
  onChange,
  counts,
  tone = "light",
  className,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
  counts?: Partial<Record<CategoryId, number>>;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tur turkumlari"
      className={cn("no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}
    >
      {TOUR_CATEGORIES.map((cat) => {
        const active = cat.id === value;
        const count = counts?.[cat.id];
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(cat.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tone === "dark"
                ? active
                  ? "border-transparent bg-white text-[#17231d]"
                  : "border-white/20 bg-white/10 text-white/85 hover:bg-white/20"
                : active
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {cat.label}
            {typeof count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  tone === "dark"
                    ? active
                      ? "bg-primary/10 text-primary"
                      : "bg-white/15 text-white/80"
                    : active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function categoryLabel(id: CategoryId) {
  return TOUR_CATEGORIES.find((c) => c.id === id)?.short ?? "Tur paket";
}

export function TourBadge({ badge }: { badge?: TourPackage["badge"] }) {
  if (!badge) {
    return null;
  }
  return (
    <Badge
      className={cn(
        "border-0 font-semibold shadow-xs",
        badge === "Best Seller" && "bg-primary text-primary-foreground",
        badge === "Hot Deal" && "bg-gold text-gold-foreground",
        badge === "New" && "bg-coral text-coral-foreground",
      )}
    >
      {badge}
    </Badge>
  );
}

export function TourCard({
  tour,
  className,
  href,
}: {
  tour: TourPackage;
  className?: string;
  href?: string;
}) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={tour.image}
          alt={tour.alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <TourBadge badge={tour.badge} />
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wide text-foreground uppercase">
            {categoryLabel(tour.category)}
          </span>
        </div>
        <button
          type="button"
          aria-label="Saqlangan turlarga qo'shish"
          onClick={() => toast.success(`"${tour.title}" saqlangan turlarga qo'shildi`)}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-foreground shadow-xs transition-colors hover:bg-white"
        >
          <Heart className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {tour.city}
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-12 text-[15px] leading-6 font-semibold text-foreground">
          {tour.title}
        </h3>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" aria-hidden="true" />
            {tour.days} kun / {tour.nights} kecha
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2 py-1 text-xs font-bold text-[#8a5a00]">
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className={cn("text-[11px]", index < Math.round(tour.rating) ? "text-gold" : "text-muted-foreground/30")}>★</span>
              ))}
            </span>
            {tour.rating.toFixed(1)}
            <span className="font-medium text-muted-foreground">({tour.reviews})</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          {tour.groupSize} · {tour.nextDeparture}
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <div className="flex flex-col">
            <PriceInline usd={tour.priceFrom} />
            <span className="text-[11px] text-muted-foreground">{tour.oldPrice ? `${tour.oldPrice} USD dan` : "dan"}</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={href ?? `/paketlar/${tour.slug}`}>
              Batafsil
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
