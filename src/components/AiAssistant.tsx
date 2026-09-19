import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useRestQuery } from "@/api/client";
import { PlannerChat } from "@/components/planner-chat";
import { cn } from "@/lib/utils";

/**
 * Holat satri — AI modeli ulanganini ko'rsatadi. Backend javob bermasa yoki
 * kalit sozlanmagan bo'lsa "onlayn" deb yozib qo'ymaydi.
 */
function AiStatusLine({ compact }: { compact?: boolean }) {
  const status = useRestQuery("aiStatus", "status");
  const ready = status?.ready;
  const dot = ready === undefined ? "bg-white/40" : ready ? "bg-eco" : "bg-amber-400";
  const text =
    ready === undefined
      ? "Bron, to'lov va buyurtmani kuzatish bo'yicha yordam"
      : ready
        ? "Onlayn · AI modeli faol · bron va to'lov"
        : "Tezkor rejim · AI kaliti hali sozlanmagan";
  return (
    <p
      title={status?.model}
      className={cn(
        "flex items-center gap-1.5 text-white/70",
        compact ? "text-[12px]" : "text-[11px]",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </p>
  );
}

/** Milly AI widgetini istalgan joydan (masalan, landing AI bo'limidan) ochish uchun global hodisa. */
export function openMillyAi() {
  window.dispatchEvent(new CustomEvent("millytour:open-milly"));
}

/**
 * Milly AI.
 *
 * - Oddiy sahifalarda: o'ng pastdagi suzuvchi tugma, bosilganda ixcham chat.
 * - Mini app rejimi (`/telegram?miniapp=1`): markazda katta panel — hech qanday
 *   suzuvchi tugma, header yoki pastki menyu yo'q, faqat AI.
 */
export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const isMiniApp = new URLSearchParams(search).get("miniapp") === "1";
  const hidden = ["/auth", "/admin", "/partner"].some((p) => pathname.startsWith(p));

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("millytour:open-milly", handler);
    return () => window.removeEventListener("millytour:open-milly", handler);
  }, []);

  if (isMiniApp) {
    return (
        <section
          aria-label="Milly AI yordamchisi"
          className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col justify-center px-4 py-6"
        >
          <div className="glass-card flex flex-col overflow-hidden rounded-3xl">
            <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#0B1220] via-[#12306B] to-[#1E40AF] px-5 py-4 text-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Sparkles className="size-5 text-gold" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">Milly AI</p>
              <AiStatusLine compact />
            </div>
          </header>
          <div className="flex min-h-[65vh] flex-col p-4">
            <PlannerChat variant="page" />
          </div>
        </div>
      </section>
    );
  }

  if (hidden) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            key="assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Milly AI yordamchisi"
            className="glass-card fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex h-[min(70vh,520px)] w-[min(92vw,376px)] flex-col overflow-hidden rounded-3xl sm:right-5 sm:bottom-24"
          >
            <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#0B1220] via-[#12306B] to-[#1E40AF] px-4 py-3 text-white">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">
                <Sparkles className="size-4 text-gold" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Milly AI</p>
                <AiStatusLine />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Yopish"
                className="grid size-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col p-3.5">
              <PlannerChat variant="widget" />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Milly AI yordamchini yopish" : "Milly AI bilan tur dasturi tuzish"}
        className={cn(
          "press fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#12306B] text-white shadow-lifted transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-6 sm:bottom-6",
          open ? "size-12 justify-center px-0" : "h-12 px-4",
        )}
      >
        <span className="relative grid place-items-center">
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <>
              <Sparkles className="size-5" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-ping rounded-full bg-gold/40"
              />
            </>
          )}
        </span>
        {!open && <span className="text-sm font-semibold whitespace-nowrap">Milly AI</span>}
      </button>
    </>
  );
}
