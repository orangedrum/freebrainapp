import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface SelfProfile {
  /** The FreeBrainer's display name (user_metadata name as fallback). */
  displayName: string | null;
  /** The FreeBrainer's avatar URL (null when not set / unresolvable). */
  avatarUrl: string | null;
}

/**
 * The current FreeBrainer's own display name + avatar.
 *
 * Used to attach the FreeBrainer's profile context to "Invite a BrainLover"
 * invites so the invitee always lands on the secondary (invited) BrainLover
 * onboarding with the FreeBrainer's picture.
 */
export function useSelfProfile(): SelfProfile {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      setAvatarUrl(null);
      return;
    }

    (async () => {
      let resolvedName = (user.user_metadata as { name?: string } | undefined)?.name || null;
      let resolvedAvatar: string | null = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          resolvedName = data.display_name || resolvedName;
          resolvedAvatar = data.avatar_url || null;
        }
      } catch (e) {
        console.warn("[FB-DEBUG] useSelfProfile: profile fetch failed (falling back to metadata):", e);
      }
      setDisplayName(resolvedName);
      setAvatarUrl(resolvedAvatar);
    })();
  }, [user]);

  return { displayName, avatarUrl };
}