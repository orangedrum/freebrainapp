/**
 * ProSubAccountManager — Inline panel (not a modal) for BrainLover Pros to
 * create managed FreeBrainer sub-accounts for people without email addresses.
 *
 * Logic lives in `useSubAccountCreate` hook — this is just the inline card UI
 * + the existing-accounts list. Reuses the same Supabase insert logic.
 *
 * i18n: `subAccountModal.*` namespace (shared with the modal) + `pro.subAccount.*`.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/avatar";
import { useSubAccountCreate } from "@/features/shared/useSubAccountCreate";

interface ProSubAccountManagerProps {
  proId: string;
  onCreated?: () => void;
}

interface ManagedEntry {
  id: string;
  display_name: string;
  conditions: string | null;
}

export function ProSubAccountManager({ proId, onCreated }: ProSubAccountManagerProps) {
  const { t } = useTranslation();
  const { form, isSaving, updateField, resetForm, createSubAccount } =
    useSubAccountCreate(proId);
  const [showForm, setShowForm] = useState(false);
  const [managedList, setManagedList] = useState<ManagedEntry[]>([]);

  const loadManaged = useCallback(async () => {
    if (!proId) return;
    try {
      const { data } = await supabase
        .from("managed_freebrainers")
        .select("id, display_name, conditions")
        .eq("managed_by", proId);
      setManagedList(data || []);
    } catch (err) {
      console.error("Failed to load managed sub-accounts:", err);
    }
  }, [proId]);

  useEffect(() => {
    loadManaged();
  }, [loadManaged]);

  const handleSave = async () => {
    const result = await createSubAccount();
    if (result) {
      setShowForm(false);
      onCreated?.();
      loadManaged();
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t("pro.subAccount.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("pro.subAccount.description")}
            </p>
          </div>
        </div>
        {managedList.length > 0 && (
          <Badge variant="outline" className="text-xs shrink-0">
            {t("pro.subAccount.managedCount", { count: managedList.length })}
          </Badge>
        )}
      </div>

      {/* Existing managed accounts list */}
      {managedList.length > 0 && (
        <div className="space-y-2">
          {managedList.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30"
            >
              <img
                src={getAvatarUrl(entry.display_name)}
                alt={entry.display_name}
                className="h-8 w-8 rounded-full border border-primary/20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.display_name}
                </p>
                {entry.conditions && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.conditions}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle form button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-2 gap-1.5 text-sm font-semibold"
        onClick={() => setShowForm((prev) => !prev)}
      >
        {showForm ? (
          <>
            <ChevronUp className="h-4 w-4" />
            {t("pro.subAccount.cancelCreate")}
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            {t("pro.subAccount.createAnother")}
          </>
        )}
      </Button>

      {/* Inline form */}
      {showForm && (
        <div className="space-y-4 pt-2 border-t border-border/30">
          {/* Avatar preview */}
          <div className="flex items-center gap-3 pt-2">
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
      )}
    </Card>
  );
}
