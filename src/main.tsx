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
