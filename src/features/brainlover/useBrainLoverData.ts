import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { seedDevCaregiverLinks } from "@/lib/devBypass";
import { getAvatarUrl } from "@/lib/avatar";
import type { PatientLink } from "./types";

export function useBrainLoverData(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<PatientLink[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patient, setPatient] = useState<PatientLink | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [todayCheckInDetails, setTodayCheckInDetails] = useState<any>(null);
  const [hasEncouragedToday, setHasEncouragedToday] = useState<boolean>(false);
  const [hasBoostedToday, setHasBoostedToday] = useState<boolean>(false);
  const [encouragementCount, setEncouragementCount] = useState<number>(1);
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [caregiverType, setCaregiverType] = useState<string>("personal");

  const loadPatientCheckIn = useCallback(async (patientId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];

    // ── Dev-bypass: read from localStorage mock key, never hit Supabase ──
    if (patientId.startsWith("dev-patient-") || patientId === "dev-user-id") {
      const mockKey = `fb_mock_checkin_${patientId}_${todayStr}`;
      const mockChecked = localStorage.getItem(mockKey);
      if (mockChecked) {
        setHasCheckedInToday(true);
        try {
          setTodayCheckInDetails(JSON.parse(mockChecked));
        } catch (e) {
          setTodayCheckInDetails({ checkin_status: "moved" });
        }
      } else {
        setHasCheckedInToday(false);
        setTodayCheckInDetails(null);
      }
      const encState = localStorage.getItem(`fb_encouraged_${patientId}_${todayStr}`);
      if (encState) {
        setHasEncouragedToday(true);
        try {
          const parsed = JSON.parse(encState);
          setEncouragementCount(parsed.count || 1);
        } catch (e) {}
      } else {
        setHasEncouragedToday(false);
        setEncouragementCount(1);
      }
      const boostState = localStorage.getItem(`fb_boosted_${patientId}_${todayStr}`);
      setHasBoostedToday(!!boostState);
      return;
    }

    // ── Real Supabase path: match by checkin_date (local), NOT created_at (UTC) ──
    const { data: todayCheckIn } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", patientId)
      .eq("checkin_date", todayStr)
      .maybeSingle();

    if (todayCheckIn) {
      setHasCheckedInToday(true);
      setTodayCheckInDetails(todayCheckIn);
    } else {
      setHasCheckedInToday(false);
      setTodayCheckInDetails(null);
    }

    const encState = localStorage.getItem(`fb_encouraged_${patientId}_${todayStr}`);
    if (encState) {
      setHasEncouragedToday(true);
      try {
        const parsed = JSON.parse(encState);
        setEncouragementCount(parsed.count || 1);
      } catch (e) {}
    } else {
      setHasEncouragedToday(false);
      setEncouragementCount(1);
    }
    const boostState = localStorage.getItem(`fb_boosted_${patientId}_${todayStr}`);
    setHasBoostedToday(!!boostState);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    seedDevCaregiverLinks(true);

    try {
      const { data: cp } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cp) {
        setDeletionScheduledAt((cp as any).deletion_scheduled_at);
        setCaregiverType((cp as any).caregiver_type || "personal");
      }

      // ── Fetch managed freebrainers FIRST so we can resolve names for
      //    sub-accounts that don't have a row in `profiles`. ──
      let managedMap: Record<string, { display_name?: string; share_consent?: boolean; email?: string; avatar_url?: string }> = {};
      try {
        const { data: managedFbs } = await supabase
          .from("managed_freebrainers")
          .select("id, display_name, share_consent, avatar_url")
          .eq("managed_by", userId);
        if (managedFbs && managedFbs.length > 0) {
          managedFbs.forEach((m: any) => {
            managedMap[m.id] = {
              display_name: m.display_name,
              share_consent: m.share_consent,
              avatar_url: m.avatar_url,
            };
          });
        }
      } catch (e) {
        console.warn("Managed freebrainers fetch (non-fatal):", e);
      }

      const fetchedPatients: PatientLink[] = [];
      const seenIds = new Set<string>();
      const { data: links } = await supabase
        .from("caregiver_links")
        .select("*")
        .eq("caregiver_id", userId);

      let patientIds: string[] = [];
      if (links && Array.isArray(links) && links.length > 0) {
        patientIds = links.map((l: any) => l.patient_id);
      } else {
        const cachedLinks = localStorage.getItem(`dev_caregiver_links_${userId}`);
        if (cachedLinks) {
          try {
            const parsed = JSON.parse(cachedLinks);
            if (parsed.length > 0) patientIds = parsed.map((l: any) => l.patient_id);
          } catch (e) {}
        }
      }

      if (patientIds.length > 0) {
        const { data: pProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, share_consent, email, avatar_url")
          .in("user_id", patientIds);

        // Build a lookup from profiles results
        const profileMap: Record<string, any> = {};
        if (pProfiles && pProfiles.length > 0) {
          pProfiles.forEach((p: any) => { profileMap[p.user_id] = p; });
        }

        // ── For patient IDs not found in profiles, check managed_freebrainers by ID ──
        //    This covers sub-accounts managed by OTHER BrainLovers (invited BLs).
        //    RLS may block this query (only the managed_by user can read), so we
        //    also fall back to the brainlover_invites table.
        const missingIds = patientIds.filter((pid) => !profileMap[pid] && !managedMap[pid]);
        if (missingIds.length > 0) {
          try {
            const { data: managedById } = await supabase
              .from("managed_freebrainers")
              .select("id, display_name, share_consent, avatar_url")
              .in("id", missingIds);
            if (managedById && managedById.length > 0) {
              managedById.forEach((m: any) => {
                managedMap[m.id] = {
                  display_name: m.display_name,
                  share_consent: m.share_consent,
                  avatar_url: m.avatar_url,
                };
              });
            }
          } catch (e) {
            console.warn("Managed freebrainers by-ID fetch (non-fatal):", e);
          }
        }

        // ── Final fallback: check brainlover_invites table for any patient IDs ──
        //    still unresolved. The invited BL can read this table (RLS allows SELECT
        //    by invitee_email). This gives us patient_name + patient_avatar.
        const stillMissingIds = patientIds.filter((pid) => !profileMap[pid] && !managedMap[pid]);
        if (stillMissingIds.length > 0 && userId) {
          try {
            const { fetchInviteContextByEmail } = await import("@/lib/brainloverInvites");
            // Use the caregiver's email to find their invite context
            const { data: ownProfile } = await supabase.from("profiles").select("email").eq("user_id", userId).maybeSingle();
            if (ownProfile?.email) {
              const ctx = await fetchInviteContextByEmail(ownProfile.email);
              if (ctx?.patientId && stillMissingIds.includes(ctx.patientId)) {
                managedMap[ctx.patientId] = {
                  display_name: ctx.patientName || undefined,
                  share_consent: false,
                  avatar_url: ctx.patientAvatar || undefined,
                };
              }
            }
          } catch (e) {
            console.warn("Invite context fallback (non-fatal):", e);
          }
        }

        patientIds.forEach((pid) => {
          if (seenIds.has(pid)) return; // dedupe
          seenIds.add(pid);
          const prof = profileMap[pid];
          const managed = managedMap[pid];
          const resolvedName = prof?.display_name || managed?.display_name || "FreeBrainer";
          fetchedPatients.push({
            user_id: pid,
            display_name: resolvedName,
            share_consent: prof?.share_consent || managed?.share_consent || false,
            email: prof?.email || managed?.email || undefined,
            avatar_url: prof?.avatar_url || managed?.avatar_url || getAvatarUrl(resolvedName),
            isManaged: !!managed,
          });
        });
      }

      // Add any managed freebrainers not already in caregiver_links
      Object.entries(managedMap).forEach(([id, m]) => {
        if (seenIds.has(id)) return;
        seenIds.add(id);
        const resolvedName = m.display_name || "Managed FreeBrainer";
        fetchedPatients.push({
          user_id: id,
          display_name: resolvedName,
          share_consent: m.share_consent || false,
          email: m.email || undefined,
          avatar_url: m.avatar_url || getAvatarUrl(resolvedName),
          isManaged: true,
        });
      });

      setPatients(fetchedPatients);

      if (fetchedPatients.length > 0) {
        setSelectedPatientId(fetchedPatients[0].user_id);
        setPatient(fetchedPatients[0]);
        await loadPatientCheckIn(fetchedPatients[0].user_id);
      } else {
        setPatient(null);
      }
    } catch (err) {
      console.error("Error loading caregiver dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadPatientCheckIn]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ── Sync `patient` when the user manually switches FreeBrainer via the selector ──
  // Only react to selectedPatientId changes — NOT patients array changes
  // (patients changes when loadDashboardData runs, which also sets selectedPatientId
  // and patient, so reacting to both causes redundant re-renders).
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const found = patients.find((p) => p.user_id === selectedPatientId);
      if (found) {
        setPatient(found);
        loadPatientCheckIn(found.user_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  return {
    isLoading,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    patient,
    hasCheckedInToday,
    todayCheckInDetails,
    hasEncouragedToday,
    setHasEncouragedToday,
    hasBoostedToday,
    setHasBoostedToday,
    encouragementCount,
    setEncouragementCount,
    deletionScheduledAt,
    caregiverType,
    loadDashboardData,
  };
}
