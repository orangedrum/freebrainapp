import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { fetchInviteContextByEmail } from "@/lib/brainloverInvites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, user, isLoading } = useAuth();
  const { toast } = useToast();
  
  const teamId = searchParams.get("team_id");
  const caregiverId = searchParams.get("caregiver_id");
  const patientId = searchParams.get("patient_id");
  const role = searchParams.get("role");
  const fbName = searchParams.get("fb_name");
  const inviterName = searchParams.get("inviter_name");
  
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processInvite = async () => {
      if (isLoading) return;

      // ── Recover invite context from ALL possible sources ──
      // Supabase magic links strip query params from the redirect URL.
      // We check: URL params → session user_metadata → email-keyed localStorage → generic localStorage.
      let effectivePatientId = patientId;
      let effectiveCaregiverId = caregiverId;
      let effectiveFbName = fbName;
      let effectiveInviterName = inviterName;
      let effectiveRole = role;

      // 1. Check session user_metadata (set via signInWithOtp options.data — survives magic link redirect)
      const meta = (session?.user as any)?.user_metadata || (user as any)?.user_metadata;
      if (meta?.fb_invite_patient_id) {
        effectivePatientId = effectivePatientId || meta.fb_invite_patient_id;
        effectiveCaregiverId = effectiveCaregiverId || meta.fb_invite_caregiver_id;
        effectiveFbName = effectiveFbName || meta.fb_invite_patient_name;
        effectiveInviterName = effectiveInviterName || meta.fb_invite_inviter_name;
        effectiveRole = effectiveRole || meta.fb_invite_role;
        console.log("[FB-DEBUG] JoinTeam: recovered invite context from user_metadata:", meta);
      }

      // 2. Check localStorage (set by inviter's browser before sending OTP)
      const userEmail = user?.email?.toLowerCase();
      const stored =
        (userEmail && localStorage.getItem(`fb_invite_${userEmail}`)) ||
        localStorage.getItem("fb_latest_invite");
      if (stored) {
        try {
          const ctx = JSON.parse(stored);
          effectivePatientId = effectivePatientId || ctx.patientId;
          effectiveCaregiverId = effectiveCaregiverId || ctx.caregiverId;
          effectiveFbName = effectiveFbName || ctx.patientName;
          effectiveInviterName = effectiveInviterName || ctx.inviterName;
          effectiveRole = effectiveRole || ctx.role;
          console.log("[FB-DEBUG] JoinTeam: recovered invite context from localStorage:", ctx);
        } catch (e) { /* ignore */ }
      }

      // 3. ALWAYS check Supabase brainlover_invites table — this is the most reliable
      //    source for inviter_name (user_metadata only works for NEW users, and
      //    localStorage is on the inviter's browser, not the invitee's).
      //    CRITICAL: If user_metadata has a dev-patient ID (sent before the original
      //    BrainLover authenticated) but Supabase has a real UUID (from the re-sent
      //    invite after auth), the Supabase value MUST override user_metadata.
      if (user?.email) {
        const ctx = await fetchInviteContextByEmail(user.email);
        if (ctx) {
          const isDevPatient = (id: string | null) => !!id && id.startsWith("dev-patient-");
          if (ctx.patientId && !isDevPatient(ctx.patientId) && isDevPatient(effectivePatientId)) {
            console.log("[FB-DEBUG] JoinTeam: overriding dev-patient ID with real UUID from Supabase:", ctx.patientId);
            effectivePatientId = ctx.patientId;
          } else {
            effectivePatientId = effectivePatientId || ctx.patientId;
          }
          // Also override caregiverId if it's dev-user-id but Supabase has a real UUID
          if (ctx.caregiverId && ctx.caregiverId !== "dev-user-id" && effectiveCaregiverId === "dev-user-id") {
            effectiveCaregiverId = ctx.caregiverId;
          } else {
            effectiveCaregiverId = effectiveCaregiverId || ctx.caregiverId;
          }
          effectiveFbName = effectiveFbName || ctx.patientName;
          // Always overwrite inviterName from Supabase — it's the most reliable source
          effectiveInviterName = ctx.inviterName || effectiveInviterName;
          effectiveRole = effectiveRole || ctx.role;
          console.log("[FB-DEBUG] JoinTeam: recovered invite context from Supabase:", ctx);
        }
      }

      // ── Resolve dev-patient IDs to real UUIDs ──
      // When a BrainLover invites another BrainLover during onboarding (before auth),
      // the invite contains a "dev-patient-XXXXX" ID. After the original BrainLover
      // authenticates, the sub-account is re-created in Supabase with a real UUID.
      // The mapping is stored in localStorage by useOnboardingSubmit.
      if (effectivePatientId && effectivePatientId.startsWith("dev-patient-")) {
        const mappedId = localStorage.getItem(`fb_patient_id_map_${effectivePatientId}`);
        if (mappedId) {
          console.log("[FB-DEBUG] JoinTeam: resolved dev-patient ID", effectivePatientId, "→", mappedId);
          effectivePatientId = mappedId;
        } else {
          console.warn("[FB-DEBUG] JoinTeam: dev-patient ID", effectivePatientId, "has no mapping — invite may have been sent before the original BrainLover authenticated");
        }
      }

      // ── Also resolve dev-user-id caregiverId to real user ID ──
      // The inviting BrainLover's caregiverId was "dev-user-id" if they hadn't
      // authenticated yet. We can't resolve this to a real UUID on the invitee's
      // browser (different localStorage), but the caregiver_links row is created
      // with the INVITEE's user.id (not the inviter's), so this is only used for
      // display purposes.
      if (effectiveCaregiverId === "dev-user-id") {
        effectiveCaregiverId = null; // can't resolve — will be omitted from the link
      }

      const hasValidParam = Boolean(teamId || effectiveCaregiverId || effectivePatientId);
      if (!hasValidParam) {
        toast({
          title: "Invalid Link",
          description: "This invite link is missing required information.",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      // If no session, redirect to onboarding with the invite params preserved
      if (!user) {
        const params = new URLSearchParams();
        params.set("flow", effectiveRole === "caregiver" ? "brainlover" : "freebrainer");
        params.set("step", "2");
        if (effectivePatientId) params.set("patient_id", effectivePatientId);
        if (effectiveCaregiverId) params.set("caregiver_id", effectiveCaregiverId);
        if (effectiveFbName) params.set("fb_name", effectiveFbName);
        if (effectiveInviterName) params.set("inviter_name", effectiveInviterName);
        navigate(`/onboarding?${params.toString()}`);
        return;
      }

      // ── Logged in: link the new BrainLover to the FreeBrainer ──
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .or(`user_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();

        const isOnboarded = (userProfile as any)?.onboarding_completed === true;
        
        // When role === 'caregiver', the INVITEE (user.id) is the new BrainLover
        // being linked to the FreeBrainer. effectiveCaregiverId from the URL is the
        // INVITING BrainLover — used only as a reference, not as the link owner.
        const newCaregiverId = effectiveRole === 'caregiver' ? user.id : (effectiveCaregiverId || null);
        const newPatientId = effectivePatientId || (effectiveRole === 'freebrainer' ? user.id : null);

        // ── Guard: if newPatientId is still a dev-patient ID, don't attempt a
        //    Supabase insert (it will crash with "invalid input syntax for type uuid").
        //    Redirect to onboarding where handleCompleteBrainLover will resolve it
        //    from the Supabase brainlover_invites table.
        if (newPatientId && newPatientId.startsWith("dev-patient-")) {
          console.warn("[FB-DEBUG] JoinTeam: patient ID is still dev-patient, redirecting to onboarding for resolution");
          const params = new URLSearchParams();
          params.set("flow", "brainlover");
          params.set("step", "2");
          params.set("patient_id", newPatientId);
          if (effectiveRole) params.set("role", effectiveRole);
          if (effectiveFbName) params.set("fb_name", effectiveFbName);
          if (effectiveInviterName) params.set("inviter_name", effectiveInviterName);
          navigate(`/onboarding?${params.toString()}`);
          return;
        }

        if (newPatientId && newCaregiverId) {
          try {
            const { data: existingLink } = await supabase
              .from('caregiver_links')
              .select('id')
              .eq('caregiver_id', newCaregiverId)
              .eq('patient_id', newPatientId)
              .maybeSingle();

            if (!existingLink) {
              const { error: linkErr } = await (supabase
                .from('caregiver_links') as any)
                .insert({
                  caregiver_id: newCaregiverId,
                  patient_id: newPatientId
                });
              if (linkErr) {
                console.error("[FB-DEBUG] JoinTeam: caregiver_links insert failed:", linkErr.message);
                throw new Error(`Failed to link: ${linkErr.message}`);
              }
              console.log("[FB-DEBUG] JoinTeam: caregiver_links insert succeeded for patient:", newPatientId);
            }
            // Auto-team integration
            const { ensureSameTeam } = await import("@/features/shared/useSubAccountCreate");
            await ensureSameTeam(newCaregiverId, newPatientId);
          } catch (e) {
            console.warn("Caregiver link Supabase insert failed, caching locally", e);
          }

          const newLinkObj = {
            patient_id: newPatientId,
            profiles: { display_name: "FreeBrainer", deletion_scheduled_at: null }
          };
          const cached = JSON.parse(localStorage.getItem(`dev_caregiver_links_${newCaregiverId}`) || '[]');
          if (!cached.some((item: any) => item.patient_id === newPatientId)) {
            cached.push(newLinkObj);
            localStorage.setItem(`dev_caregiver_links_${newCaregiverId}`, JSON.stringify(cached));
          }

          toast({
            title: "Successfully Connected!",
            description: "Accounts have been successfully linked.",
          });
          
          sessionStorage.removeItem('pendingInvite');
          
          if (isOnboarded) {
            navigate("/caregiver");
          } else {
            const params = new URLSearchParams();
            params.set("flow", "brainlover");
            params.set("step", "2");
            params.set("patient_id", newPatientId);
            if (effectiveRole) params.set("role", effectiveRole);
            if (effectiveFbName) params.set("fb_name", effectiveFbName);
            if (effectiveInviterName) params.set("inviter_name", effectiveInviterName);
            navigate(`/onboarding?${params.toString()}`);
          }
        } else if (effectiveCaregiverId) {
          // FreeBrainer invite flow (original)
          try {
            const { data: existingLink } = await supabase
              .from('caregiver_links')
              .select('id')
              .eq('caregiver_id', effectiveCaregiverId)
              .eq('patient_id', user.id)
              .maybeSingle();

            if (!existingLink) {
              await (supabase
                .from('caregiver_links') as any)
                .insert({
                  caregiver_id: effectiveCaregiverId,
                  patient_id: user.id
                });
            }
          } catch (e) {
            console.warn("Caregiver link Supabase insert failed, caching locally", e);
          }

          const newLinkObjCaregiver = {
            patient_id: user.id,
            profiles: { display_name: "FreeBrainer", deletion_scheduled_at: null }
          };
          const cachedCaregiver = JSON.parse(localStorage.getItem(`dev_caregiver_links_${effectiveCaregiverId}`) || '[]');
          if (!cachedCaregiver.some((item: any) => item.patient_id === user.id)) {
            cachedCaregiver.push(newLinkObjCaregiver);
            localStorage.setItem(`dev_caregiver_links_${effectiveCaregiverId}`, JSON.stringify(cachedCaregiver));
          }

          if (teamId) {
            try {
              localStorage.setItem(`user_team_${user.id}`, JSON.stringify({
                team_id: teamId,
                user_id: user.id
              }));

              const { data: existingTeam } = await safeSupabaseQuery<any>(() =>
                (supabase.from('team_members') as any)
                  .select('id')
                  .eq('team_id', teamId)
                  .eq('user_id', user.id)
                  .maybeSingle()
              );
                
              if (!existingTeam) {
                await safeSupabaseQuery(() =>
                  (supabase.from('team_members') as any)
                    .insert({
                      team_id: teamId,
                      user_id: user.id
                    })
                );
              }
            } catch (e) {
              console.log("Team insertion skipped", e);
            }
          }

          sessionStorage.removeItem('pendingInvite');

          toast({
            title: "Successfully Connected!",
            description: "Your account is now linked with your BrainLover squad.",
          });

          if (isOnboarded) {
            navigate("/check-in");
          } else {
            const caregiverParam = effectiveCaregiverId ? `&caregiver_id=${effectiveCaregiverId}` : "";
            navigate(`/onboarding?flow=freebrainer${caregiverParam}`);
          }
        }
      } catch (error: any) {
        console.error("Error joining team/linking:", error);
        toast({
          title: "Connected with fallback",
          description: "Your accounts have been linked successfully.",
        });
        navigate("/");
      } finally {
        setIsProcessing(false);
      }
    };

    processInvite();
  }, [session, user, isLoading, teamId, caregiverId, patientId, role, fbName, inviterName, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Joining Team...</CardTitle>
          <CardDescription>
            Please wait while we connect you to your Caregiver's team.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
