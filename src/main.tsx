import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AiAssistant } from "@/components/AiAssistant";
import { OnboardingGate } from "@/components/OnboardingGate";
import { SiteLayout } from "@/components/site";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { CurrencyProvider } from "@/lib/currency";
import { LangProvider } from "@/lib/i18n";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Packages = lazy(() => import("./pages/Packages.tsx"));
const PackageDetail = lazy(() => import("./pages/PackageDetail.tsx"));
const Marketplace = lazy(() => import("./pages/Marketplace.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail.tsx"));
const Partners = lazy(() => import("./pages/Partners.tsx"));
const TelegramEntry = lazy(() => import("./pages/Telegram.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Partner = lazy(() => import("./pages/Partner.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Public sahifalar umumiy header va footer ichida ko'rsatiladi. */
function Public({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Convex manzili build vaqtida `VITE_CONVEX_URL` orqali beriladi.
 * Agar o'zgaruvchi yo'q bo'lsa, `ConvexReactClient` konstruktori butun modulni
 * yiqitadi va sahifa butunlay bo'sh chiqadi. Shu sabab majburiy tekshiramiz va
 * aniq tushunarli xato ekranini ko'rsatamiz.
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Env sozlamalari yetishmaganда ko'rsatiladigan ekran (deploy'ni tuzatish uchun). */
function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold">Sozlamalar yetishmayapti (Configuration missing)</p>
        <p className="mt-2 text-xs text-muted-foreground break-words">{message}</p>
        <p className="mt-3 text-[11px] text-muted-foreground/80">
          Vercel → Project → Settings → Environment Variables bo'limiga
          <code className="mx-1 rounded bg-muted px-1 py-0.5">VITE_CONVEX_URL</code>
          qo'shib, qayta deploy qiling.
        </p>
      </div>
    </div>
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


const root = createRoot(document.getElementById("root")!);

if (!convex) {
  root.render(
    <ConfigErrorScreen message="VITE_CONVEX_URL muhit o'zgaruvchisi topilmadi." />,
  );
} else {
  root.render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <LangProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <RouteSyncer />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Public>
                        <Landing />
                      </Public>
                    }
                  />
                  <Route
                    path="/paketlar"
                    element={
                      <Public>
                        <Packages />
                      </Public>
                    }
                  />
                  <Route
                    path="/paketlar/:slug"
                    element={
                      <Public>
                        <PackageDetail />
                      </Public>
                    }
                  />
                  <Route
                    path="/xizmatlar"
                    element={
                      <Public>
                        <Services />
                      </Public>
                    }
                  />
                  <Route
                    path="/xizmatlar/:service"
                    element={
                      <Public>
                        <ServiceDetail />
                      </Public>
                    }
                  />
                  <Route
                    path="/hunarmandlar"
                    element={
                      <Public>
                        <Marketplace />
                      </Public>
                    }
                  />
                  <Route
                    path="/hamkorlar"
                    element={
                      <Public>
                        <Partners />
                      </Public>
                    }
                  />
                  <Route
                    path="/telegram"
                    element={
                      <TelegramEntry />
                    }
                  />
                  <Route
                    path="/auth"
                    element={<AuthPage redirectAfterAuth="/dashboard" />}
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/partner"
                    element={
                      <RequireAuth>
                        <Partner />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth>
                        <Admin />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Public>
                        <NotFound />
                      </Public>
                    }
                  />
                </Routes>
              </Suspense>
              <AiAssistant />
              <OnboardingGate />
            </BrowserRouter>
          </CurrencyProvider>
        </LangProvider>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
  );
}
