import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OnboardingRoute, ProtectedRoute } from "@/components/auth/RoleGuards";

import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Overview from "./pages/Overview";
import Support from "./pages/Support";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import BrainLoverDashboard from "./pages/BrainLoverDashboard";
import BrainLoverUpdates from "./pages/BrainLoverUpdates";
import BrainLoverProDashboard from "./pages/BrainLoverProDashboard";
import AdminControls from "./pages/AdminControls";
import JoinTeam from "./pages/JoinTeam";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { initBadgeClearOnVisible } from "@/lib/pushSubscriptions";

const queryClient = new QueryClient();

/**
 * Mounts the silent-update listeners (controllerchange → reload-or-defer,
 * foreground + interval update checks) and clears the app-icon badge while
 * the app is open. Renderless — see usePWAUpdate + pushSubscriptions.
 */
function PWAUpdateManager() {
  usePWAUpdate();
  useEffect(() => {
    initBadgeClearOnVisible();
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PWAUpdateManager />
        <Routes>
          {/* Bare routes — no DashboardLayout chrome */}
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <Onboarding />
              </OnboardingRoute>
            }
          />

          {/* Dashboards — ProtectedRoute renders DashboardLayout (sidebar + bottom nav) */}
          <Route path="/" element={<ProtectedRoute index />} />
          {/* Invite landing — intentionally PUBLIC (no ProtectedRoute).
              Invitees click magic links with no session yet; the guard used to
              bounce them to bare /onboarding, destroying the invite context
              before JoinTeam could recover it. JoinTeam handles both cases
              internally (!user → forwards the full intent to /onboarding). */}
          <Route path="/join" element={<JoinTeam />} />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute>
                <BrainLoverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/updates"
            element={
              <ProtectedRoute>
                <BrainLoverUpdates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pro"
            element={
              <ProtectedRoute>
                <BrainLoverProDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-controls"
            element={
              <ProtectedRoute>
                <AdminControls />
              </ProtectedRoute>
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;