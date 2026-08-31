/**
 * useFreeBrainerProfile — fetches and manages a selected FreeBrainer's
 * profile data for the BrainLover's "Them" tab.
 *
 * BrainLovers have full edit access to their FreeBrainer's profile:
 * name, location, diagnosis story, wellness params, favorite movements,
 * wearable, share consent, language — everything the FreeBrainer can edit.
 *
 * Reuses the same ProfileData shape and localStorage patterns as
 * useProfileData to avoid redundant code.
 *
 * Tier 1: wellness params stored in localStorage via symptomStorage.
 * Tier 2: profile fields stored in Supabase profiles table.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getWellnessParams, setWellnessParams } from "@/lib/symptomStorage";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { ProfileData } from "@/features/profile/useProfileData";

const DEFAULT_PROFILE: ProfileData = {
  display_name: "",
  avatar_url: "",
  location: "",
  diagnosis_story: "",
  favorite_movements: [],
  symptoms: [],
  wearable_connected: false,
  share_consent: false,
  locale: "en",
  deletion_scheduled_at: null,
  caregiver_type: "",
};

export function useFreeBrainerProfile(patientId: string | undefined) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    if (!patientId) {
      setProfile(DEFAULT_PROFILE);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // ── Try profiles table first ──
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", patientId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const fetchedSymptoms = getWellnessParams(patientId);

      if (profileData) {
        const p = profileData as any;
        setProfile({
          display_name: p.display_name || "",
          avatar_url: p.avatar_url || "",
          location: p.location || "",
          diagnosis_story: p.diagnosis_story || "",
          favorite_movements: p.favorite_movements || [],
          symptoms: fetchedSymptoms,
          wearable_connected: p.wearable_connected || false,
          share_consent: p.share_consent || false,
          locale: p.locale || "en",
          deletion_scheduled_at: p.deletion_scheduled_at || null,
          caregiver_type: p.caregiver_type || "",
        });
      } else {
        // ── Fallback: managed_freebrainers (sub-accounts without a profiles row) ──
        const { data: managed, error: managedErr } = await supabase
          .from("managed_freebrainers")
          .select("*")
          .eq("id", patientId)
          .maybeSingle();

        if (managedErr && managedErr.code !== "PGRST116") {
          console.warn("[useFreeBrainerProfile] managed_freebrainers error:", managedErr);
        }

        if (managed) {
          const m = managed as any;
          setProfile({
            display_name: m.display_name || "",
            avatar_url: m.avatar_url || "",
            location: m.location || "",
            diagnosis_story: m.diagnosis_story || "",
            favorite_movements: m.favorite_movements || [],
            symptoms: fetchedSymptoms,
            wearable_connected: m.wearable_connected || false,
            share_consent: m.share_consent || false,
            locale: m.locale || "en",
            deletion_scheduled_at: m.deletion_scheduled_at || null,
            caregiver_type: m.caregiver_type || "",
          });
        } else {
          setProfile({ ...DEFAULT_PROFILE, symptoms: fetchedSymptoms });
        }
      }
    } catch (err) {
      console.error("[useFreeBrainerProfile] Error fetching:", err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async () => {
    if (!patientId) return;
    try {
      setIsSaving(true);

      // ── Try profiles table first; if no row exists, save to managed_freebrainers ──
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", patientId)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .upsert({
            user_id: patientId,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            location: profile.location,
            diagnosis_story: profile.diagnosis_story,
            favorite_movements: profile.favorite_movements,
            wearable_connected: profile.wearable_connected,
            share_consent: profile.share_consent,
            locale: profile.locale,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "user_id" });
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("managed_freebrainers") as any)
          .update({
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            location: profile.location,
            diagnosis_story: profile.diagnosis_story,
            favorite_movements: profile.favorite_movements,
            wearable_connected: profile.wearable_connected,
            share_consent: profile.share_consent,
            locale: profile.locale,
          } as any)
          .eq("id", patientId);
        if (error) throw error;
      }

      setWellnessParams(patientId, profile.symptoms);
      toast({
        title: t("profile.savedTitle", "Profile updated"),
        description: t("profile.savedDesc", "Your profile has been successfully saved."),
      });
    } catch (err: any) {
      toast({
        title: t("profile.errorTitle", "Error saving profile"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [patientId, profile, toast, t]);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setProfile((prev: ProfileData) => ({ ...prev, avatar_url: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ title: t("profile.uploadFailed", "Upload failed"), description: err.message, variant: "destructive" });
    }
  }, [toast, t]);

  return {
    isLoading,
    isSaving,
    profile,
    setProfile,
    fileInputRef,
    saveProfile,
    handlePhotoUpload,
    refetch: fetchProfile,
  };
}
