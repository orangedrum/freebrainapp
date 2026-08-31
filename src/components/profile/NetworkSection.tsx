import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, AlertTriangle, Heart, Brain, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { InviteTeammateModal } from "@/components/profile/InviteTeammateModal";
import { TeamProfileEditor } from "@/components/shared/TeamProfileEditor";
import { InviteFreeBrainerModal } from "@/features/shared/InviteFreeBrainerModal";
import { BulkInviteFreeBrainerModal } from "@/features/shared/BulkInviteFreeBrainerModal";
import { ManagedSubAccountModal } from "@/features/shared/ManagedSubAccountModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NetworkSectionProps {
  isCaregiver: boolean;
  userRole: string;
  caregivers: any[];
  selectedPatientForTeam: string | null;
  setSelectedPatientForTeam: (id: string | null) => void;
  team: any;
  onFetchTeam: (userId: string) => void;
  onOpenTeamModal: () => void;
  onOpenCaregiverModal: () => void;
  onLeaveTeam: () => void;
  onRemoveLink?: (idToRemove: string, isLastPatient: boolean) => void;
  caregiverId?: string;
  caregiverType?: string;
}

export function NetworkSection({
  isCaregiver,
  userRole,
  caregivers,
  selectedPatientForTeam,
  setSelectedPatientForTeam,
  team,
  onFetchTeam,
  onOpenTeamModal,
  onOpenCaregiverModal,
  onLeaveTeam,
  onRemoveLink,
  caregiverId,
  caregiverType,
}: NetworkSectionProps) {
  const { t } = useTranslation();
  const [patientToRemove, setPatientToRemove] = useState<any | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInviteFreeBrainer, setShowInviteFreeBrainer] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [showSubAccount, setShowSubAccount] = useState(false);

  const isPro = caregiverType === "professional";

  const roleLabel = isCaregiver ? t("roles.freebrainer") : t("roles.brainlover");

  const handleConfirmRemove = () => {
    if (!patientToRemove || !onRemoveLink) return;
    const isLast = caregivers.length <= 1;
    const id = isCaregiver ? patientToRemove.patient_id : patientToRemove.caregiver_id;
    onRemoveLink(id, isLast);
    setPatientToRemove(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("network.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground">
              {isCaregiver ? t("network.freeBrainerTeam") : t("network.myTeam")}
            </Label>
          </div>

          {isCaregiver && caregivers.length > 0 && (
            <div className="mb-4">
              <Select
                value={selectedPatientForTeam || ""}
                onValueChange={(val) => {
                  setSelectedPatientForTeam(val);
                  onFetchTeam(val);
                }}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder={t("network.selectFreeBrainer")} />
                </SelectTrigger>
                <SelectContent>
                  {caregivers.map((c: any) => (
                    <SelectItem key={c.patient_id} value={c.patient_id}>
                      {c.profiles?.display_name || t("profile.freeBrainerFallback")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(!isCaregiver || selectedPatientForTeam) && (
            team ? (
              <div className="bg-muted p-4 rounded-lg border flex flex-col items-start gap-4 w-full">
                <TeamProfileEditor team={team} onTeamUpdated={(updated) => onFetchTeam(selectedPatientForTeam || "")} />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 w-full">
                  <p className="text-xs text-muted-foreground break-all">
                    {t("network.teamCode")}:{" "}
                    <span className="font-mono font-bold text-foreground bg-background px-1.5 py-0.5 rounded border">
                      {team.code || team.id}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-2"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> {t("network.inviteTeammate")}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 w-full text-xs" onClick={onLeaveTeam}>
                  {t("network.leaveTeam")}
                </Button>
              </div>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg border text-center space-y-3 w-full">
                <p className="text-sm text-muted-foreground">
                  {isCaregiver ? t("network.notInTeamCaregiver") : t("network.notInTeam")}
                </p>
                <Button
                  variant="default"
                  className="w-full whitespace-normal h-auto py-3 px-4 text-primary-foreground bg-primary leading-tight"
                  onClick={onOpenTeamModal}
                >
                  {t("network.joinOrStartTeam")}
                </Button>
              </div>
            )
          )}

          {isCaregiver && caregivers.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              {t("network.noFreeBrainersLinked")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col items-start gap-2">
            <Label className="text-muted-foreground">
              {isCaregiver ? t("network.associatedFreeBrainers") : t("network.associatedBrainLover")}
            </Label>
            {!isCaregiver && (
              <p className="text-xs text-muted-foreground bg-primary/5 p-2.5 rounded-lg border border-primary/10 leading-relaxed">
                {t("network.brainLoverHelpDesc")}
              </p>
            )}
            {isCaregiver ? (
              <div className="flex flex-wrap gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={() => setShowInviteFreeBrainer(true)} className="gap-1">
                  <Heart className="h-4 w-4 text-primary" /> {t("network.inviteFreeBrainer")}
                </Button>
                {isPro && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowBulkInvite(true)} className="gap-1">
                      <Brain className="h-4 w-4 text-primary" /> {t("network.bulkInvite")}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setShowSubAccount(true)} className="gap-1">
                      <UserPlus className="h-4 w-4" /> {t("network.subAccount")}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={onOpenCaregiverModal} className="mt-1">
                <Plus className="h-4 w-4 mr-1" /> {t("network.invite")}
              </Button>
            )}
          </div>
          {caregivers.length > 0 ? (
            <div className="space-y-2">
              {caregivers.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {(c as any).profiles?.display_name?.substring(0, 2).toUpperCase() || (isCaregiver ? "FB" : "BL")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {(c as any).profiles?.display_name || (isCaregiver ? t("profile.freeBrainerFallback") : t("roles.brainlover"))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {isCaregiver ? t("network.linkedFreeBrainer") : t("network.linkedBrainLover")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      title={isCaregiver ? t("network.removeFreeBrainer") : t("network.removeBrainLover")}
                      onClick={() => setPatientToRemove(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isCaregiver ? t("network.noFreeBrainersLinkedShort") : t("network.noBrainLoversLinked")}
            </p>
          )}
        </div>

        {/* Confirmation Modal */}
        <AlertDialog open={!!patientToRemove} onOpenChange={(open) => !open && setPatientToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("network.confirmRemoveTitle", { role: roleLabel })}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-foreground/80">
                <p>
                  {t("network.confirmRemoveDesc", {
                    name: patientToRemove?.profiles?.display_name || (isCaregiver ? t("profile.freeBrainerFallback") : t("roles.brainlover")),
                  })}
                </p>
                {isCaregiver ? (
                  caregivers.length <= 1 && (
                    <div className="p-3 bg-warning/15 border border-warning/30 rounded-lg text-warning text-xs font-medium space-y-1">
                      <p className="font-bold text-warning">{t("network.caregiverWarningTitle")}</p>
                      <p>{t("network.caregiverWarningDesc")}</p>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    {t("network.freeBrainerNoRequirement")}
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("network.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("network.confirmRemove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Invite Teammate Modal */}
        <InviteTeammateModal open={showInviteModal} onOpenChange={setShowInviteModal} team={team} />

        {/* BrainLover: Invite FreeBrainer Modal */}
        {isCaregiver && caregiverId && (
          <InviteFreeBrainerModal open={showInviteFreeBrainer} onOpenChange={setShowInviteFreeBrainer} caregiverId={caregiverId} />
        )}

        {/* Pro: Bulk Invite Modal */}
        {isCaregiver && isPro && caregiverId && (
          <BulkInviteFreeBrainerModal open={showBulkInvite} onOpenChange={setShowBulkInvite} caregiverId={caregiverId} />
        )}

        {/* Pro: Managed Sub-Account Modal */}
        {isCaregiver && isPro && caregiverId && (
          <ManagedSubAccountModal open={showSubAccount} onOpenChange={setShowSubAccount} caregiverId={caregiverId} />
        )}
      </CardContent>
    </Card>
  );
}
