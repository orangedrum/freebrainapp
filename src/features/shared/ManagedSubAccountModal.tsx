/**
 * ManagedSubAccountModal — Create a managed FreeBrainer sub-account.
 * Used by BrainLovers/Pros for FreeBrainers without their own email.
 *
 * Logic lives in `useSubAccountCreate` hook — this is just the modal UI.
 * Fully i18n via `subAccountModal` namespace.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2, ShieldCheck } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { useSubAccountCreate } from "./useSubAccountCreate";

interface ManagedSubAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverId: string;
  onCreated?: () => void;
}

export function ManagedSubAccountModal({
  open,
  onOpenChange,
  caregiverId,
  onCreated,
}: ManagedSubAccountModalProps) {
  const { t } = useTranslation();
  const { form, isSaving, updateField, resetForm, createSubAccount } =
    useSubAccountCreate(caregiverId);

  const handleSave = async () => {
    const result = await createSubAccount();
    if (result) {
      onOpenChange(false);
      onCreated?.();
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                {t("subAccountModal.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {t("subAccountModal.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 overflow-y-auto flex-1 min-w-0">
          {/* Avatar preview */}
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(form.name || "freebrainer")}
              alt={form.name || "FreeBrainer"}
              className="h-14 w-14 rounded-full border-2 border-primary/20 shrink-0"
            />
            <p className="text-xs text-muted-foreground">
              {t("subAccountModal.avatarPreview")}
            </p>
          </div>

          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-semibold">
              {t("subAccountModal.displayNameLabel")}
            </Label>
            <Input
              placeholder={t("subAccountModal.displayNamePlaceholder")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="h-11 border-2 text-sm"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-semibold">
              {t("subAccountModal.conditionsLabel")}
            </Label>
            <Input
              placeholder={t("subAccountModal.conditionsPlaceholder")}
              value={form.conditions}
              onChange={(e) => updateField("conditions", e.target.value)}
              className="h-11 border-2 text-sm"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-semibold">
              {t("subAccountModal.locationLabel")}
            </Label>
            <Input
              placeholder={t("subAccountModal.locationPlaceholder")}
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="h-11 border-2 text-sm"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-semibold">
              {t("subAccountModal.diagnosisStoryLabel")}
            </Label>
            <Textarea
              placeholder={t("subAccountModal.diagnosisStoryPlaceholder")}
              value={form.diagnosisStory}
              onChange={(e) => updateField("diagnosisStory", e.target.value)}
              className="border-2 text-sm min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 border-2 rounded-xl gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <Label className="text-xs font-semibold cursor-pointer">
                  {t("subAccountModal.shareToWallLabel")}
                </Label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("subAccountModal.shareToWallDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={form.shareConsent}
              onCheckedChange={(v) => updateField("shareConsent", v)}
              className="scale-110 shrink-0"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
            className="w-full h-12 font-bold gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                {t("subAccountModal.createLinkBtn")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
