import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > 400);
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {scrolled && (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-primary via-accent to-gold" />
      )}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 bottom-6 z-40 flex flex-col gap-2"
          >
            <Button
              size="icon"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="size-11 rounded-full bg-primary hover:bg-primary/90 shadow-lifted"
              aria-label="Yuqoriga qaytish"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
