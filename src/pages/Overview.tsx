/**
 * Overview — FreeBrainer dashboard.
 *
 * Layout (top to bottom):
 *  1. "My Journey" title
 *  2. 50/50 grid: Virtual Sessions (left) | StreakRatioCard (right)
 *  3. TabbedLeaderboardSection (streak + score cards, then Me/My Team tabs)
 *  4. InsightsChartSection ("Aha!" chart)
 *
 * Modals: CheckInModal (auto-opens if not checked in), Calendly.
 * Banners: InstallBanner, InstallSuccessBanner.
 *
 * Rally Team & SOS CTAs live on the Love page (/support), not here.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { VirtualSessionCalendar } from "@/components/shared/VirtualSessionCalendar";
import { CalendlyModal } from "@/components/shared/CalendlyModal";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { InstallSuccessBanner } from "@/components/shared/InstallSuccessBanner";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InsightsChartSection } from "@/features/freebrainer/InsightsChartSection";
import { StreakRatioCard } from "@/features/freebrainer/StreakRatioCard";
import { TabbedLeaderboardSection } from "@/features/freebrainer/TabbedLeaderboardSection";
import { useOverviewData } from "@/features/freebrainer/useOverviewData";
import { CheckInModal } from "@/features/checkin/CheckInModal";
import { KeepMovingCard } from "@/features/checkin/KeepMovingCard";
import { useAuth } from "@/contexts/AuthContext";

export default function Overview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pwa = usePWAInstall();
  const { hasCheckedInToday, userTeamId, loading: overviewLoading, refetch: refetchOverview } = useOverviewData();
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  // Track if the user completed a check-in OR manually dismissed the modal
  // during THIS session. Either way, prevent the modal from reopening
  // during the refetch window (where hasCheckedInToday may briefly be false).
  const [completedCheckInThisSession, setCompletedCheckInThisSession] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  // Auto-open the check-in modal on every dashboard visit if not yet checked in today.
  // Wait for overview data to finish loading to avoid false-negative flash.
  useEffect(() => {
    if (overviewLoading) return;
    if (hasCheckedInToday || completedCheckInThisSession || dismissedThisSession) {
      setCheckInModalOpen(false);
    } else {
      setCheckInModalOpen(true);
    }
  }, [hasCheckedInToday, overviewLoading, completedCheckInThisSession, dismissedThisSession]);

  return (
    <div className="space-y-6 pb-24 text-foreground">
      {/* ── Row 1: "My Journey" title ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight flex items-center gap-2">
          <span>{t("dashboard.myJourney", "My Journey")}</span>
          <Sparkles className="h-6 w-6 text-gold animate-pulse" />
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("dashboard.journeySubtitle", "On-demand movement therapy, insights, and peer encouragement.")}
        </p>
      </div>

      {/* PWA install banners */}
      <InstallSuccessBanner
        justInstalled={pwa.justInstalled}
        onDismiss={pwa.dismissJustInstalled}
      />
      <InstallBanner
        platform={pwa.platform}
        isInstalled={pwa.isInstalled}
        shouldShowBanner={pwa.shouldShowBanner()}
        canInstall={pwa.canInstall}
        userEmail={user?.email || ""}
        onPromptInstall={pwa.promptInstall}
        onDismiss={pwa.markBannerDismissed}
      />



      {/* ── Keep Moving card (only when already checked in today) ── */}
      {!overviewLoading && hasCheckedInToday && (
        <KeepMovingCard />
      )}

      {/* ── Row 2: Virtual Sessions (left) | StreakRatioCard (right) — 50/50 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VirtualSessionCalendar
          freebrainerEmail={user?.email}
          freebrainerName={user?.user_metadata?.full_name || user?.email}
          onSchedule={() => setShowCalendlyModal(true)}
        />
        <StreakRatioCard />
      </div>

      {/* ── Row 3: Score cards + tabbed Me/My Team leaderboard ── */}
      <TabbedLeaderboardSection />

      {/* ── Row 4: "Aha!" Insights chart ── */}
      <InsightsChartSection />

      {/* ── Modals ── */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onOpenChange={(open) => {
          setCheckInModalOpen(open);
          if (!open) {
            // If the user closed the modal without completing check-in,
            // mark it as dismissed so it won't auto-reopen this session.
            // If they DID complete check-in, mark completed instead.
            if (!hasCheckedInToday && !completedCheckInThisSession) {
              setDismissedThisSession(true);
            } else {
              setCompletedCheckInThisSession(true);
            }
            refetchOverview();
          }
        }}
      />

      <CalendlyModal
        isOpen={showCalendlyModal}
        onClose={() => setShowCalendlyModal(false)}
        prefillEmail={user?.email}
        prefillName={user?.user_metadata?.full_name}
        inviteOptions={{
          teamId: userTeamId,
          freeBrainerId: user?.id,
          showTeamInvite: true,
          showBrainLoverInvite: true,
        }}
      />
    </div>
  );
}
