import { useTranslation } from "react-i18next";
import { AhaInsightsSection } from "@/components/shared/AhaInsightsSection";
import { useAuth } from "@/contexts/AuthContext";

/**
 * FreeBrainer dashboard section: "Aha!" Insights Chart.
 *
 * Thin wrapper around the shared AhaInsightsSection, pre-wired with
 * the FreeBrainer's own user data and share consent enabled by default
 * (FreeBrainers always see their own insights).
 *
 * The shared component handles all i18n internally.
 */
export function InsightsChartSection() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <AhaInsightsSection
      userId={user?.id || ""}
      displayName={user?.email?.split("@")[0] || t("scoreboard.you", "You")}
      shareConsent={true}
    />
  );
}
