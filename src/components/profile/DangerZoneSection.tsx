import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";

interface DangerZoneSectionProps {
  userId: string;
  deletionScheduledAt: string | null;
  onProfileDeletionUpdated: (date: string | null) => void;
}

export function DangerZoneSection({
  userId,
  deletionScheduledAt,
  onProfileDeletionUpdated,
}: DangerZoneSectionProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleInitiateDelete = (targetUserId: string) => {
    setUserToDelete(targetUserId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const scheduledAt = new Date().toISOString();
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ deletion_scheduled_at: scheduledAt })
        .eq('user_id', userToDelete);

      if (error) throw error;

      toast({ title: t("dangerZone.scheduledTitle", "Account scheduled for deletion"), description: t("dangerZone.scheduledDesc", "You have 48 hours to undo this action.") });

      onProfileDeletionUpdated(scheduledAt);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast({ title: t("dangerZone.errorScheduling", "Error scheduling deletion"), description: error.message, variant: "destructive" });
    }
  };

  const undoDelete = async (targetUserId: string) => {
    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ deletion_scheduled_at: null })
        .eq('user_id', targetUserId);

      if (error) throw error;

      toast({ title: t("dangerZone.cancelledTitle", "Deletion cancelled"), description: t("dangerZone.cancelledDesc", "The account has been restored.") });
      onProfileDeletionUpdated(null);
    } catch (error: any) {
      toast({ title: t("dangerZone.errorUndo", "Error undoing deletion"), description: error.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="pt-6 border-t">
        <Card className="border-destructive/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {t("dangerZone.title", "Danger Zone")}
            </CardTitle>
            <CardDescription>{t("dangerZone.desc", "Irreversible actions for your account.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-destructive/5">
              <div>
                <h4 className="font-semibold text-destructive">{t("dangerZone.deleteMyAccount", "Delete My Account")}</h4>
                <p className="text-sm text-muted-foreground">{t("dangerZone.deleteMyAccountDesc", "Schedule your account for deletion. You will have 48 hours to undo this action.")}</p>
              </div>
              {deletionScheduledAt ? (
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <Badge variant="destructive" className="self-start sm:self-end">{t("dangerZone.scheduled", "Deletion Scheduled")}</Badge>
                  <Button variant="outline" className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10" onClick={() => undoDelete(userId)}>{t("dangerZone.undo", "Undo Deletion")}</Button>
                </div>
              ) : (
                <Button variant="destructive" className="w-full sm:w-auto" onClick={() => handleInitiateDelete(userId)}>{t("dangerZone.deleteAccount", "Delete Account")}</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {t("dangerZone.confirmTitle", "Are you absolutely sure?")}
            </DialogTitle>
            <DialogDescription>
              {t("dangerZone.confirmDesc", "This action will schedule the account for deletion. You will have a 48-hour grace period to undo this action. After 48 hours, all data will be permanently removed.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button variant="destructive" onClick={confirmDelete}>{t("dangerZone.confirmDelete", "Yes, Schedule Deletion")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
