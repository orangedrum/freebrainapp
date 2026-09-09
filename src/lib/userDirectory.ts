/**
 * userDirectory — single source of truth for inviting existing FreeBrainers
 * and BrainLovers by search, and for the "smart invite email" hint.
 *
 * Every invite dialog (InviteTeammateModal, InviteFreeBrainerModal,
 * InviteBrainLoverChoiceModal) uses these helpers so the logic isn't
 * duplicated. RPCs back migration 42.
 */
import { supabase } from "@/lib/supabase";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";

export interface DirectoryUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

export type ConnectResult = { ok: boolean; error?: string };

/**
 * Search existing platform users by name or email (min 2 chars).
 */
export async function searchUsersForInvite(query: string): Promise<DirectoryUser[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const { data, error } = await supabase.rpc("search_users_for_invite", {
    search_query: clean,
  });

  if (error) {
    console.warn("[FB-DEBUG] search_users_for_invite error:", error.message);
    return [];
  }
  return (data || []) as DirectoryUser[];
}

/**
 * Exact email lookup — tells the send flow whether the invitee already has
 * an account (so it can pick a join-the-team link instead of onboarding).
 */
export async function lookupUserByEmail(email: string): Promise<DirectoryUser | null> {
  const target = email.trim().toLowerCase();
  if (!target || !target.includes("@")) return null;

  const { data, error } = await supabase.rpc("lookup_user_by_email", {
    target_email: target,
  });

  if (error) {
    console.warn("[FB-DEBUG] lookup_user_by_email error:", error.message);
    return null;
  }
  const rows = (data || []) as DirectoryUser[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Map a DB role to its locale key under `roles.*` for the badge label.
 */
export function getRoleLocaleKey(role: string | null): string {
  switch (role) {
    case "freebrainer":
      return "freebrainer";
    case "pro":
    case "admin":
      return "pro";
    case "caregiver":
    case "brainlover":
      return "brainlover";
    default:
      return "user";
  }
}

/**
 * Add an existing user to a team. team_members has a UNIQUE constraint on
 * user_id, so remove any previous row first (mirrors RallyTeamModal).
 */
export async function connectToTeam(teamId: string, userId: string): Promise<ConnectResult> {
  try {
    await supabase.from("team_members").delete().eq("user_id", userId);
    const { error } = await (supabase.from("team_members") as any).insert({
      team_id: teamId,
      user_id: userId,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * Link an existing user as the caregiver (BrainLover) of a FreeBrainer.
 */
export async function connectCaregiverLink(
  caregiverId: string,
  patientId: string
): Promise<ConnectResult> {
  try {
    const { data: existing } = await supabase
      .from("caregiver_links")
      .select("id")
      .eq("caregiver_id", caregiverId)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!existing) {
      const { error } = await (supabase.from("caregiver_links") as any).insert({
        caregiver_id: caregiverId,
        patient_id: patientId,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export interface SmartInviteOptions {
  email: string;
  /** Redirect path for invitees who ALREADY have an account. */
  existingRedirect: string;
  /** Redirect path for brand-new invitees. */
  newRedirect: string;
  /** Extra signInWithOtp options.data (e.g. invite context). */
  data?: Record<string, unknown>;
}

export interface SmartInviteResult {
  wasExistingUser: boolean;
  error: string | null;
}

/**
 * Smart invite email: existing accounts get the `existingRedirect` link
 * (e.g. join-a-team), brand-new emails get the `newRedirect` link (onboarding).
 * Both are turned into absolute magic-link URLs via getOtpRedirectUrl.
 */
export async function sendSmartInvite(
  opts: SmartInviteOptions
): Promise<SmartInviteResult> {
  const cleanEmail = opts.email.trim().toLowerCase();
  const existing = await lookupUserByEmail(cleanEmail);

  const redirectPath = existing ? opts.existingRedirect : opts.newRedirect;
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: getOtpRedirectUrl(redirectPath),
      shouldCreateUser: true,
      data: opts.data,
    },
  });

  return { wasExistingUser: !!existing, error: error?.message || null };
}