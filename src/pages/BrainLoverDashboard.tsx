/**
 * BrainLoverDashboard — slim composition layer for the BrainLover's
 * simplified dashboard.
 *
 * Layout (top to bottom):
 *  1. Install banner (PWA)
 *  2. FreeBrainerSelector (only if multiple)
 *  3. SOS alert (only if active)
 *  4. CompactProgressRow (streak / score / this month)
 *  5. FreeBrainer status card + EncourageActions
 *  6. Keep Moving card (only after checked in)
 *  7. BrainLoverSupportSection
 *  8. VirtualSessionCalendar
 *  9. LatestAhaInsight
 *
 * All sections are modular and live in src/features/brainlover/.
 * BrainLoverBase is NOT used here — it's kept intact for the Pro dashboard.
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { VirtualSessionCalendar } from "@/components/shared/VirtualSessionCalendar";
import { CalendlyModal } from "@/components/shared/CalendlyModal";
import { InviteFreeBrainerModal } from "@/features/shared/InviteFreeBrainerModal";
import { FreeBrainerStatusCard } from "@/features/brainlover/FreeBrainerStatusCard";
import { BrainLoverEmptyState } from "@/features/brainlover/BrainLoverEmptyState";
import { FreeBrainerSelector } from "@/features/brainlover/FreeBrainerSelector";
import { BrainLoverSOSAlert } from "@/features/brainlover/BrainLoverSOSAlert";

import { BrainLoverSupportSection } from "@/features/brainlover/BrainLoverSupportSection";
import { CompactProgressRow } from "@/features/brainlover/CompactProgressRow";
import { LatestAhaInsight } from "@/features/brainlover/LatestAhaInsight";
import { BrainLoverTeamSection } from "@/features/brainlover/BrainLoverTeamSection";

import { BrainLoverJointCheckInCard } from "@/features/brainlover/BrainLoverJointCheckInCard";
import { BrainLoverCheckInModal } from "@/features/brainlover/BrainLoverCheckInModal";
import { useBrainLoverData } from "@/features/brainlover/useBrainLoverData";
import { useBrainLoverSOS } from "@/features/brainlover/useBrainLoverSOS";
import { useBrainLoverEmptyState } from "@/features/brainlover/emptyStateFlag";
import { Button } from "@/components/ui/button";
import { Heart, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InviteBrainLoverChoiceModal } from "@/components/profile/InviteBrainLoverChoiceModal";

export default function BrainLoverDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pwa = usePWAInstall();
  const { setEmpty } = useBrainLoverEmptyState();

  const {
    isLoading,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    patient,
    hasCheckedInToday,
    todayCheckInDetails,
    hasEncouragedToday,
    setHasEncouragedToday,
    hasBoostedToday,
    setHasBoostedToday,
    encouragementCount,
    setEncouragementCount,
    caregiverType,
    loadDashboardData,
  } = useBrainLoverData(user?.id);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInviteBLModal, setShowInviteBLModal] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [scoreBoostKey, setScoreBoostKey] = useState(0);
  const jointCheckInRef = useRef<HTMLDivElement>(null);

  const { hasSOS } = useBrainLoverSOS(patient?.user_id);

  // Communicate empty state to DashboardLayout (hides bottom nav)
  // MUST be called before any early return — hooks violation otherwise.
  const isEmpty = !isLoading && !patient && patients.length === 0;
  useEffect(() => {
    setEmpty(isEmpty);
  }, [isEmpty, setEmpty]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        {t("caregiverDashboard.loading", "Loading dashboard...")}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 text-foreground">
      {/* ── 1. Install banner ── */}
      <InstallBanner
        platform={pwa.platform}
        isInstalled={pwa.isInstalled}
        shouldShowBanner={pwa.shouldShowBanner()}
        canInstall={pwa.canInstall}
        userEmail={user?.email || ""}
        onPromptInstall={pwa.promptInstall}
        onDismiss={pwa.markBannerDismissed}
      />

      {/* ── 2. FreeBrainer selector (full-width, only if multiple) ── */}
      {patients.length > 1 && (
        <FreeBrainerSelector
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelect={setSelectedPatientId}
        />
      )}

      {/* ── 2b. Small invite buttons (when BrainLover has FreeBrainers) ── */}
      {patient && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 border-primary/30"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("caregiverDashboard.inviteAnotherFreeBrainer", "Invite FreeBrainer")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 border-primary/30"
            onClick={() => setShowInviteBLModal(true)}
          >
            <Users className="h-3.5 w-3.5" />
            {t("caregiverDashboard.inviteBrainLover", "Invite BrainLover")}
          </Button>
        </div>
      )}

      {patient ? (
        <>
          {/* ── 3. SOS alert (only if active) ── */}
          {hasSOS && (
            <BrainLoverSOSAlert
              patientId={patient.user_id}
              patientName={patient.display_name}
              caregiverId={user!.id}
              caregiverEmail={user?.email}
            />
          )}

          {/* ── 4. Compact progress row (streak / score / this month) ── */}
          <CompactProgressRow patientId={patient.user_id} refreshKey={scoreBoostKey} />

          {/* ── 5. FreeBrainer status card ── */}
          <FreeBrainerStatusCard
            hasCheckedInToday={hasCheckedInToday}
            todayCheckInDetails={todayCheckInDetails}
            patientId={patient.user_id}
            patientName={patient.display_name}
            patientAvatarUrl={patient.avatar_url}
            showSwitchingHint={patients.length > 1}
            encouragementCount={encouragementCount}
            hasEncouragedToday={hasEncouragedToday}
            hasBoostedToday={hasBoostedToday}
            caregiverId={user!.id}
            caregiverEmail={user?.email}
            onEncouragementCountChange={setEncouragementCount}
            onHasEncouragedChange={setHasEncouragedToday}
            onHasBoostedChange={setHasBoostedToday}
            onBoostComplete={() => setScoreBoostKey((k) => k + 1)}
            isManaged={patient.isManaged}
            onCheckIn={() => setShowCheckInModal(true)}
          />

          {/* ── 5b. Keep Moving — joint check-in card (only after checked in today) ── */}
          {hasCheckedInToday && (
            <div ref={jointCheckInRef}>
              <BrainLoverJointCheckInCard
                patientId={patient.user_id}
                patientName={patient.display_name}
                caregiverId={user!.id}
                onCheckedIn={loadDashboardData}
              />
            </div>
          )}

          {/* ── 7. BrainLover support section ── */}
          <BrainLoverSupportSection
            patientId={patient.user_id}
            patientName={patient.display_name}
            patientAvatar={patient.avatar_url}
            caregiverId={user!.id}
          />

          {/* ── 7b. Team management (join/create/rally on behalf of FreeBrainer) ── */}
          <BrainLoverTeamSection patientId={patient.user_id} />

          {/* ── 8. Virtual session calendar ── */}
          <VirtualSessionCalendar
            freebrainerEmail={patient.email}
            freebrainerName={patient.display_name}
            onSchedule={() => setShowCalendlyModal(true)}
          />

          {/* ── 9. Latest Aha insight ── */}
          <LatestAhaInsight patientId={patient.user_id} patientName={patient.display_name} />
        </>
      ) : (
        /* ── Empty state — no FreeBrainers connected ── */
        <BrainLoverEmptyState onInvite={() => setShowInviteModal(true)} />
      )}

      {/* ── Modals ── */}
      {/* BrainLover check-in modal — full check-in flow on behalf of FreeBrainer */}
      {patient && (
        <BrainLoverCheckInModal
          isOpen={showCheckInModal}
          onOpenChange={setShowCheckInModal}
          patientId={patient.user_id}
          patientEmail={patient.email}
          onCheckedIn={loadDashboardData}
        />
      )}
      <CalendlyModal
        isOpen={showCalendlyModal}
        onClose={() => setShowCalendlyModal(false)}
        prefillEmail={user?.email}
        prefillName={user?.user_metadata?.full_name}
        patientName={patient?.display_name}
        inviteOptions={{
          freeBrainerId: patient?.user_id,
          showBrainLoverInvite: true,
        }}
      />

      {user && (
        <InviteFreeBrainerModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          caregiverId={user.id}
        />
      )}

      {/* ── Invite BrainLover choice modal ── */}
      <InviteBrainLoverChoiceModal
        isOpen={showInviteBLModal}
        onClose={() => setShowInviteBLModal(false)}
        patientId={patient?.user_id}
        patientName={patient?.display_name}
        patientAvatar={patient?.avatar_url}
        caregiverId={user?.id || ""}
        inviterName={undefined}
      />
    </div>
  );
}
