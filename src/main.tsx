import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import "./lib/i18n";
import "./index.css";
import { FB_BUILD_ID } from "./lib/buildInfo";

// Build stamp in console: "which build is running?" answered without DevTools
// archaeology. Matches the footer stamp rendered by DashboardLayout.
console.log("[FB-DEBUG] FreeBrain build:", FB_BUILD_ID);

// Poisoned-token purge: when arriving with FRESH auth credentials in the URL
// (magic-link click), drop any stale stored session FIRST. A stale token
// (expired, or for a DB-wiped test user) makes getSession() attempt a refresh
// that can pend indefinitely in Safari — bricking boot with zero output while
// other accounts on the same browser sail through. The hash provides the new
// session, so the stale one is garbage by definition. No-op otherwise.
try {
  if (typeof window !== "undefined" && /access_token=|error_description=/.test(window.location.hash)) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        console.log("[FB-DEBUG] Dropping stale stored session (fresh credentials in URL).");
        localStorage.removeItem(k);
      }
    }
  }
} catch (e) {
  console.warn("[FB-DEBUG] Token purge skipped:", e);
}

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-muted-foreground">Loading…</div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </AuthProvider>
  </ErrorBoundary>,
);
