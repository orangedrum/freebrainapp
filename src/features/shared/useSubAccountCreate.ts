/**
 * useSubAccountCreate — Shared hook for creating managed FreeBrainer
 * sub-accounts (people without their own email address).
 */
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser, createDevSubAccount } from "@/lib/devBypass";
import { getAvatarUrl } from "@/lib/avatar";

export interface SubAccountForm {
  name: string;
  conditions: string;
  location: string;
  diagnosisStory: string;
  shareConsent: boolean;
}

const EMPTY_FORM: SubAccountForm = {
  name: "",
  conditions: "",
  location: "",
  diagnosisStory: "",
  shareConsent: false,
};

/**
 * ensureSameTeam — ensures a BrainLover and their FreeBrainer are on the same team.
 * If neither has a team, creates a new one and adds both.
 * If one has a team, adds the other to it.
 */
export async function ensureSameTeam(
  brainLoverId: string,
  freeBrainerId: string
): Promise<void> {
  if (!brainLoverId || !freeBrainerId) return;

  try {
    // Check if BrainLover already has a team
    const { data: blTeam } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", brainLoverId)
      .maybeSingle();

    let teamId: string | null = (blTeam as { team_id: string } | null)?.team_id ?? null;

    // If BrainLover has no team, check if FreeBrainer has one
    if (!teamId) {
      const { data: fbTeam } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", freeBrainerId)
        .maybeSingle();
      teamId = (fbTeam as { team_id: string } | null)?.team_id ?? null;
    }

    // If neither has a team, create a new one
    if (!teamId) {
      console.log("[FB-DEBUG] ensureSameTeam: creating new team for BL + FB");
      const { data: newTeam, error: teamErr } = await (supabase.from("teams") as any)
        .insert({
          name: "My Team",
          created_by: brainLoverId,
        })
        .select("id")
        .single();

      if (teamErr || !newTeam) {
        console.warn("[FB-DEBUG] ensureSameTeam: failed to create team:", teamErr?.message);
        return;
      }
      teamId = (newTeam as any).id;
      console.log("[FB-DEBUG] ensureSameTeam: created new team:", teamId);
    }

    // Add both BrainLover and FreeBrainer to the team (upsert on user_id unique)
    // Insert each separately to handle the UNIQUE(user_id) constraint.
    for (const member of [
      { user_id: brainLoverId, team_id: teamId },
      { user_id: freeBrainerId, team_id: teamId },
    ]) {
      const { data: existing } = await (supabase.from("team_members") as any)
        .select("id")
        .eq("user_id", member.user_id)
        .maybeSingle();
      if (!existing) {
        await (supabase.from("team_members") as any).insert(member);
      } else {
        await (supabase.from("team_members") as any)
          .update({ team_id: teamId })
          .eq("user_id", member.user_id);
      }
    }
    console.log("[FB-DEBUG] ensureSameTeam: both members added to team:", teamId);
  } catch (e) {
    console.warn("ensureSameTeam error (non-fatal):", e);
  }
}

export function useSubAccountCreate(caregiverId: string) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState<SubAccountForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = useCallback(
    <K extends keyof SubAccountForm>(field: K, value: SubAccountForm[K]) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  const resetForm = useCallback(() => setForm(EMPTY_FORM), []);

  const createSubAccount = useCallback(async () => {
    if (!form.name.trim()) {
      toast({
        title: t("subAccountModal.nameRequiredTitle"),
        description: t("subAccountModal.nameRequiredDesc"),
        variant: "destructive",
      });
      return null;
    }

    setIsSaving(true);
    try {
      if (isDevBypassUser(caregiverId)) {
        const mock = createDevSubAccount({
          name: form.name.trim(),
          conditions: form.conditions,
          location: form.location,
          diagnosisStory: form.diagnosisStory,
        });
        toast({
          title: t("subAccountModal.createdTitle"),
          description: t("subAccountModal.createdDesc", { name: form.name.trim() }),
        });
        resetForm();
        return { id: mock.id };
      }

      const { data: managed, error: managedErr } = await supabase
        .from("managed_freebrainers")
        .insert({
          managed_by: caregiverId,
          display_name: form.name.trim(),
          avatar_url: getAvatarUrl(form.name.trim()),
          conditions: form.conditions.trim() || null,
          location: form.location.trim() || null,
          diagnosis_story: form.diagnosisStory.trim() || null,
          share_consent: form.shareConsent,
        } as any)
        .select("id")
        .single();

      if (managedErr) throw managedErr;
      if (!managed) throw new Error("Failed to create managed FreeBrainer");

      const patientId = (managed as any).id;

      await (supabase.from("caregiver_links") as any).insert({
        caregiver_id: caregiverId,
        patient_id: patientId,
        status: "managed",
      });

      await ensureSameTeam(caregiverId, patientId);

      toast({
        title: t("subAccountModal.createdTitle"),
        description: t("subAccountModal.createdDesc", { name: form.name.trim() }),
      });

      resetForm();
      return managed;
    } catch (err: any) {
      toast({
        title: t("subAccountModal.failedTitle"),
        description: err.message || t("subAccountModal.failedDesc"),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [caregiverId, form, resetForm, t, toast]);

  return {
    form,
    isSaving,
    updateField,
    resetForm,
    createSubAccount,
  };
}
