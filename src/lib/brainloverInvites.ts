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

const PROD_JOIN_URL = "https://app.freethebrains.com/join";

export interface InviteContext {
  patientId: string | null;
  caregiverId: string;
  patientName: string | null;
  patientAvatar: string | null;
  inviterName: string | null;
  role: string;
  createdAt: number;
}

export interface SendInviteResult {
  success: boolean;
  error?: string;
}

/**
 * Send a BrainLover invite via Supabase OTP magic link.
 *
 * @param email        — the invitee's email address
 * @param context      — invite context (patient, inviter, etc.)
 * @returns             — { success, error? }
 *
 * Side effects:
 *  - Persists invite context to localStorage (email-specific + generic key)
 *  - Adds email to the patient's invite list (for "Reinvite" CTA)
 *  - Dispatches "fb-invite-sent" window event
 */
export async function sendBrainLoverInvite(
  email: string,
  context: InviteContext
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
  const baseUrl = getOtpRedirectUrl("/join");
  const params = new URLSearchParams();
  if (context.patientId) params.set("patient_id", context.patientId);
  if (context.caregiverId) params.set("caregiver_id", context.caregiverId);
  if (context.role) params.set("role", context.role);
  if (context.patientName) params.set("fb_name", context.patientName);
  if (context.inviterName) params.set("inviter_name", context.inviterName);
  const redirectUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

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
      };
    }
  } catch (e) {
    console.warn("[FB-DEBUG] fetchInviteContextByEmail error:", e);
  }
  return null;
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
