import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import {
  BedDouble,
  ChevronDown,
  Compass,
  CreditCard,
  Headphones,
  Home,
  MapPin,
  Menu,
  Send,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  UserRoundCheck,
  UtensilsCrossed,
  Camera,
  CarFront,
  Languages,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { partnerBotLink } from "@/data/catalog";
import { CurrencySwitcher } from "@/lib/currency";
import { LangSwitcher, useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { MillytourLogo } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AuthChoiceDialog } from "@/components/AuthChoiceDialog";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>
  );
}

export const NAV = [
  { label: "Bosh sahifa", to: "/" },
  { label: "Tur paketlar", to: "/paketlar" },
  { label: "Xizmatlar", to: "/xizmatlar" },
  { label: "Restoran", to: "/xizmatlar?direction=restaurant" },
  { label: "Hunarmandlar", to: "/hunarmandlar" },
];

const SERVICE_LINKS = [
  { label: "Mehmonxona", desc: "3* dan butik mehmonxonalargacha — bronlar to'g'ridan-to'g'ri egasidan.", icon: BedDouble, to: "/xizmatlar?direction=hotel" },
  { label: "Gid", desc: "Litsenziyali, tillarni biladigan gidlar — kunlik yoki marshrut bo'yicha.", icon: UserRoundCheck, to: "/xizmatlar?direction=guide" },
  { label: "Transfer", desc: "Aeroport, shaharlararo va shahar ichida tashish. Mashina holati kunlik nazoratda.", icon: CarFront, to: "/xizmatlar?direction=transfer" },
  { label: "Tarjimon", desc: "Guruh tili bo'yicha tarjimon — kunma-kun vazifa va aniq mas'ul mutaxassis.", icon: Languages, to: "/xizmatlar?direction=translator" },
  { label: "Fotograf", desc: "Professional fotosessiya: lokatsiya, vaqt va tayyor suratlar paketi.", icon: Camera, to: "/xizmatlar?direction=photographer" },
  { label: "Boshqa xizmatlar", desc: "Qo'shimcha turizm xizmatlari.", icon: Ticket, to: "/xizmatlar?direction=other" },
];

function ServiceNavDropdown() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 220);
  };

  useEffect(() => cancelClose, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        className={cn(
          "group inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
          "data-[state=open]:bg-muted data-[state=open]:text-foreground",
        )}
      >
        {t("nav_services")}
        <ChevronDown
          className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-[360px] rounded-2xl border-border/80 p-2"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          {t("menu_label")}
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 sm:max-lg:grid-cols-1">
          {SERVICE_LINKS.map((s) => (
            <DropdownMenuItem key={s.label} asChild>
              <Link
                to={s.to}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground">{s.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.desc}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem asChild>
          <Link
            to="/xizmatlar"
            className="flex items-center justify-between rounded-lg px-2.5 py-2.5 text-[13px] font-semibold text-primary outline-none transition-colors hover:bg-primary/8 focus-visible:bg-primary/8"
          >
            {t("menu_all")}
            <Sparkles className="size-3.5" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}