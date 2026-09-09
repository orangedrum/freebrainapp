import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useAuth } from "./contexts/AuthContext";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Overview from "./pages/Overview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading, onboardingCompleted } = useAuth();

  if (isLoading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const RootRoute = () => {
  const { session, isLoading, onboardingCompleted } = useAuth();

  if (isLoading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/overview" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <LanguageSwitcher />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
