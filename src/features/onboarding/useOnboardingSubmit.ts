/**
 * useOnboardingSubmit
 * ──────────────────
 * Extracts ALL Supabase write logic from Onboarding.tsx:
 *   - handleComplete (FreeBrainer flow: roles, profiles, wellness params,
 *     medical profile, caregiver links, team membership, check-in, community posts)
 *   - handleCompleteBrainLover (BrainLover flow: roles, profiles, team, links, invites)
 *
 * Two-Tier Data Protocol:
 *   Tier 1 (sensitive): wellness params → localStorage via symptomStorage
 *   Tier 2 (social): profiles, roles, check-ins, posts → Supabase
 *   Tier 3 (derived): none computed here
 *
 * The hook receives the current onboarding state as a plain object so the
 * orchestrator stays declarative — no prop drilling of 20+ setters.
 */

import { useState, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/avatar";
import { setWellnessParams } from "@/lib/symptomStorage";
import { OPEN_TEAMS } from "@/components/onboarding/constants";
import type { useToast } from "@/hooks/use-toast";

export interface OnboardingState {
  // FreeBrainer
  conditions: string[];
  mobility: number[];
  symptoms: string[];
  movementDays: number[];
  brainLoverEmail: string;
  diagnosisStory: string;
  shareConsent: boolean;
  location: string;
  photo: string | null;
  displayName: string;
  selectedTeam: string;
  teamCode: string;
  inviteCaregiverId: string | null;
  // BrainLover
  caregiverType: "personal" | "professional" | null;
  facility: string;
  patientEmail: string;
  connectionMethod: "invite" | "code" | null;
  patientId: string | null;
  managementMode: "manage" | "independent" | null;
  subAccountPatientId: string | null;
  // ── Sub-account form data (for re-creating in Supabase after auth) ──
  subAccountName?: string | null;
  subAccountConditions?: string | null;
  subAccountLocation?: string | null;
  subAccountDiagnosisStory?: string | null;
  subAccountPhoto?: string | null;
}

interface UseOnboardingSubmitArgs {
  state: OnboardingState;
  session: any;
  refreshRole: () => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
  t: any;
}

export function useOnboardingSubmit({
  state,
  session,
  refreshRole,
  toast,
  t,
}: UseOnboardingSubmitArgs) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = useCallback(
    async (overrideData?: any): Promise<boolean> => {
      setIsProcessing(true);
      const errorLog: string[] = [];

      const s = overrideData
        ? { ...state, ...overrideData }
        : state;

      try {
        // ── Save pending onboarding if no session yet OR if called from the
        //    auth step (no overrideData). The actual Supabase writes happen
        //    ONLY when the resume effect fires after the user clicks their
        //    magic link and returns with a verified session.
        //    This prevents a stale session from bypassing email verification.
        if (!session?.user || !overrideData) {
          localStorage.setItem(
            "pendingOnboarding",
            JSON.stringify({ flowType: "freebrainer", ...s, inviteCaregiverId: state.inviteCaregiverId })
          );
          return false;
        }

        if (!session?.user) throw new Error("No user found");

        if (session.user.id === "dev-user-id") {
          localStorage.removeItem("dev_bypass_auth");
          localStorage.setItem("dev_role_override", "admin");
          window.location.href = "/overview";
          return true;
        }

        // ── Role upsert ──
        const { data: roleExists, error: roleError1 } = await (supabase.from("user_roles") as any)
          .select("id").eq("user_id", session.user.id).maybeSingle();
        if (roleError1) errorLog.push(`Role Check Error: ${roleError1.message}`);

        if (roleExists) {
          const { error: roleError2 } = await (supabase.from("user_roles") as any)
            .update({ role: "freebrainer" }).eq("user_id", session.user.id);
          if (roleError2) errorLog.push(`Role Update Error: ${roleError2.message}`);
        } else {
          const { error: roleError3 } = await (supabase.from("user_roles") as any)
            .insert({ user_id: session.user.id, role: "freebrainer" });
          if (roleError3) errorLog.push(`Role Insert Error: ${roleError3.message}`);
        }

        // ── Profile upsert ──
        const { data: profileExists, error: profileError1 } = await (supabase.from("profiles") as any)
          .select("id").eq("user_id", session.user.id).maybeSingle();
        if (profileError1) errorLog.push(`Profile Check Error: ${profileError1.message}`);

        const profileData = {
          display_name: s.displayName || session.user.email?.split("@")[0] || "FreeBrainer",
          onboarding_completed: true,
          avatar_url: s.photo,
          location: s.location,
          diagnosis_story: s.diagnosisStory,
          share_consent: s.shareConsent,
        };

        if (profileExists) {
          const { error: profileError2 } = await (supabase.from("profiles") as any)
            .update(profileData).eq("user_id", session.user.id);
          if (profileError2) errorLog.push(`Profile Update Error: ${profileError2.message}`);
        } else {
          const { error: profileError3 } = await (supabase.from("profiles") as any)
            .insert({ user_id: session.user.id, ...profileData });
          if (profileError3) errorLog.push(`Profile Insert Error: ${profileError3.message}`);
        }

        // ── FK violation → force re-auth ──
        if (errorLog.some((err) => err.includes("foreign key constraint") || err.includes("violates"))) {
          await supabase.auth.signOut();
          localStorage.removeItem("dev_bypass_auth");
          toast({ title: t("onboarding.accountResetTitle"), description: t("onboarding.accountResetDesc"), variant: "destructive" });
          window.location.href = "/auth";
          return;
        }
        if (errorLog.length > 0) throw new Error(errorLog.join("\n\n"));

        // ── Tier 1 (HIPAA): wellness params → localStorage ONLY ──
        try {
          setWellnessParams(session.user.id, s.symptoms);
        } catch (e) {
          console.error("Error saving wellness params to localStorage:", e);
        }

        // ── Tier 2: non-sensitive medical context → Supabase ──
        try {
          const medData = {
            primary_condition: s.conditions.join(", "),
            baseline_mobility: s.mobility[0],
            baseline_movement_days: s.movementDays[0],
            brain_lover_invited: s.brainLoverEmail,
            share_consent: s.shareConsent,
            location: s.location,
          };
          const { data: medExists } = await (supabase.from("medical_profiles") as any)
            .select("id").eq("user_id", session.user.id).maybeSingle();
          if (medExists) {
            await (supabase.from("medical_profiles") as any)
              .update({ condition_details: JSON.stringify(medData) }).eq("user_id", session.user.id);
          } else {
            await (supabase.from("medical_profiles") as any)
              .insert({ user_id: session.user.id, condition_details: JSON.stringify(medData) });
          }
        } catch (e) {
          console.error("Non-critical error (Medical Profile):", e);
        }

        // ── Caregiver link (if invited by BrainLover) ──
        const pendingInviteCaregiverId = overrideData?.inviteCaregiverId || state.inviteCaregiverId;
        if (pendingInviteCaregiverId && session.user.id !== "dev-user-id") {
          try {
            const { data: linkExists } = await (supabase.from("caregiver_links") as any)
              .select("id").eq("caregiver_id", pendingInviteCaregiverId).eq("patient_id", session.user.id).maybeSingle();
            if (!linkExists) {
              await (supabase.from("caregiver_links") as any).insert({
                caregiver_id: pendingInviteCaregiverId,
                patient_id: session.user.id,
                status: "active",
              });
            }
          } catch (e) {
            console.error("Non-critical error (Caregiver Link from invite):", e);
          }
        }

        // ── Team membership ──
        try {
          let targetTeamId: string | null = s.selectedTeam || null;

          if (!targetTeamId && s.teamCode) {
            const cleanCode = s.teamCode.trim().toUpperCase();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);
            let query = supabase.from("teams").select("id");
            if (isUuid) {
              query = query.or(`code.ilike.${cleanCode},id.eq.${cleanCode}`);
            } else {
              query = query.ilike("code", cleanCode);
            }
            const { data: codeTeam } = await query.maybeSingle();
            if (codeTeam) targetTeamId = (codeTeam as any).id;
          }

          if (targetTeamId && targetTeamId.startsWith("00000000-")) {
            const staticTeam = OPEN_TEAMS.find((tm) => tm.id === targetTeamId);
            if (staticTeam) {
              const { data: createdTeam } = await (supabase.from("teams") as any)
                .insert({
                  name: staticTeam.name,
                  code: staticTeam.id.slice(-6).toUpperCase(),
                  conditions: staticTeam.conditions,
                  created_by: session.user.id,
                })
                .select("id")
                .maybeSingle();
              if (createdTeam?.id) targetTeamId = createdTeam.id;
            }
          }

          if (targetTeamId) {
            await safeSupabaseQuery(() =>
              (supabase.from("team_members") as any).delete().eq("user_id", session.user.id)
            );
            const { error: tmErr } = await safeSupabaseQuery(() =>
              (supabase.from("team_members") as any).insert({
                user_id: session.user.id,
                team_id: targetTeamId,
              })
            );
            if (tmErr) console.warn("Onboarding team insert notice:", tmErr.message);
          }
        } catch (e) {
          console.error("Non-critical error (Team Membership):", e);
        }

        // ── First check-in ──
        try {
          const today = new Date().toISOString().split("T")[0];
          const { data: checkinExists } = await (supabase.from("daily_checkins") as any)
            .select("id").eq("user_id", session.user.id).eq("checkin_date", today).maybeSingle();
          if (!checkinExists) {
            const { error: cErr } = await (supabase.from("daily_checkins") as any).insert({
              user_id: session.user.id,
              checkin_date: today,
              checkin_status: "moved",
              points_earned: 10,
            });
            if (cErr) console.error("Daily Checkin Error:", cErr);
          }
        } catch (e) {
          console.error("Non-critical error (Daily Checkin):", e);
        }

        // ── Community posts (if consented) ──
        if (s.shareConsent) {
          try {
            if (s.diagnosisStory) {
              const { error: pErr1 } = await (supabase.from("community_posts") as any).insert({
                user_id: session.user.id,
                posted_by_id: session.user.id,
                content: s.diagnosisStory,
              });
              if (pErr1) console.error("Community Post Error (Story):", pErr1);
            }
            const { error: pErr2 } = await (supabase.from("community_posts") as any).insert({
              user_id: session.user.id,
              posted_by_id: session.user.id,
              content: t("onboarding.firstMovementPost"),
            });
            if (pErr2) console.error("Community Post Error (Checkin):", pErr2);
          } catch (e) {
            console.error("Non-critical error (Community Post):", e);
          }
        }

        // ── BrainLover invite email ──
        if (s.brainLoverEmail) {
          try {
            await supabase.auth.signInWithOtp({
              email: s.brainLoverEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/join?patient_id=${session.user.id}&role=caregiver`,
                shouldCreateUser: true,
              },
            });
          } catch (e) {
            console.error("Non-critical error (BrainLover Invite):", e);
          }
        }

        localStorage.removeItem("pendingOnboarding");
        toast({ title: t("onboarding.welcomeToastTitle"), description: t("onboarding.welcomeToastDesc") });
        await refreshRole();
        // Don't redirect yet — the caller (Onboarding.tsx) will move to step 15 (install app)
        // The redirect happens when the user clicks "Continue" on the install step.
        return true;
      } catch (err: any) {
        console.error("Onboarding save error:", err.message);
        toast({ title: t("onboarding.saveErrorTitle"), description: err.message, variant: "destructive" });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [state, session, refreshRole, toast, t]
  );

  const handleCompleteBrainLover = useCallback(
    async (overrideData?: any): Promise<boolean> => {
      setIsProcessing(true);
      const errorLog: string[] = [];

      const s = overrideData ? { ...state, ...overrideData } : state;

      console.log("[FB-DEBUG] handleCompleteBrainLover START:", {
        hasSession: !!session?.user,
        userId: session?.user?.id,
        subAccountName: s.subAccountName,
        subAccountPatientId: s.subAccountPatientId,
        managementMode: s.managementMode,
        isOverride: !!overrideData,
      });

      try {
        // ── Save pending onboarding if no session yet OR if called from the
        //    auth step (no overrideData). The actual Supabase writes happen
        //    ONLY when the resume effect fires after the user clicks their
        //    magic link and returns with a verified session.
        //    This prevents a stale session from bypassing email verification.
        if (!session?.user || !overrideData) {
          console.log("[FB-DEBUG] Saving pendingOnboarding (no session or auth-step call)");
          localStorage.setItem(
            "pendingOnboarding",
            JSON.stringify({
              flowType: "brainlover",
              caregiverType: s.caregiverType,
              facility: s.facility,
              patientId: s.subAccountPatientId || s.patientId || null,
              patientEmail: s.patientEmail || null,
              connectionMethod: s.connectionMethod || null,
              managementMode: s.managementMode || null,
              subAccountPatientId: s.subAccountPatientId || null,
              subAccountName: s.subAccountName || null,
              subAccountConditions: s.subAccountConditions || null,
              subAccountLocation: s.subAccountLocation || null,
              subAccountDiagnosisStory: s.subAccountDiagnosisStory || null,
              subAccountPhoto: s.subAccountPhoto || null,
              displayName: s.displayName || null,
              photo: s.photo || null,
              location: s.location || null,
            })
          );
          return true; // saved successfully, will resume after auth
        }

        if (!session?.user) throw new Error("No user found");

        // ── Dev-bypass: set role but DON'T redirect — let the auth screen show ──
        // The StepMagicLinkAuth component will show a "Continue to Dashboard" button
        // for dev-bypass users so they can proceed without email verification.
        if (session.user.id === "dev-user-id") {
          localStorage.setItem("dev_role_override", s.caregiverType === "professional" ? "pro" : "caregiver");
          return true;
        }

        // ── Role upsert ──
        const assignedRole = s.caregiverType === "professional" ? "pro" : "caregiver";
        const { data: roleExists, error: roleError1 } = await (supabase.from("user_roles") as any)
          .select("id").eq("user_id", session.user.id).maybeSingle();
        if (roleError1) errorLog.push(`Role Check Error: ${roleError1.message}`);

        if (roleExists) {
          const { error: roleError2 } = await (supabase.from("user_roles") as any)
            .update({ role: assignedRole }).eq("user_id", session.user.id);
          if (roleError2) errorLog.push(`Role Update Error: ${roleError2.message}`);
        } else {
          const { error: roleError3 } = await (supabase.from("user_roles") as any)
            .insert({ user_id: session.user.id, role: assignedRole });
          if (roleError3) errorLog.push(`Role Insert Error: ${roleError3.message}`);
        }

        // ── Profile upsert (now includes displayName, photo, location from step 2) ──
        // NOTE: onboarding_completed is set to FALSE here. It's flipped to TRUE
        // only AFTER the sub-account is successfully created (at the end of this
        // function). If we set it true now and the sub-account insert fails,
        // the route guard redirects past onboarding on next load, leaving the
        // BrainLover with an empty dashboard and no FreeBrainer.
        const { data: profileExists, error: profileError1 } = await (supabase.from("profiles") as any)
          .select("id").eq("user_id", session.user.id).maybeSingle();
        if (profileError1) errorLog.push(`Profile Check Error: ${profileError1.message}`);

        const profileData = {
          display_name: s.displayName || session.user.email?.split("@")[0] || t("roles.brainlover"),
          caregiver_type: s.caregiverType,
          facility_id: s.facility || null,
          onboarding_completed: false, // ← flipped to true after sub-account succeeds
          avatar_url: s.photo || null,
          location: s.location || null,
        };

        if (profileExists) {
          const { error: profileError2 } = await (supabase.from("profiles") as any)
            .update(profileData).eq("user_id", session.user.id);
          if (profileError2) errorLog.push(`Profile Update Error: ${profileError2.message}`);
        } else {
          const { error: profileError3 } = await (supabase.from("profiles") as any)
            .insert({ user_id: session.user.id, ...profileData });
          if (profileError3) errorLog.push(`Profile Insert Error: ${profileError3.message}`);
        }

        if (errorLog.length > 0) throw new Error(errorLog.join("\n\n"));

        // ── Team membership (professional + facility) ──
        if (s.caregiverType === "professional" && s.facility) {
          try {
            const { data: teamExists } = await safeSupabaseQuery<any>(() =>
              (supabase.from("team_members") as any)
                .select("id").eq("team_id", s.facility).eq("user_id", session.user.id).maybeSingle()
            );
            if (!teamExists) {
              await safeSupabaseQuery(() =>
                (supabase.from("team_members") as any).insert({
                  team_id: s.facility,
                  user_id: session.user.id,
                })
              );
            }
          } catch (e) {
            console.error("Non-critical error (Team Member):", e);
          }
        }

        // ── Re-create sub-account in Supabase if it was created in dev-bypass ──
        // When a user goes through onboarding WITHOUT a session (normal flow),
        // the sub-account was created in localStorage with a "dev-patient-*" ID.
        // Now that they have a real session, we re-create it in Supabase and
        // use the real UUID going forward.
        let targetPatientId = s.subAccountPatientId || s.patientId || (overrideData ? overrideData.patientId : null);
        let isDevPatientId = !!(targetPatientId && String(targetPatientId).startsWith("dev-patient-"));

        console.log("[FB-DEBUG] Sub-account re-create check:", {
          targetPatientId,
          isDevPatientId,
          subAccountName: s.subAccountName,
          managementMode: s.managementMode,
        });

        if (isDevPatientId && s.subAccountName) {
          // ── Original BrainLover: they created a sub-account in dev-bypass ──
          console.log("[FB-DEBUG] Inserting managed_freebrainer:", {
            managed_by: session.user.id,
            display_name: s.subAccountName.trim(),
          });
          const { data: managed, error: managedErr } = await (supabase.from("managed_freebrainers") as any)
            .insert({
              managed_by: session.user.id,
              display_name: s.subAccountName.trim(),
              avatar_url: s.subAccountPhoto || getAvatarUrl(s.subAccountName.trim()),
              conditions: (s.subAccountConditions || "").trim() || null,
              location: (s.subAccountLocation || "").trim() || null,
              diagnosis_story: (s.subAccountDiagnosisStory || "").trim() || null,
              share_consent: false,
            })
            .select("id")
            .single();

          if (managedErr || !managed) {
            const msg = managedErr?.message || "No data returned from insert";
            console.error("[FB-DEBUG] Failed to create sub-account in Supabase:", msg);
            throw new Error(`Failed to create FreeBrainer sub-account: ${msg}`);
          }

          const oldDevPatientId = targetPatientId;
          targetPatientId = (managed as any).id;
          isDevPatientId = false;
          console.log("[FB-DEBUG] Re-created sub-account in Supabase:", targetPatientId);

          // ── Migrate pending BrainLover invites from old dev-patient ID to new real UUID ──
          try {
            const oldInviteKey = `fb_bl_invites_${oldDevPatientId}`;
            const rawInvites = localStorage.getItem(oldInviteKey);
            if (rawInvites) {
              const inviteList: string[] = JSON.parse(rawInvites);
              localStorage.setItem(`fb_bl_invites_${targetPatientId}`, JSON.stringify(inviteList));
              localStorage.removeItem(oldInviteKey);
              console.log("[FB-DEBUG] Migrated pending invites from", oldDevPatientId, "to", targetPatientId, ":", inviteList);

              for (const email of inviteList) {
                const emailKey = `fb_invite_${email.toLowerCase()}`;
                const ctxRaw = localStorage.getItem(emailKey);
                if (ctxRaw) {
                  try {
                    const ctx = JSON.parse(ctxRaw);
                    ctx.patientId = targetPatientId;
                    ctx.caregiverId = session.user.id;
                    localStorage.setItem(emailKey, JSON.stringify(ctx));
                  } catch (e) { /* ignore */ }
                }
              }
            }
            try {
              localStorage.setItem(`fb_patient_id_map_${oldDevPatientId}`, targetPatientId);
              console.log("[FB-DEBUG] Stored patient ID mapping:", oldDevPatientId, "→", targetPatientId);
            } catch (e) { /* ignore */ }
          } catch (e) {
            console.warn("[FB-DEBUG] Invite migration error (non-fatal):", e);
          }
        } else if (isDevPatientId && !s.subAccountName) {
          // ── Invited BrainLover: they didn't create a sub-account ──
          // Their patientId is a "dev-patient-XXXXX" from the invite (sent before
          // the original BrainLover authenticated). Try to resolve it to the real
          // UUID from: (1) localStorage mapping, (2) Supabase brainlover_invites table.
          console.warn("[FB-DEBUG] isDevPatientId=true but subAccountName is empty — invited BL, resolving real patient ID");

          // 1. Check localStorage mapping (set by the original BL's browser — won't be
          //    present on the invitee's browser, but check anyway)
          const mappedId = localStorage.getItem(`fb_patient_id_map_${targetPatientId}`);
          if (mappedId) {
            console.log("[FB-DEBUG] Resolved dev-patient ID via localStorage mapping:", targetPatientId, "→", mappedId);
            targetPatientId = mappedId;
            isDevPatientId = false;
          }

          // 2. Check Supabase brainlover_invites table by the invitee's email
          if (isDevPatientId && session.user.email) {
            try {
              const { fetchInviteContextByEmail } = await import("@/lib/brainloverInvites");
              const ctx = await fetchInviteContextByEmail(session.user.email);
              if (ctx?.patientId && !ctx.patientId.startsWith("dev-patient-")) {
                console.log("[FB-DEBUG] Resolved dev-patient ID via Supabase invites table:", targetPatientId, "→", ctx.patientId);
                targetPatientId = ctx.patientId;
                isDevPatientId = false;
              }
            } catch (e) {
              console.warn("[FB-DEBUG] Failed to resolve patient ID from Supabase:", e);
            }
          }

          if (isDevPatientId) {
            console.error("[FB-DEBUG] Could not resolve dev-patient ID to real UUID — the original BrainLover may not have authenticated yet");
            // Don't throw — skip the caregiver_link insert. The link will be created
            // when the original BL authenticates and the invite is re-sent.
          }
        }

        // ── Caregiver link (use real sub-account id, or patientId from invite) ──
        // Skip if targetPatientId is still a dev-patient ID (couldn't resolve) —
        // inserting it would crash with "invalid input syntax for type uuid".
        if (targetPatientId && !isDevPatientId) {
          console.log("[FB-DEBUG] Creating caregiver_link for patient:", targetPatientId);
          const { data: linkExists } = await (supabase.from("caregiver_links") as any)
            .select("id").eq("patient_id", targetPatientId).eq("caregiver_id", session.user.id).maybeSingle();
          if (!linkExists) {
            const { error: linkErr } = await (supabase.from("caregiver_links") as any).insert({
              patient_id: targetPatientId,
              caregiver_id: session.user.id,
              status: "active",
              management_mode: s.managementMode || "manage",
            });
            if (linkErr) {
              console.error("[FB-DEBUG] caregiver_link insert error:", linkErr.message);
              throw new Error(`Failed to link FreeBrainer: ${linkErr.message}`);
            }
            console.log("[FB-DEBUG] Created caregiver_link for patient:", targetPatientId);
          } else {
            // Update management_mode if link already exists
            await (supabase.from("caregiver_links") as any)
              .update({ management_mode: s.managementMode || "manage" })
              .eq("patient_id", targetPatientId)
              .eq("caregiver_id", session.user.id);
            console.log("[FB-DEBUG] Updated existing caregiver_link management_mode");
          }

          // ── Ensure BrainLover and FreeBrainer are on the same team ──
          // Creates a new team if neither has one yet.
          try {
            const { ensureSameTeam } = await import("@/features/shared/useSubAccountCreate");
            await ensureSameTeam(session.user.id, targetPatientId);
            console.log("[FB-DEBUG] ensureSameTeam completed");
          } catch (e) {
            console.warn("[FB-DEBUG] Team sync error (non-fatal):", e);
          }
        } else {
          console.warn("[FB-DEBUG] Skipping caregiver_link and team sync — targetPatientId is null or unresolved dev-patient ID:", targetPatientId);
        }

        // ── FreeBrainer invite email ──
        if (s.patientEmail && s.patientEmail.includes("@") && s.connectionMethod === "invite") {
          try {
            const { error: inviteError } = await supabase.auth.signInWithOtp({
              email: s.patientEmail.trim(),
              options: {
                emailRedirectTo: `${window.location.origin}/join?caregiver_id=${session.user.id}&role=freebrainer`,
                shouldCreateUser: true,
              },
            });
            if (inviteError) console.warn("FreeBrainer invite email error (non-fatal):", inviteError.message);
          } catch (e) {
            console.error("Non-critical error (FreeBrainer Invite Email):", e);
          }
        }

        // ── Re-send BrainLover invites with the REAL patient UUID ──
        // During onboarding (before auth), invites were sent with patientId = "dev-patient-XXXXX".
        // The invitee's magic link contains that dev-patient ID in user_metadata, which their
        // browser can't resolve (the mapping is only in THIS browser's localStorage).
        // Now that we have the real UUID, re-send the invites so the magic links contain
        // the correct patientId. This is idempotent — Supabase OTP just sends a new link.
        if (targetPatientId && !isDevPatientId) {
          try {
            const { sendBrainLoverInvite } = await import("@/lib/brainloverInvites");
            const inviteListRaw = localStorage.getItem(`fb_bl_invites_${targetPatientId}`);
            if (inviteListRaw) {
              const inviteList: string[] = JSON.parse(inviteListRaw);
              const inviterName = s.displayName || session.user.email?.split("@")[0] || null;
              // Fetch the managed freebrainer's avatar from Supabase (it was just created
              // above with getAvatarUrl fallback, so it always has a value)
              let resolvedAvatar = s.subAccountPhoto || null;
              if (!resolvedAvatar) {
                try {
                  const { data: mfb } = await (supabase.from("managed_freebrainers") as any)
                    .select("avatar_url")
                    .eq("id", targetPatientId)
                    .maybeSingle();
                  if (mfb?.avatar_url) resolvedAvatar = mfb.avatar_url;
                } catch (e) { /* non-fatal */ }
              }
              console.log("[FB-DEBUG] Re-sending BrainLover invites with real patient UUID:", targetPatientId, "invites:", inviteList, "patientName:", s.subAccountName, "avatar:", !!resolvedAvatar);
              for (const email of inviteList) {
                await sendBrainLoverInvite(email, {
                  patientId: targetPatientId,
                  caregiverId: session.user.id,
                  patientName: s.subAccountName || null,
                  patientAvatar: resolvedAvatar,
                  inviterName,
                  role: "caregiver",
                  createdAt: Date.now(),
                });
              }
              console.log("[FB-DEBUG] Re-sent all BrainLover invites with real UUID");
            }
          } catch (e) {
            console.warn("[FB-DEBUG] Re-send invites error (non-fatal):", e);
          }
        }

        // ── Flip onboarding_completed to TRUE now that everything succeeded ──
        // This must happen AFTER all sub-account creation, caregiver links, and
        // team sync. If any of those threw, we never reach this line, so the
        // profile stays onboarding_completed=false and the route guard will
        // send the user back to onboarding to retry.
        console.log("[FB-DEBUG] handleCompleteBrainLover: flipping onboarding_completed to true");
        const { error: flipErr } = await (supabase.from("profiles") as any)
          .update({ onboarding_completed: true })
          .eq("user_id", session.user.id);
        if (flipErr) {
          console.error("[FB-DEBUG] Failed to set onboarding_completed=true:", flipErr.message);
          // Non-fatal — the user can still use the app, just might see onboarding again
        }

        // NOTE: pendingOnboarding is removed by the caller (Onboarding.tsx) only on success.
        toast({
          title: t("onboarding.welcomeToastTitle"),
          description:
            s.patientEmail && s.connectionMethod === "invite"
              ? t("onboarding.blWelcomeInviteDesc")
              : t("onboarding.blWelcomeReadyDesc"),
        });
        await refreshRole();
        window.location.href = s.caregiverType === "professional" ? "/pro" : "/caregiver";
        return true;
      } catch (error: any) {
        console.error("[FB-DEBUG] BrainLover onboarding save error:", error.message);
        toast({ title: t("onboarding.saveErrorTitle"), description: error.message, variant: "destructive" });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [state, session, refreshRole, toast, t]
  );

  return { isProcessing, handleComplete, handleCompleteBrainLover };
}
