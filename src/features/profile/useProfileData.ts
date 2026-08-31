import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { getWellnessParams, setWellnessParams } from "@/lib/symptomStorage";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { isDevBypassUser } from "@/lib/devBypass";
export interface ProfileData {
  display_name: string;
  avatar_url: string;
  location: string;
  diagnosis_story: string;
  favorite_movements: string[];
  symptoms: string[];
  wearable_connected: boolean;
  share_consent: boolean;
  locale: string;
  deletion_scheduled_at: string | null;
  caregiver_type: string;
}

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

/**
 * Centralized profile data hook — all data fetching, state, and mutations
 * for the Profile page. Extracted from the 567-line Profile.tsx monolith.
 *
 * Two-tier architecture:
 *   - Tier 1 (localStorage): symptoms / wellness params (HIPAA)
 *   - Tier 2 (Supabase): profile, team, caregiver links
 */
export function useProfileData() {
  const { user, isTestingMode, userRole } = useAuth();
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [team, setTeam] = useState<any>(null);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedPatientForTeam, setSelectedPatientForTeam] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCaregiver = userRole === "caregiver" || userRole === "pro" || userRole === "brainlover";

  // ── Team fetch ──────────────────────────────────────────────
  const fetchTeam = useCallback(async (userId: string) => {
    if (!userId) {
      setTeam(null);
      return;
    }
    try {
      const { data: teamMemberData } = await safeSupabaseQuery<any>(() =>
        (supabase.from("team_members") as any)
          .select("team_id")
          .eq("user_id", userId)
          .maybeSingle()
      );

      if (teamMemberData && (teamMemberData as any).team_id) {
        const teamId = (teamMemberData as any).team_id;
        const { data: teamData } = await safeSupabaseQuery<any>(() =>
          (supabase.from("teams") as any)
            .select("*")
            .eq("id", teamId)
            .maybeSingle()
        );

        if (teamData) {
          setTeam(teamData);
          localStorage.setItem(`dev_team_${userId}`, JSON.stringify(teamData));
          return;
        }
      }

      const userTeamCache = localStorage.getItem(`user_team_${userId}`);
      if (userTeamCache) {
        try {
          const parsed = JSON.parse(userTeamCache);
          const { data: teamData } = await supabase.from("teams").select("*").eq("id", parsed.team_id).maybeSingle();
          if (teamData) {
            setTeam(teamData);
            return;
          }
        } catch (e) {}
      }

      const cachedTeam = localStorage.getItem(`dev_team_${userId}`);
      if (cachedTeam) {
        try {
          setTeam(JSON.parse(cachedTeam));
          return;
        } catch (e) {}
      }

      setTeam(null);
    } catch (err) {
      console.warn("Error fetching team:", err);
      const cachedTeam = localStorage.getItem(`dev_team_${userId}`);
      if (cachedTeam) {
        try { setTeam(JSON.parse(cachedTeam)); return; } catch (e) {}
      }
      setTeam(null);
    }
  }, []);

  // ── Full profile fetch ─────────────────────────────────────
  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);

      // ── Dev-bypass: skip Supabase, load from localStorage ──
      // ── Dev-bypass: skip Supabase, load from localStorage ──
      // The mock client handles data queries, but for the profile page
      // we still need to set up the dev admin profile + caregivers from
      // localStorage since the mock tables may not have all the data.
      if (isDevBypassUser(user.id)) {
        const fetchedSymptoms = getWellnessParams(user.id);
        setProfile({
          ...DEFAULT_PROFILE,
          display_name: "Dev Admin",
          avatar_url: "",
          symptoms: fetchedSymptoms,
        });
        setTeam(null);

        const cachedLinks = localStorage.getItem(`dev_caregiver_links_${user.id}`);
        if (cachedLinks) {
          try {
            const parsed = JSON.parse(cachedLinks);
            const devCaregivers = parsed.map((l: any) => {
              const pid = l.patient_id;
              const profileRaw = localStorage.getItem(`dev_patient_profile_${pid}`);
              let display_name = "FreeBrainer";
              let deletion_scheduled_at: string | null = null;
              let share_consent = false;
              if (profileRaw) {
                try {
                  const parsedProfile = JSON.parse(profileRaw);
                  display_name = parsedProfile.display_name || display_name;
                  deletion_scheduled_at = parsedProfile.deletion_scheduled_at || null;
                  share_consent = parsedProfile.share_consent || false;
                } catch (e) {}
              }
              return {
                patient_id: pid,
                profiles: { display_name, deletion_scheduled_at, share_consent },
              };
            });
            setCaregivers(devCaregivers);
          } catch (e) { setCaregivers([]); }
        } else {
          setCaregivers([]);
        }
        setIsLoading(false);
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      // ── Tier 1: Read wellness params from localStorage (HIPAA) ──
      const fetchedSymptoms = getWellnessParams(user.id);

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

        const dbLocale = p.locale;
        if (dbLocale && !sessionStorage.getItem("lang_user_set")) {
          const cachedLang = (localStorage.getItem("i18nextLng") || "en").split("-")[0];
          if (dbLocale !== cachedLang) {
            i18n.changeLanguage(dbLocale);
          }
        }
      }

      if (isCaregiver) {
        let patientLinks: any[] = [];

        // ── Fetch managed freebrainers FIRST for name resolution ──
        let managedMap: Record<string, { display_name?: string; deletion_scheduled_at?: string | null }> = {};
        const { data: managedFbs } = await supabase
          .from("managed_freebrainers")
          .select("id, display_name, deletion_scheduled_at")
          .eq("managed_by", user.id);
        if (managedFbs && managedFbs.length > 0) {
          managedFbs.forEach((m: any) => {
            managedMap[m.id] = {
              display_name: m.display_name,
              deletion_scheduled_at: m.deletion_scheduled_at || null,
            };
          });
        }

        const { data: rawLinks } = await supabase
          .from("caregiver_links")
          .select("patient_id")
          .eq("caregiver_id", user.id);

        if (rawLinks && rawLinks.length > 0) {
          const patientIds = rawLinks.map((l: any) => l.patient_id);
          const { data: patientProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, deletion_scheduled_at")
            .in("user_id", patientIds);

          patientLinks = rawLinks.map((link: any) => {
            const prof = patientProfiles?.find((p: any) => p.user_id === link.patient_id);
            const managed = managedMap[link.patient_id];
            // Use profiles row first, fall back to managed_freebrainers row
            return {
              patient_id: link.patient_id,
              profiles: prof || {
                display_name: managed?.display_name || "FreeBrainer",
                deletion_scheduled_at: managed?.deletion_scheduled_at || null,
              },
            };
          });
        }

        // Add any managed freebrainers not already in caregiver_links
        Object.entries(managedMap).forEach(([id, m]) => {
          if (!patientLinks.some((p: any) => p.patient_id === id)) {
            patientLinks.push({
              patient_id: id,
              profiles: { display_name: m.display_name || "FreeBrainer", deletion_scheduled_at: m.deletion_scheduled_at || null },
            });
          }
        });

        if (patientLinks.length === 0) {
          const cachedLinks = localStorage.getItem(`dev_caregiver_links_${user.id}`);
          if (cachedLinks) {
            try { patientLinks = JSON.parse(cachedLinks); } catch (e) {}
          }
        } else {
          localStorage.setItem(`dev_caregiver_links_${user.id}`, JSON.stringify(patientLinks));
        }

        if (patientLinks && patientLinks.length > 0) {
          setCaregivers(patientLinks);
          const firstPatientId = (patientLinks[0] as any).patient_id;
          setSelectedPatientForTeam(firstPatientId);
          await fetchTeam(firstPatientId);
        } else {
          setCaregivers([]);
          await fetchTeam(user.id);
        }
      } else {
        let caregiverLinks: any[] = [];
        const { data: rawLinks } = await supabase
          .from("caregiver_links")
          .select("caregiver_id")
          .eq("patient_id", user.id);

        if (rawLinks && rawLinks.length > 0) {
          const caregiverIds = rawLinks.map((l: any) => l.caregiver_id);
          const { data: caregiverProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", caregiverIds);

          caregiverLinks = rawLinks.map((link: any) => {
            const prof = caregiverProfiles?.find((p: any) => p.user_id === link.caregiver_id);
            return {
              caregiver_id: link.caregiver_id,
              profiles: prof || { display_name: "BrainLover Caregiver" },
            };
          });
        }

        if (caregiverLinks.length === 0) {
          const cachedLinks = localStorage.getItem(`dev_patient_links_${user.id}`);
          if (cachedLinks) {
            try { caregiverLinks = JSON.parse(cachedLinks); } catch (e) {}
          }
        } else {
          localStorage.setItem(`dev_patient_links_${user.id}`, JSON.stringify(caregiverLinks));
        }

        if (caregiverLinks) {
          setCaregivers(caregiverLinks);
        }
        await fetchTeam(user.id);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isCaregiver, fetchTeam, i18n]);

  // ── Save profile ────────────────────────────────────────────
  const saveProfile = useCallback(async () => {
    if (!user) return;
    try {
      setIsSaving(true);

      // ── Dev-bypass: save to localStorage only ──
      if (isDevBypassUser(user.id)) {
        setWellnessParams(user.id, profile.symptoms);
        toast({
          title: t("profile.savedTitle", "Profile updated"),
          description: t("profile.savedDesc", "Your profile has been successfully saved."),
        });
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
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

      // ── Tier 1: Save wellness params to localStorage (HIPAA) ──
      setWellnessParams(user.id, profile.symptoms);

      toast({
        title: t("profile.savedTitle", "Profile updated"),
        description: t("profile.savedDesc", "Your profile has been successfully saved."),
      });
    } catch (error: any) {
      toast({
        title: t("profile.errorTitle", "Error saving profile"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, profile, toast, t]);

  // ── Photo upload ────────────────────────────────────────────
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
          setProfile((prev) => ({ ...prev, avatar_url: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({ title: t("profile.uploadFailed", "Upload failed"), description: error.message, variant: "destructive" });
    }
  }, [toast, t]);

  // ── Leave team ──────────────────────────────────────────────
  const handleLeaveTeam = useCallback(async () => {
    if (!team || !user) return;
    const targetUserId = isCaregiver ? selectedPatientForTeam : user.id;
    if (!targetUserId) return;
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("user_id", targetUserId)
        .eq("team_id", team.id);

      if (error) throw error;

      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id);

      if (count === 0) {
        await supabase.from("teams").delete().eq("id", team.id);
      }

      localStorage.removeItem(`dev_team_${targetUserId}`);
      setTeam(null);
      toast({
        title: t("profile.teamLeftTitle", "Team left"),
        description: t("profile.teamLeftDesc", "You have left the team. Empty teams automatically dissolve."),
      });
    } catch (error: any) {
      toast({ title: t("profile.errorLeavingTeam", "Error leaving team"), description: error.message, variant: "destructive" });
    }
  }, [team, user, isCaregiver, selectedPatientForTeam, toast, t]);

  // ── Remove link ─────────────────────────────────────────────
  const handleRemoveLink = useCallback(async (idToRemove: string, isLastPatient: boolean) => {
    if (!user) return;
    try {
      if (isCaregiver) {
        await supabase
          .from("caregiver_links")
          .delete()
          .eq("caregiver_id", user.id)
          .eq("patient_id", idToRemove);

        const updated = caregivers.filter((c: any) => c.patient_id !== idToRemove);
        setCaregivers(updated);
        localStorage.setItem(`dev_caregiver_links_${user.id}`, JSON.stringify(updated));

        if (updated.length > 0) {
          const nextId = updated[0].patient_id;
          setSelectedPatientForTeam(nextId);
          fetchTeam(nextId);
        } else {
          setSelectedPatientForTeam(null);
          setTeam(null);
        }

        if (isLastPatient) {
          const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          await (supabase.from("profiles") as any)
            .update({ deletion_scheduled_at: scheduledAt })
            .eq("user_id", user.id);

          setProfile((prev) => ({ ...prev, deletion_scheduled_at: scheduledAt }));
          localStorage.setItem(`dev_deletion_scheduled_${user.id}`, scheduledAt);

          toast({
            title: t("profile.freeBrainerRemoved48hr", "FreeBrainer Removed & 48hr Warning Triggered"),
            description: t("profile.freeBrainerRemoved48hrDesc", "You have 48 hours to link another FreeBrainer before your account is scheduled for deletion."),
            variant: "destructive",
          });
        } else {
          toast({
            title: t("profile.freeBrainerRemoved", "FreeBrainer Removed"),
            description: t("profile.freeBrainerRemovedDesc", "The FreeBrainer has been unlinked from your profile."),
          });
        }
      } else {
        await supabase
          .from("caregiver_links")
          .delete()
          .eq("patient_id", user.id)
          .eq("caregiver_id", idToRemove);

        const updated = caregivers.filter((c: any) => c.caregiver_id !== idToRemove);
        setCaregivers(updated);
        localStorage.setItem(`dev_patient_links_${user.id}`, JSON.stringify(updated));

        toast({
          title: t("profile.brainLoverRemoved", "BrainLover Removed"),
          description: t("profile.brainLoverRemovedDesc", "BrainLover link has been removed. You can invite another BrainLover at any time."),
        });
      }
    } catch (err: any) {
      toast({
        title: t("profile.failedRemoveLink", "Failed to remove link"),
        description: err.message,
        variant: "destructive",
      });
    }
  }, [user, isCaregiver, caregivers, fetchTeam, toast, t]);

  // ── Initial load + team event listener ─────────────────────
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }

    const handleTeamUpdate = (e: any) => {
      if (e.detail) setTeam(e.detail);
    };
    window.addEventListener("team_updated", handleTeamUpdate);
    return () => window.removeEventListener("team_updated", handleTeamUpdate);
  }, [user, isTestingMode, userRole, fetchProfileData]);

  return {
    // state
    isLoading,
    isSaving,
    profile,
    setProfile,
    team,
    setTeam,
    caregivers,
    setCaregivers,
    selectedPatientForTeam,
    setSelectedPatientForTeam,
    fileInputRef,
    isCaregiver,
    // actions
    fetchProfileData,
    fetchTeam,
    saveProfile,
    handlePhotoUpload,
    handleLeaveTeam,
    handleRemoveLink,
  };
}
