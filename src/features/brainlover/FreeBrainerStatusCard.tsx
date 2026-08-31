import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, UserPlus } from "lucide-react";
import { MovementStatusSection } from "@/components/shared/MovementStatusSection";
import { EncourageActions } from "./EncourageActions";

interface FreeBrainerStatusCardProps {
  hasCheckedInToday: boolean;
  todayCheckInDetails: any;
  patientId: string;
  patientName: string;
  patientAvatarUrl?: string;
  showSwitchingHint: boolean;
  encouragementCount: number;
  hasEncouragedToday: boolean;
  hasBoostedToday: boolean;
  caregiverId: string;
  caregiverEmail?: string;
  onEncouragementCountChange: (count: number) => void;
  onHasEncouragedChange: (encouraged: boolean) => void;
  onHasBoostedChange: (boosted: boolean) => void;
  freeBrainScore?: number;
  onBoostComplete?: () => void;
  isManaged?: boolean;
  onCheckIn?: () => void;
}

export function FreeBrainerStatusCard({
  hasCheckedInToday,
  todayCheckInDetails,
  patientId,
  patientName,
  patientAvatarUrl,
  showSwitchingHint,
  encouragementCount,
  hasEncouragedToday,
  hasBoostedToday,
  caregiverId,
  caregiverEmail,
  onEncouragementCountChange,
  onHasEncouragedChange,
  onHasBoostedChange,
  freeBrainScore,
  onBoostComplete,
  isManaged = false,
  onCheckIn,
}: FreeBrainerStatusCardProps) {
  const { t } = useTranslation();

  return (
    <MovementStatusSection
      hasCheckedIn={hasCheckedInToday}
      checkInDetails={todayCheckInDetails}
      displayName={patientName}
      avatarUrl={patientAvatarUrl}
      showSwitchingHint={showSwitchingHint}
      actions={
        <EncourageActions
          patientId={patientId}
          patientName={patientName}
          caregiverId={caregiverId}
          caregiverEmail={caregiverEmail}
          hasCheckedInToday={hasCheckedInToday}
          hasEncouragedToday={hasEncouragedToday}
          hasBoostedToday={hasBoostedToday}
          encouragementCount={encouragementCount}
          onEncouragementCountChange={onEncouragementCountChange}
          onHasEncouragedChange={onHasEncouragedChange}
          onHasBoostedChange={onHasBoostedChange}
          freeBrainScore={freeBrainScore}
          onBoostComplete={onBoostComplete}
          isManaged={isManaged}
          onCheckIn={onCheckIn}
        />
      }
    />
  );
}



interface EmptyFreeBrainerStateProps {
  caregiverType: string;
  onInvite: () => void;
  onBulkInvite: () => void;
  onCreateSubAccount: () => void;
}

export function EmptyFreeBrainerState({
  caregiverType,
  onInvite,
  onBulkInvite,
  onCreateSubAccount,
}: EmptyFreeBrainerStateProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-8 text-center space-y-4">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-bold">{t("caregiverDashboard.noLinkedFreeBrainer", "No Linked FreeBrainer Yet")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t("caregiverDashboard.noLinkedDesc", "Invite your FreeBrainer to connect and start supporting their daily movement journey.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={onInvite} className="gap-2 font-bold">
            <Heart className="h-4 w-4" /> {t("caregiverDashboard.inviteFreeBrainer", "Invite FreeBrainer")}
          </Button>
          {caregiverType === "professional" && (
            <>
              <Button variant="outline" onClick={onBulkInvite} className="gap-2 font-bold">
                <Users className="h-4 w-4 text-primary" /> {t("caregiverDashboard.bulkInvite", "Bulk Invite")}
              </Button>
              <Button variant="default" onClick={onCreateSubAccount} className="gap-2 font-bold">
                <UserPlus className="h-4 w-4" /> {t("caregiverDashboard.createSubAccount", "Create Sub-Account")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
