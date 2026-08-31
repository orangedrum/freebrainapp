import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import "./i18n";
import "./index.css";

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-muted-foreground">Loading…</div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </ErrorBoundary>,
);
