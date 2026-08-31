/**
 * BrainLoverBase — the shared sections used by both BrainLover and Pro dashboards.
 *
 * This is NOT a full dashboard — it's a set of composable sections that each
 * page shell arranges independently. This keeps BrainLover and Pro experiences
 * decoupled while avoiding code duplication.
 *
 * Layout (top to bottom):
 *  1. Deletion warning banner (if applicable)
 *  2. Header: "BrainLover Portal" title + invite buttons + FreeBrainer selector
 *  3. FreeBrainer status card (or empty state)
 *  4. 50/50 grid: Virtual Sessions (left) | 30-Day Ratio (right)
 *  5. Tabbed leaderboard: "Your FreeBrainer" vs "FreeBrainer's Team"
 *  6. Aha Insights chart
 *
 * Pro-only sections (roster, facility overview, detail drawer) are NOT here —
 * they live in the Pro dashboard page and compose independently.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, Users, UserPlus, AlertCircle } from "lucide-react";
import { VirtualSessionCalendar } from "@/components/shared/VirtualSessionCalendar";
import { CalendlyModal } from "@/components/shared/CalendlyModal";
import { InviteFreeBrainerModal } from "@/features/shared/InviteFreeBrainerModal";
import { BulkInviteFreeBrainerModal } from "@/features/shared/BulkInviteFreeBrainerModal";
import { ManagedSubAccountModal } from "@/features/shared/ManagedSubAccountModal";
import { FreeBrainerStatusCard, EmptyFreeBrainerState } from "@/features/brainlover/FreeBrainerStatusCard";
import { FreeBrainerSelector } from "@/features/brainlover/FreeBrainerSelector";
import { BrainLoverInsightsChart } from "@/features/brainlover/BrainLoverInsightsChart";
import { BrainLoverStreakRatioCard } from "@/features/brainlover/BrainLoverStreakRatioCard";
import { BrainLoverTabbedLeaderboard } from "@/features/brainlover/BrainLoverTabbedLeaderboard";
import { DailyActionsIndicator } from "@/features/brainlover/DailyActionsIndicator";
import { useBrainLoverData } from "@/features/brainlover/useBrainLoverData";

export function BrainLoverBase({ showBulkInvite = false }: { showBulkInvite?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    isLoading, patients, selectedPatientId, setSelectedPatientId, patient,
    hasCheckedInToday, todayCheckInDetails, hasEncouragedToday, setHasEncouragedToday,
    hasBoostedToday, setHasBoostedToday,
    encouragementCount, setEncouragementCount, deletionScheduledAt, caregiverType, loadDashboardData,
  } = useBrainLoverData(user?.id);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showSubAccountModal, setShowSubAccountModal] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [scoreBoostKey, setScoreBoostKey] = useState(0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        {t("caregiverDashboard.loading", "Loading dashboard...")}
      </div>
    );
  }

  return (
    <>
      {/* ── Deletion warning ── */}
      {deletionScheduledAt && (
        <div className="bg-destructive/15 border border-destructive/30 p-4 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-destructive leading-tight">{t("caregiverDashboard.deletionWarning", "Account Deletion Warning")}</h3>
            <p className="text-sm text-destructive/90">
              {t("caregiverDashboard.deletionWarningDesc", "Your profile is currently missing a linked FreeBrainer. You have until")}{" "}
              <strong>{new Date(deletionScheduledAt).toLocaleString()}</strong>{" "}
              {t("caregiverDashboard.deletionWarningDesc2", "to link a FreeBrainer before your account is automatically removed.")}
            </p>
            <Button size="sm" variant="link" className="text-destructive font-bold p-0 h-auto underline" asChild>
              <a href="/profile">{t("caregiverDashboard.linkNow", "Link a FreeBrainer now →")}</a>
            </Button>
          </div>
        </div>
      )}

      {/* ── Header: title + invite buttons + FreeBrainer selector ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight flex items-center gap-2 text-foreground">
            <Heart className="h-6 w-6 sm:h-7 w-7 text-primary fill-primary/20" />
            {t("caregiverDashboard.brainLoverPortal", "Dashboard")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("caregiverDashboard.portalSubtitle", "Cheer on and support your FreeBrainer's daily movement journey.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={() => setShowInviteModal(true)}>
            <Heart className="h-3.5 w-3.5 text-primary" /> {t("caregiverDashboard.inviteFreeBrainer", "Invite FreeBrainer")}
          </Button>
          {showBulkInvite && caregiverType === "professional" && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={() => setShowBulkInviteModal(true)}>
                <Users className="h-3.5 w-3.5 text-primary" /> {t("caregiverDashboard.bulkInvite", "Bulk Invite")}
              </Button>
              <Button variant="default" size="sm" className="gap-1.5 text-xs font-semibold" onClick={() => setShowSubAccountModal(true)}>
                <UserPlus className="h-3.5 w-3.5" /> {t("caregiverDashboard.subAccount", "Sub-Account")}
              </Button>
            </>
          )}
          <FreeBrainerSelector patients={patients} selectedPatientId={selectedPatientId} onSelect={setSelectedPatientId} />
        </div>
      </div>

      {/* ── FreeBrainer status card (or empty state) ── */}
      {patient && (
        <div className="flex justify-end">
          <DailyActionsIndicator patientId={patient.user_id} />
        </div>
      )}
      {patient ? (
        <FreeBrainerStatusCard
          hasCheckedInToday={hasCheckedInToday}
          todayCheckInDetails={todayCheckInDetails}
          patientId={patient.user_id}
          patientName={patient.display_name}
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
        />
      ) : (
        <EmptyFreeBrainerState
          caregiverType={caregiverType}
          onInvite={() => setShowInviteModal(true)}
          onBulkInvite={() => setShowBulkInviteModal(true)}
          onCreateSubAccount={() => setShowSubAccountModal(true)}
        />
      )}

      {/* ── 50/50: Virtual Sessions (left) | 30-Day Ratio (right) ── */}
      {patient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VirtualSessionCalendar
            freebrainerEmail={patient.email}
            freebrainerName={patient.display_name}
            onSchedule={() => setShowCalendlyModal(true)}
          />
          <BrainLoverStreakRatioCard patientId={patient.user_id} />
        </div>
      )}

      {/* ── Tabbed leaderboard: Your FreeBrainer / FreeBrainer's Team ── */}
      {patient && (
        <BrainLoverTabbedLeaderboard
          patientId={patient.user_id}
          patientName={patient.display_name}
          caregiverId={user?.id}
          caregiverEmail={user?.email}
          refreshKey={scoreBoostKey}
        />
      )}

      {/* ── Aha Insights chart ── */}
      <BrainLoverInsightsChart patient={patient} />

      {/* ── Modals ── */}

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

      {user && <InviteFreeBrainerModal open={showInviteModal} onOpenChange={setShowInviteModal} caregiverId={user.id} />}
      {user && showBulkInvite && <BulkInviteFreeBrainerModal open={showBulkInviteModal} onOpenChange={setShowBulkInviteModal} caregiverId={user.id} />}
      {user && showBulkInvite && <ManagedSubAccountModal open={showSubAccountModal} onOpenChange={setShowSubAccountModal} caregiverId={user.id} onCreated={loadDashboardData} />}
    </>
  );
}
