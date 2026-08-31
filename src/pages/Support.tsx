/**
 * Love page — FreeBrainer encouragement hub.
 *
 * Two distinct sections:
 *  1. "From Your BrainLovers" — cheers, pokes, video recommendations,
 *     plus an invite button to bring in more BrainLovers.
 *  2. "From Your FreeBrainers" — team rallies and SOS alerts from
 *     teammates, linking to the Community Wall.
 *
 * Followed by the Daily Brain Fact card.
 *
 * Route: /support (nav label: "Love" with heart icon)
 * Nav: FreeBrainer role only
 *
 * Video recommendations persist until the FreeBrainer completes a
 * check-in using that video — tapping "Watch This Video" opens the
 * check-in modal with that video pre-selected.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, ShieldAlert, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyBrainFact } from "@/components/shared/DailyBrainFact";
import { SOSRallyModal } from "@/components/shared/SOSRallyModal";
import { RallyTeamToMoveModal } from "@/components/shared/RallyTeamToMoveModal";
import { BrainLoverLoveSection } from "@/features/freebrainer/BrainLoverLoveSection";
import { FreeBrainerLoveSection } from "@/features/freebrainer/FreeBrainerLoveSection";
import { TeamSection } from "@/features/freebrainer/TeamSection";
import { CheckInModal } from "@/features/checkin/CheckInModal";
import { useOverviewData } from "@/features/freebrainer/useOverviewData";
import { useAuth } from "@/contexts/AuthContext";

export default function Support() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userTeamId } = useOverviewData();
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showRallyTeamModal, setShowRallyTeamModal] = useState(false);

  return (
    <div className="space-y-6 pb-24">
      {/* Page header + Rally Team & SOS CTAs (same row on desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight flex items-center gap-2">
            <Heart className="h-7 w-7 text-rose-500 fill-rose-500" />
            {t("love.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("love.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowRallyTeamModal(true)}
            variant="outline"
            className="gap-2 font-bold shadow-sm hover:shadow-info/20 border-info/40 text-info text-xs sm:text-sm"
          >
            <Megaphone className="h-4 w-4" />
            {t("rallyTeam.rallyButton", "Rally Team")}
          </Button>

          <Button
            onClick={() => setShowSOSModal(true)}
            variant="destructive"
            className="gap-2 font-bold shadow-md hover:shadow-danger/20 text-xs sm:text-sm"
          >
            <ShieldAlert className="h-4 w-4 animate-bounce" />
            {t("dashboard.sosHardDay", "SOS / Hard Day")}
          </Button>
        </div>
      </div>

      {/* Section 1: From Your BrainLovers — cheers, pokes, video recs + invite */}
      <BrainLoverLoveSection
        userId={user?.id}
        onWatchVideo={() => setCheckInModalOpen(true)}
      />

      {/* Section 2: From Your FreeBrainers — team rallies & SOS */}
      <FreeBrainerLoveSection
        userId={user?.id}
        teamId={userTeamId}
      />

      {/* Daily Brain Fact */}
      <DailyBrainFact />

      {/* Teams section — team profile, rank, and rally CTA */}
      <TeamSection />

      {/* Check-in modal — opened when user taps "Watch This Video" */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onOpenChange={setCheckInModalOpen}
      />

      {/* SOS + Rally Team modals (shared with dashboard) */}
      <SOSRallyModal
        isOpen={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        teamId={userTeamId}
      />

      <RallyTeamToMoveModal
        isOpen={showRallyTeamModal}
        onClose={() => setShowRallyTeamModal(false)}
        teamId={userTeamId}
        teamName={undefined}
      />
    </div>
  );
}
