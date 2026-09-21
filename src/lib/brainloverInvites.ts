/**
 * brainloverInvites — single source of truth for sending BrainLover invites.
 *
 * Every BrainLover invite (from the dashboard support section, the onboarding
 * "Want Support" step, and the InviteCaregiverModal) goes through this function.
 * This guarantees:
 *  - The same OTP redirect URL (app.freethebrains.com/join)
 *  - The same localStorage invite-context persistence
 *  - The same invite-list tracking for "Reinvite" CTAs
 *  - The same "fb-invite-sent" event dispatch
 *
 * No caller should ever call supabase.auth.signInWithOtp directly for invites.
 */
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";
import { isDevBypassMode } from "@/lib/devBypass";
import type { InviteKind } from "@/lib/inviteRouting";

const PROD_JOIN_URL = "https://app.freethebrains.com/join";

export interface InviteContext {
  patientId: string | null;
  caregiverId: string;
  patientName: string | null;
  patientAvatar: string | null;
  inviterName: string | null;
  role: string;
  createdAt: number;
  /** Parent-invite flow: the waiting child's email (captured at the age gate) */
  childEmail?: string | null;
  /** Parent-invite flow: the waiting child's display name (prefill on resume) */
  childName?: string | null;
  /** Parent-invite flow: the waiting child's photo URL (prefill on resume) */
  childAvatar?: string | null;
  /** Parent-invite flow: birth year from the age-gate dropdown */
  childBirthYear?: string | null;
}

export interface SendInviteResult {
  success: boolean;
  error?: string;
  /** True when the invite was NOT emailed yet because the inviter has not
   *  confirmed/verified their own account. The invite is parked in the
   *  deferred queue and flushed the first time the inviter verifies
   *  (see flushDeferredBrainLoverInvites). */
  deferred?: boolean;
}

/**
 * Send a BrainLover invite via Supabase OTP magic link.
 *
 * @param email        — the invitee's email address
 * @param context      — invite context (patient, inviter, etc.)
 * @param opts         — optional invite extras (e.g. team to join)
 * @returns             — { success, error? }
 *
 * Side effects:
 *  - Persists invite context to localStorage (email-specific + generic key)
 *  - If the inviter is NOT confirmed/verified yet: parks the invite in the
 *    deferred queue and returns { success, deferred: true } WITHOUT emailing.
 *  - Otherwise: adds email to the patient's invite list (for "Reinvite" CTA),
 *    upserts Supabase, sends the OTP and dispatches "fb-invite-sent".
 */
export interface InviteSendOptions {
  /** When set, appends team_id to the magic-link redirect so the invitee
   *  also joins this team after onboarding. */
  teamId?: string;
  /** Override the auto-detected invite kind (default: "support_existing_fb" when
   *  patientId is set, otherwise "join_as_brainlover"). Use "parent_invite" for
   *  parent invite flows. */
  kind?: InviteKind;
  /** Override the OTP redirect path (default: "/join"). Use "/onboarding" for
   *  parent invite flows so the invitee lands on the parent onboarding route. */
  redirectPath?: string;
}

export interface JoinLinkParams {
  teamId?: string | null;
  patientId?: string | null;
  caregiverId?: string | null;
  role?: string | null;
  fbName?: string | null;
  inviterName?: string | null;
  /** Explicit invite intent so JoinTeam never has to guess semantics. */
  kind?: InviteKind | null;
  /** Override the base join URL (defaults to the production app). */
  baseUrl?: string;
}

/**
 * Build the /join invite link with all invite context as query params.
 * Used by BOTH the email OTP redirect and the share/copy-link buttons so a
 * copied link carries the same patient context as the emailed one. Without a
 * kind/patient the invitee would fall into the wrong onboarding.
 */
export function buildJoinLink(params: JoinLinkParams): string {
  // Default to the CURRENT origin (same host as the email OTP redirect) so a
  // copied link exercises the same deployment the inviter is on — never a
  // statically hardcoded branch. Explicit baseUrl still overrides.
  const base = params.baseUrl || (typeof window !== "undefined" ? window.location.origin : PROD_JOIN_URL);
  const q = new URLSearchParams();
  if (params.teamId) q.set("team_id", params.teamId);
  if (params.patientId) q.set("patient_id", params.patientId);
  if (params.caregiverId) q.set("caregiver_id", params.caregiverId);
  if (params.role) q.set("role", params.role);
  if (params.fbName) q.set("fb_name", params.fbName);
  if (params.inviterName) q.set("inviter_name", params.inviterName);
  if (params.kind) q.set("kind", params.kind);
  const query = q.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Is the inviter confirmed & verified on their own account?
 *
 * The app only authenticates via magic links, so a real session exists exactly
 * when the inviter clicked their confirmation link (email_proved). No invite
 * OTP is ever sent before this returns true — an invite sent from an
 * unverified account would attach the invitee to a dev-user-id placeholder.
 *
 * Dev-bypass: the admin proxy has no real email to confirm; the mock client's
 * OTP is a no-op, so treat it as verified to keep admin testing unblocked.
 */
export async function isInviterVerified(): Promise<boolean> {
  if (isDevBypassMode()) return true;
  try {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (error || !user) return false;
    if (user.id === "dev-user-id") return false;
    return Boolean(user.email_confirmed_at);
  } catch {
    return false;
  }
}

const DEFERRED_BL_INVITES_KEY = "fb_deferred_bl_invites";

interface DeferredBrainLoverInvite {
  email: string;
  context: InviteContext;
  opts?: InviteSendOptions;
}

/**
 * Park a BrainLover invite that must NOT be emailed yet (inviter unverified).
 * The queue is flushed by flushDeferredBrainLoverInvites (called from
 * handleCompleteBrainLover once the inviter has a real, confirmed session).
 */
export function queueDeferredBrainLoverInvite(
  email: string,
  context: InviteContext,
  opts?: InviteSendOptions
): void {
  try {
    const raw = localStorage.getItem(DEFERRED_BL_INVITES_KEY);
    const list: DeferredBrainLoverInvite[] = raw ? JSON.parse(raw) : [];
    if (!list.some((i) => i.email === email)) {
      list.push({ email, context, opts });
      localStorage.setItem(DEFERRED_BL_INVITES_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn("[FB-DEBUG] queueDeferredBrainLoverInvite error (non-fatal):", e);
  }
}

/**
 * Send every deferred BrainLover invite now that the inviter is verified.
 *
 * @param overrides — apply the REAL caregiver/patient ids that only exist after
 *                    auth & sub-account re-creation (see handleCompleteBrainLover).
 *                    patientId may be null only when there is no real patient yet.
 */
export async function flushDeferredBrainLoverInvites(overrides?: {
  caregiverId?: string;
  patientId?: string | null;
  email?: string;
}): Promise<void> {
  let list: DeferredBrainLoverInvite[] = [];
  try {
    const raw = localStorage.getItem(DEFERRED_BL_INVITES_KEY);
    if (!raw) return;
    list = JSON.parse(raw);
    localStorage.removeItem(DEFERRED_BL_INVITES_KEY);
  } catch (e) {
    console.warn("[FB-DEBUG] flushDeferredBrainLoverInvites: could not read queue:", e);
    return;
  }
  for (const item of list) {
    if (overrides?.email && item.email !== overrides.email) continue;
    const context = { ...item.context };
    if (overrides?.caregiverId) context.caregiverId = overrides.caregiverId;
    if (overrides && "patientId" in overrides) context.patientId = overrides.patientId;
    try {
      await sendBrainLoverInvite(item.email, context, item.opts);
    } catch (e) {
      console.warn("[FB-DEBUG] Deferred invite send failed (non-fatal):", e);
    }
  }
}

/**
 * Make sure an invited BrainLover has a caregiver_links row for the patient
 * they were invited to support.
 *
 * Background: invites sent while the inviter was NOT yet verified (pre-gating
 * era) carried dev-patient ids, so the invitee's onboarding could not resolve
 * a real patient and silently SKIPPED the caregiver_links insert (see
 * handleCompleteBrainLover). That left the invitee on a dashboard with no
 * link, and every proxy check-in was then rejected by the daily_checkins RLS
 * (`new row violates row-level security policy`) or the validate trigger
 * (`user_id <uuid> does not exist in auth.users, managed_freebrainers, or
 * profiles`). brainlover_invites is the single source of truth for "which
 * patient was I invited to support", so we recreate the missing link from it.
 * Idempotent — UNIQUE(caregiver_id, patient_id) makes re-creation safe.
 *
 * @returns the resolved patient (live uuid + invite display data), or null
 *          when there is no resolvable invite (healthy users / dev-bypass).
 */
export async function ensureInvitedCaregiverLink(blUserId: string): Promise<{
  patientId: string;
  patientName: string | null;
  patientAvatar: string | null;
} | null> {
  if (isDevBypassMode()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (!email) return null;
    const ctx = await fetchInviteContextByEmail(email);
    const patientId = ctx?.patientId;
    if (!patientId || patientId.startsWith("dev-patient-")) return null;
    const { data: existing } = await (supabase.from("caregiver_links") as any)
      .select("id")
      .eq("caregiver_id", blUserId)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (existing) {
      return { patientId, patientName: ctx!.patientName, patientAvatar: ctx!.patientAvatar };
    }
    const { error } = await (supabase.from("caregiver_links") as any)
      .insert({ caregiver_id: blUserId, patient_id: patientId, status: "active" });
    if (error) {
      console.warn("[FB-DEBUG] ensureInvitedCaregiverLink insert failed:", error.message);
      return null;
    }
    console.warn("[FB-DEBUG] ensureInvitedCaregiverLink created caregiver link:", { blUserId, patientId });
    return { patientId, patientName: ctx!.patientName, patientAvatar: ctx!.patientAvatar };
  } catch (e) {
    console.warn("[FB-DEBUG] ensureInvitedCaregiverLink error (non-fatal):", e);
    return null;
  }
}

export async function sendBrainLoverInvite(
  email: string,
  context: InviteContext,
  opts?: InviteSendOptions
): Promise<SendInviteResult> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
    return { success: false, error: "Invalid email address" };
  }

  // 1. Persist invite context to localStorage BEFORE sending OTP
  try {
    const emailKey = `fb_invite_${cleanEmail}`;
    localStorage.setItem(emailKey, JSON.stringify(context));
    // NOTE: Do NOT set a generic "fb_latest_invite" key — it pollutes other
    // users' onboarding on shared browsers, causing them to incorrectly
    // enter the "invited BrainLover" flow instead of the primary flow.
  } catch (e) {
    /* ignore storage errors */
  }

  // 1b. NEVER email an invite from an unconfirmed/verified account.
  // During onboarding the inviter has no real session yet (id = "dev-user-id"),
  // so emailing here would attach the invitee to a placeholder account. The
  // invite is parked in the deferred queue and flushed from
  // handleCompleteBrainLover after the inviter verifies with the real ids.
  // Deliberately skips patient-list tracking + Supabase upsert when deferred so
  // the post-verification flush is the ONE sender (no double emails).
  if (!(await isInviterVerified())) {
    queueDeferredBrainLoverInvite(cleanEmail, context, opts);
    console.warn("[FB-DEBUG] sendBrainLoverInvite deferred (inviter not verified):", {
      email: cleanEmail,
      caregiverId: context.caregiverId,
      patientId: context.patientId,
    });
    return { success: true, deferred: true };
  }

  // 2. Track in the patient's invite list (for "Reinvite" CTA)
  if (context.patientId) {
    try {
      const key = `fb_bl_invites_${context.patientId}`;
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(cleanEmail)) {
        list.push(cleanEmail);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      /* ignore */
    }
  }

  // 3. Persist invite context to Supabase (survives magic link redirects for
  //    BOTH new and existing users — user_metadata only works for new users).
  //    UPSERT: if a row already exists for this email, update it with the latest
  //    context (patient_id may change from dev-patient to real UUID after re-send).
  try {
    const upsertResult = await safeSupabaseQuery(() =>
      (supabase.from("brainlover_invites") as any)
        .upsert({
          invitee_email: cleanEmail,
          patient_id: context.patientId,
          caregiver_id: context.caregiverId,
          patient_name: context.patientName,
          patient_avatar: context.patientAvatar,
          inviter_name: context.inviterName,
          role: context.role,
        }, { onConflict: "invitee_email" })
        .select("id")
        .single()
    );
    console.log("[FB-DEBUG] sendBrainLoverInvite: Supabase upsert result:", upsertResult);
  } catch (e) {
    console.warn("[FB-DEBUG] sendBrainLoverInvite: Supabase upsert failed (non-fatal):", e);
  }

  // 4. Send the OTP magic link — pass invite context via BOTH query params AND
  //    user_metadata. Supabase strips query params from magic link redirects,
  //    but user_metadata survives and is available in session.user.user_metadata
  //    after the invitee clicks the link and gets a session.
  const redirectUrl = buildJoinLink({
    baseUrl: getOtpRedirectUrl(opts?.redirectPath ?? "/join"),
    teamId: opts?.teamId,
    patientId: context.patientId,
    caregiverId: context.caregiverId,
    role: context.role,
    fbName: context.patientName,
    inviterName: context.inviterName,
    kind: opts?.kind ?? (context.patientId ? "support_existing_fb" : "join_as_brainlover"),
  });

  console.log("[FB-DEBUG] sendBrainLoverInvite:", {
    email: cleanEmail,
    redirectUrl,
    patientId: context.patientId,
    inviterName: context.inviterName,
  });

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
      data: {
        fb_invite_patient_id: context.patientId,
        fb_invite_caregiver_id: context.caregiverId,
        fb_invite_role: context.role,
        fb_invite_patient_name: context.patientName,
        fb_invite_patient_avatar: context.patientAvatar,
        fb_invite_inviter_name: context.inviterName,
      },
    },
  });

  if (otpError) {
    console.error("[FB-DEBUG] sendBrainLoverInvite OTP error:", otpError.message, otpError);
    return { success: false, error: otpError.message };
  }

  console.log("[FB-DEBUG] sendBrainLoverInvite: OTP call succeeded (no error from Supabase)");

  // 4. Notify listeners to refresh their invite lists
  window.dispatchEvent(new Event("fb-invite-sent"));

  return { success: true };
}

export interface TeamFreeBrainerInviteOptions {
  teamId?: string | null;
  /** A BrainLover inviting their FreeBrainer. When present the invitee is
   *  linked to them as a caregiver after onboarding. */
  caregiverId?: string | null;
}

/**
 * Invite a FreeBrainer to join a team ("Add Teammate → FreeBrainer").
 * The magic link routes through /join with kind=join_as_freebrainer so JoinTeam
 * sends the invitee through the FULL FreeBrainer onboarding (never a dashboard).
 * When a caregiverId is provided the invitee is linked to that caregiver first.
 */
export async function sendTeamFreeBrainerInvite(
  email: string,
  opts: TeamFreeBrainerInviteOptions
): Promise<SendInviteResult> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
    return { success: false, error: "Invalid email address." };
  }

  const redirectUrl = buildJoinLink({
    baseUrl: getOtpRedirectUrl("/join"),
    teamId: opts.teamId,
    caregiverId: opts.caregiverId,
    kind: "join_as_freebrainer",
  });

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
      data: {
        fb_invite_role: "caregiver",
        fb_invite_caregiver_id: opts.caregiverId || null,
      },
    },
  });

  if (error) {
    console.error("[FB-DEBUG] sendTeamFreeBrainerInvite OTP error:", error.message, error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove an invited email from a patient's invite list.
 */
export async function deleteBrainLoverInvite(patientId: string, email: string): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const key = `fb_bl_invites_${patientId}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const updated = list.filter((e) => e !== cleanEmail);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.removeItem(`fb_invite_${cleanEmail}`);
    // Also delete from Supabase table
    await safeSupabaseQuery(() =>
      (supabase.from("brainlover_invites") as any)
        .delete()
        .eq("invitee_email", cleanEmail)
    );
    window.dispatchEvent(new Event("fb-invite-sent"));
  } catch (e) {
    /* ignore */
  }
}

/**
 * Fetch invite context from Supabase by invitee email.
 * This is the reliable fallback when user_metadata and URL params are lost
 * (e.g. existing users whose user_metadata isn't updated by signInWithOtp).
 */
export async function fetchInviteContextByEmail(
  email: string
): Promise<InviteContext | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    // Use .limit(1) WITHOUT .maybeSingle() — if there are multiple rows
    // for the same email (initial send + re-send), .maybeSingle() returns
    // an error and swallows it, returning null. We want the latest row.
    const { data } = await safeSupabaseQuery<any[]>(() =>
      (supabase.from("brainlover_invites") as any)
        .select("*")
        .eq("invitee_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)
    );
    const row = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (row) {
      return {
        patientId: row.patient_id || null,
        caregiverId: row.caregiver_id || "",
        patientName: row.patient_name || null,
        patientAvatar: row.patient_avatar || null,
        inviterName: row.inviter_name || null,
        role: row.role || "caregiver",
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        childEmail: row.child_email || null,
        childName: row.child_name || null,
        childAvatar: row.child_avatar || null,
        childBirthYear: row.child_birth_year || null,
      };
    }
  } catch (e) {
    console.warn("[FB-DEBUG] fetchInviteContextByEmail error:", e);
  }
  return null;
}

/**
 * Fetch a parent-invite row by the WAITING CHILD's email.
 * Used when the child finishes onboarding (to find the parent's caregiver_id
 * for the caregiver_links insert) and when the child resumes (to prefill
 * name/photo). Returns the parent invitee email + child snapshot.
 */
export async function fetchInviteByChildEmail(
  childEmail: string
): Promise<{ parentEmail: string; caregiverId: string; patientId: string | null; childName: string | null; childAvatar: string | null; childBirthYear: string | null } | null> {
  const cleanEmail = childEmail.toLowerCase().trim();
  if (!cleanEmail) return null;
  try {
    const { data } = await safeSupabaseQuery<any[] | any>(() =>
      (supabase.from("brainlover_invites") as any)
        .select("*")
        .eq("child_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)
    );
    const row = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (!row) return null;
    return {
      parentEmail: row.invitee_email,
      caregiverId: row.caregiver_id || "",
      patientId: row.patient_id || null,
      childName: row.child_name || row.patient_name || null,
      childAvatar: row.child_avatar || row.patient_avatar || null,
      childBirthYear: row.child_birth_year || null,
    };
  } catch (e) {
    console.warn("[FB-DEBUG] fetchInviteByChildEmail error:", e);
    return null;
  }
}

/**
 * Send the "finish your onboarding" link to a waiting child.
 * Called once when the parent completes onboarding, and on demand from the
 * parent dashboard's resend CTA. The child's click lands on /onboarding with
 * fb_child_finish in user_metadata, which resumes them at step 13 — their
 * name/photo are recovered from the invite row by child_email.
 */
export async function sendChildFinishInvite(childEmail: string): Promise<SendInviteResult> {
  const cleanEmail = childEmail.toLowerCase().trim();
  if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
    return { success: false, error: "Invalid email address." };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: getOtpRedirectUrl("/onboarding"),
      shouldCreateUser: true,
      data: { fb_child_finish: "1" },
    },
  });
  if (error) {
    console.warn("[FB-DEBUG] sendChildFinishInvite OTP error:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Fetch the latest NAMED invite row for a patient ID.
 * Last-resort name/avatar source for invitees: the link may carry no fb_name
 * (sender didn't have one), the invitee-keyed row may be nameless, and the
 * patient's profiles row is RLS-invisible to unlinked invitees — but ANY
 * earlier invite that named this patient carries what we need. The table is
 * permissively readable, and the invitee already knows the patient_id from
 * their own link, so this reveals nothing new.
 */
export async function fetchInviteByPatientId(
  patientId: string
): Promise<{ patientName: string | null; patientAvatar: string | null } | null> {
  if (!patientId || patientId.startsWith("dev-patient-")) return null;
  try {
    const { data } = await safeSupabaseQuery<any[] | any>(() =>
      (supabase.from("brainlover_invites") as any)
        .select("patient_name, patient_avatar, created_at")
        .eq("patient_id", patientId)
        .not("patient_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
    );
    const row = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (!row?.patient_name) return null;
    return { patientName: row.patient_name, patientAvatar: row.patient_avatar || null };
  } catch (e) {
    console.warn("[FB-DEBUG] fetchInviteByPatientId error:", e);
    return null;
  }
}

/**
 * Get the list of pending invite emails for a patient.
 */
export function getPendingInvites(patientId: string): string[] {
  try {
    const key = `fb_bl_invites_${patientId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
