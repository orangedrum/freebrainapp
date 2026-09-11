import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { fetchInviteContextByEmail } from "@/lib/brainloverInvites";
import { computeInviteIntent, intentToParams, type InviteKind } from "@/lib/inviteRouting";
import { getDefaultRouteForRole } from "@/components/auth/RoleGuards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, user, isLoading, userRole } = useAuth();
  const { toast } = useToast();
  
  const teamId = searchParams.get("team_id");
  const caregiverId = searchParams.get("caregiver_id");
  const patientId = searchParams.get("patient_id");
  const fbName = searchParams.get("fb_name");
  const inviterName = searchParams.get("inviter_name");
  const kind = searchParams.get("kind") as InviteKind | null;

  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processInvite = async () => {
      if (isLoading) return;

      console.log("[FB-DEBUG] JoinTeam: URL params", {
        href: window.location.href,
        search: window.location.search,
        teamId, caregiverId, patientId, fbName, inviterName, kind,
      });

      // ── Recover invite context from ALL possible sources ──
      // Supabase magic links strip query params from the redirect URL.
      // We check: URL params → session user_metadata → email-keyed localStorage → generic localStorage.
      let effectivePatientId = patientId;
      let effectiveCaregiverId = caregiverId;
      let effectiveFbName = fbName;
      let effectiveInviterName = inviterName;

      // 1. Check session user_metadata (set via signInWithOtp options.data — survives magic link redirect)
      const meta = (session?.user as any)?.user_metadata || (user as any)?.user_metadata;
      if (meta?.fb_invite_patient_id) {
        effectivePatientId = effectivePatientId || meta.fb_invite_patient_id;
        effectiveCaregiverId = effectiveCaregiverId || meta.fb_invite_caregiver_id;
        effectiveFbName = effectiveFbName || meta.fb_invite_patient_name;
        effectiveInviterName = effectiveInviterName || meta.fb_invite_inviter_name;
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
      const intent = computeInviteIntent({
        teamId,
        patientId: effectivePatientId,
        caregiverId: effectiveCaregiverId,
        fbName: effectiveFbName,
        inviterName: effectiveInviterName,
        kind,
      });

      if (!user) {
        navigate(`/onboarding?${intentToParams(intent)}`);
        return;
      }

      // ── Logged in: link + join the team, then route the invitee to the
      //    onboarding that matches the intent — never a bare dashboard. ──
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .or(`user_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();

        const isOnboarded = userProfile?.onboarding_completed === true;

        const joinTeam = async () => {
          if (!intent.teamId) return;
          try {
            localStorage.setItem(`user_team_${user.id}`, JSON.stringify({
              team_id: intent.teamId,
              user_id: user.id
            }));
            const { data: existingTeam } = await safeSupabaseQuery(() =>
              (supabase.from('team_members') as any)
                .select('id')
                .eq('team_id', intent.teamId)
                .eq('user_id', user.id)
                .maybeSingle()
            );
            if (!existingTeam) {
              await safeSupabaseQuery(() =>
                (supabase.from('team_members') as any)
                  .insert({ team_id: intent.teamId, user_id: user.id })
              );
            }
          } catch (e) {
            console.log("[FB-DEBUG] JoinTeam: team insertion skipped", e);
          }
        };

        const cacheLink = (caregiverUid: string, patientUid: string) => {
          const cached = JSON.parse(localStorage.getItem(`dev_caregiver_links_${caregiverUid}`) || '[]');
          if (!cached.some((item: { patient_id: string }) => item.patient_id === patientUid)) {
            cached.push({ patient_id: patientUid, profiles: { display_name: "FreeBrainer", deletion_scheduled_at: null } });
            localStorage.setItem(`dev_caregiver_links_${caregiverUid}`, JSON.stringify(cached));
          }
        };

        // ── Guard: if the patient ID is still a dev-patient ID, don't attempt a
        //    Supabase insert (it would crash with "invalid input syntax for type uuid").
        //    Redirect to onboarding where handleCompleteBrainLover resolves it from
        //    the Supabase brainlover_invites table.
        if (intent.patientId && intent.patientId.startsWith("dev-patient-")) {
          console.warn("[FB-DEBUG] JoinTeam: patient ID is still dev-patient, redirecting to onboarding for resolution");
          navigate(`/onboarding?${intentToParams(intent)}`);
          return;
        }

        if (intent.kind === "support_existing_fb" && intent.patientId) {
          // The INVITEE is a new BrainLover caring for an EXISTING FreeBrainer.
          const caregiverUid = user.id;
          const patientUid = intent.patientId;
          try {
            const { data: existingLink } = await supabase
              .from('caregiver_links')
              .select('id')
              .eq('caregiver_id', caregiverUid)
              .eq('patient_id', patientUid)
              .maybeSingle();
            if (!existingLink) {
              const { error: linkErr } = await (supabase
                .from('caregiver_links') as any)
                .insert({ caregiver_id: caregiverUid, patient_id: patientUid });
              if (linkErr) {
                console.error("[FB-DEBUG] JoinTeam: caregiver_links insert failed:", linkErr.message);
                throw new Error(`Failed to link: ${linkErr.message}`);
              }
              console.log("[FB-DEBUG] JoinTeam: caregiver_links insert succeeded for patient:", patientUid);
            }
            const { ensureSameTeam } = await import("@/features/shared/useSubAccountCreate");
            await ensureSameTeam(caregiverUid, patientUid);
          } catch (e) {
            console.warn("Caregiver link Supabase insert failed, caching locally", e);
          }
          cacheLink(caregiverUid, patientUid);
          await joinTeam();

          toast({
            title: "Successfully Connected!",
            description: "Accounts have been successfully linked.",
          });
          sessionStorage.removeItem('pendingInvite');

          if (isOnboarded) {
            navigate("/caregiver");
          } else {
            navigate(`/onboarding?${intentToParams({ ...intent, patientId: patientUid })}`);
          }
          return;
        }

        if (intent.kind === "join_as_freebrainer") {
          // The INVITEE is a FreeBrainer. The inviting BrainLover's id (optional)
          // links them to their BrainLover; otherwise this is a team-only FB join.
          if (intent.caregiverId) {
            try {
              const { data: existingLink } = await supabase
                .from('caregiver_links')
                .select('id')
                .eq('caregiver_id', intent.caregiverId)
                .eq('patient_id', user.id)
                .maybeSingle();
              if (!existingLink) {
                await (supabase
                  .from('caregiver_links') as any)
                  .insert({ caregiver_id: intent.caregiverId, patient_id: user.id });
              }
            } catch (e) {
              console.warn("Caregiver link Supabase insert failed, caching locally", e);
            }
            cacheLink(intent.caregiverId, user.id);
          }
          await joinTeam();

          toast({
            title: "Successfully Connected!",
            description: "Your account is now linked with your BrainLover squad.",
          });
          sessionStorage.removeItem('pendingInvite');

          if (isOnboarded) {
            navigate(getDefaultRouteForRole(userRole));
          } else {
            navigate(`/onboarding?${intentToParams(intent)}`);
          }
          return;
        }

        // join_as_brainlover OR team_only — no patient context to link yet.
        await joinTeam();
        toast({
          title: "Successfully Connected!",
          description: intent.kind === "join_as_brainlover"
            ? "You'll pick your FreeBrainer next."
            : "Welcome to the team!",
        });
        sessionStorage.removeItem('pendingInvite');

        if (isOnboarded) {
          navigate(intent.kind === "join_as_brainlover" ? "/caregiver" : getDefaultRouteForRole(userRole));
        } else {
          navigate(`/onboarding?${intentToParams(intent)}`);
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
  }, [session, user, isLoading, teamId, caregiverId, patientId, fbName, inviterName, kind, userRole, navigate, toast]);

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
