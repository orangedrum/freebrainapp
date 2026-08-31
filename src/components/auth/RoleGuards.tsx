import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BrainFactLoader } from "@/components/shared/BrainFactLoader";

/**
 * Returns the default home path based on the user's role.
 */
export const getDefaultRouteForRole = (role: string | null): string => {
  if (role === "caregiver" || role === "brainlover") {
    return "/caregiver";
  }
  if (role === "pro") {
    return "/pro";
  }
  // FreeBrainer — dashboard is now the Overview page
  return "/overview";
};

/**
 * OnboardingRoute: Displays the onboarding flow unless user is already authenticated
 * and has completed onboarding, in which case it redirects them to their role's home page.
 */
export const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const { session, isLoading, onboardingCompleted, userRole, isAdmin } = useAuth();

  if (isLoading) {
    return <BrainFactLoader isLoading={isLoading} />;
  }

  // If there's a pendingOnboarding in localStorage, the user hasn't truly
  // finished onboarding yet (sub-account creation may have failed). Let them
  // stay on the onboarding page so the useEffect can re-process it.
  const hasPending = !!localStorage.getItem("pendingOnboarding");

  // Admins can always access onboarding to test the flow.
  // Non-admins are redirected if they've already completed onboarding
  // AND there's no pending onboarding to resume.
  if (session && onboardingCompleted && userRole && !isAdmin && !hasPending) {
    return <Navigate to={getDefaultRouteForRole(userRole)} replace />;
  }

  return <>{children}</>;
};

/**
 * ProtectedRoute: Enforces authentication and onboarding completion.
 * Renders DashboardLayout around protected child components.
 */
export const ProtectedRoute = ({
  children,
  index,
}: {
  children?: React.ReactNode;
  index?: boolean;
}) => {
  const { t } = useTranslation();
  const { session, isLoading, userRole, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <BrainFactLoader isLoading={isLoading} />;
  }

  if (!session) {
    // If the user explicitly signed out, send them to /auth (not /onboarding)
    if (sessionStorage.getItem("fb_signed_out") === "true") {
      sessionStorage.removeItem("fb_signed_out");
      return <Navigate to="/auth" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  // If there's a pending onboarding (sub-account creation failed), send them
  // back to onboarding so the useEffect can re-process it.
  const hasPending = !!localStorage.getItem("pendingOnboarding");
  if (hasPending && location.pathname !== "/join") {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to onboarding if incomplete (except when explicitly joining via invite link)
  if ((userRole === null || !onboardingCompleted) && location.pathname !== "/join") {
    return <Navigate to="/onboarding" replace />;
  }

  if (index) {
    const targetPath = getDefaultRouteForRole(userRole);
    // Always redirect from the index route to the role-specific dashboard
    return <Navigate to={targetPath} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};
