import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface PendingChild {
  childName: string | null;
  childAvatar: string | null;
  childEmail: string;
  invitedAt: string | null;
}

/**
 * usePendingChildren — parent-invite flow: children who stopped at the age
 * gate (step 12) and haven't finished onboarding yet (patient_id still NULL,
 * child_email set). Matches rows by the parent's invitee email OR by a
 * caregiver_id stamp from an earlier completion (covers verifying with a
 * different email than the one invited).
 *
 * Also reconciles: rows addressed to this parent's email that lack a
 * caregiver_id stamp get stamped (returning users whose completion predates
 * the stamp, or whose finalize lookup missed). This is what lets the child's
 * later completion build caregiver_links.
 */
export function usePendingChildren(parentEmail: string | undefined, parentUserId: string | undefined) {
  const [pendingChildren, setPendingChildren] = useState<PendingChild[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  const loadPendingChildren = useCallback(async () => {
    if (!parentEmail && !parentUserId) {
      setPendingChildren([]);
      return;
    }
    setIsLoadingPending(true);
    try {
      const email = parentEmail?.toLowerCase();
      // NOTE: two queries instead of .or() — PostgREST OR with NULL checks
      // is easy to get subtly wrong; dedupe client-side.
      const [byEmail, byStamp] = await Promise.all([
        email
          ? (supabase.from("brainlover_invites") as any)
              .select("invitee_email, caregiver_id, child_email, child_name, child_avatar, created_at, patient_id")
              .eq("invitee_email", email)
              .is("patient_id", null)
              .not("child_email", "is", null)
          : Promise.resolve({ data: [] }),
        parentUserId
          ? (supabase.from("brainlover_invites") as any)
              .select("invitee_email, caregiver_id, child_email, child_name, child_avatar, created_at, patient_id")
              .eq("caregiver_id", parentUserId)
              .is("patient_id", null)
              .not("child_email", "is", null)
          : Promise.resolve({ data: [] }),
      ]);
      const seen = new Set<string>();
      const merged: PendingChild[] = [];
      for (const row of [...(byEmail.data || []), ...(byStamp.data || [])]) {
        if (!row?.child_email || seen.has(row.child_email)) continue;
        seen.add(row.child_email);
        merged.push({
          childName: row.child_name || null,
          childAvatar: row.child_avatar || null,
          childEmail: row.child_email,
          invitedAt: row.created_at || null,
        });
        // Reconcile: stamp our caregiver_id on unstamped rows addressed to us.
        if (email && row.invitee_email === email && !row.caregiver_id && parentUserId) {
          try {
            await (supabase.from("brainlover_invites") as any)
              .update({ caregiver_id: parentUserId })
              .eq("invitee_email", email);
          } catch (e) {
            console.warn("[FB-DEBUG] usePendingChildren stamp failed (non-fatal):", e);
          }
        }
      }
      merged.sort((a, b) => (b.invitedAt || "").localeCompare(a.invitedAt || ""));
      setPendingChildren(merged);
    } catch (e) {
      console.warn("[FB-DEBUG] usePendingChildren load failed (non-fatal):", e);
    } finally {
      setIsLoadingPending(false);
    }
  }, [parentEmail, parentUserId]);

  useEffect(() => {
    loadPendingChildren();
  }, [loadPendingChildren]);

  return { pendingChildren, isLoadingPending, reloadPendingChildren: loadPendingChildren };
}
