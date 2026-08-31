/**
 * BrainLoverSupportSection — shared notes + direct support between BrainLovers.
 *
 * Three parts:
 *  1. Invite a BrainLover by email (with pending invites list + reinvite/delete)
 *  2. Shared notes — 40-char input + list, posts to `brainlover_notes`.
 *  3. Other BrainLovers list — each with their last received support message
 *     shown inline + a "Send support" input (40-char). Posts to `brainlover_support`.
 *     One message per BrainLover per 24hrs. Messages auto-expire after 24hrs.
 *
 * When this section mounts, it marks all received messages as seen
 * (sets seen_at = now()), which clears the dashboard red dot.
 *
 * Reuses caregiver_links to find linked BrainLovers. Dev-bypass safe.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Heart, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendBrainLoverInvite, deleteBrainLoverInvite, getPendingInvites } from "@/lib/brainloverInvites";

interface LinkedBrainLover {
  user_id: string;
  display_name: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  canSend: boolean; // true if no message sent in last 24hrs
}

interface SharedNote {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface BrainLoverSupportSectionProps {
  patientId: string;
  patientName: string;
  patientAvatar?: string | null;
  caregiverId: string;
}

export function BrainLoverSupportSection({
  patientId,
  patientName,
  patientAvatar,
  caregiverId,
}: BrainLoverSupportSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [inviterDisplayName, setInviterDisplayName] = useState<string | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [linkedBLs, setLinkedBLs] = useState<LinkedBrainLover[]>([]);
  const [supportInput, setSupportInput] = useState<Record<string, string>>({});
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [reinviting, setReinviting] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Fetch the BrainLover's display name from profiles (real users don't have it in user_metadata)
  useEffect(() => {
    if (!user?.id) return;
    const metaName = (user?.user_metadata as any)?.full_name || user?.user_metadata?.name || null;
    if (metaName) { setInviterDisplayName(metaName); return; }
    // Fetch from profiles table
    (async () => {
      const { data } = await safeSupabaseQuery<any>(() =>
        (supabase.from("profiles") as any)
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle()
      );
      if (data?.display_name) {
        setInviterDisplayName(data.display_name);
      } else {
        // Fallback to email username if profile not found
        const emailName = user?.email?.split("@")[0] || null;
        if (emailName) setInviterDisplayName(emailName);
      }
    })();
  }, [user?.id]);

  // Helper: ensure we have the inviter's display name before sending an invite
  const ensureInviterName = async (): Promise<string | null> => {
    if (inviterDisplayName) return inviterDisplayName;
    if (!user?.id) return null;
    // Try fetching again
    const { data } = await safeSupabaseQuery<any>(() =>
      (supabase.from("profiles") as any)
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()
    );
    const name = data?.display_name || user?.email?.split("@")[0] || null;
    if (name) setInviterDisplayName(name);
    return name;
  };

  const isDevBypass = isDevBypassUser(patientId) || isDevBypassUser(caregiverId);

  const loadData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);

    // Load invited emails from the shared helper
    setInvitedEmails(getPendingInvites(patientId));

    if (isDevBypass) {
      const notesKey = `fb_bl_notes_${patientId}`;
      try {
        const raw = localStorage.getItem(notesKey);
        if (raw) setNotes(JSON.parse(raw));
      } catch (e) {}
      // Mock linked BrainLovers with no messages
      setLinkedBLs([
        { user_id: "dev-bl-1", display_name: "Sarah", lastMessage: null, lastMessageTime: null, canSend: true },
        { user_id: "dev-bl-2", display_name: "Mike", lastMessage: null, lastMessageTime: null, canSend: true },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Fetch shared notes
      const { data: noteRows } = await safeSupabaseQuery<any>(() =>
        (supabase.from("brainlover_notes") as any)
          .select("id, author_id, content, created_at")
          .eq("freebrainer_id", patientId)
          .order("created_at", { ascending: false })
          .limit(20)
      );

      // Fetch author names
      const authorIds = [...new Set((noteRows || []).map((n: any) => n.author_id))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name")
            .in("user_id", authorIds)
        );
        (profiles || []).forEach((p: any) => {
          authorMap[p.user_id] = p.display_name || "BrainLover";
        });
      }

      const mappedNotes: SharedNote[] = (noteRows || []).map((n: any) => ({
        id: n.id,
        author_id: n.author_id,
        author_name: authorMap[n.author_id] || "BrainLover",
        content: n.content,
        created_at: n.created_at,
      }));
      setNotes(mappedNotes);

      // Fetch linked BrainLovers — ALL caregivers for this patient
      const { data: links, error: linksError } = await safeSupabaseQuery<any>(() =>
        (supabase.from("caregiver_links") as any)
          .select("caregiver_id")
          .eq("patient_id", patientId)
      );

      console.log("[FB-DEBUG] BrainLoverSupportSection: caregiver_links for patient", patientId, "→", links, "error:", linksError);

      // Filter out self by caregiverId
      const blIds = (links || [])
        .map((l: any) => l.caregiver_id)
        .filter((id: string) => id !== caregiverId);

      // Also fetch the current user's email to filter self by email
      // (in case caregiver_links was created with a different ID during onboarding)
      let currentUserEmail: string | null = null;
      if (user?.email) {
        currentUserEmail = user.email.toLowerCase();
      } else {
        const { data: ownProfile } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("email")
            .eq("user_id", caregiverId)
            .maybeSingle()
        );
        currentUserEmail = ownProfile?.email?.toLowerCase() || null;
      }

      if (blIds.length > 0) {
        const { data: blProfiles, error: blProfilesError } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name, email")
            .in("user_id", blIds)
        );

        console.log("[FB-DEBUG] BrainLoverSupportSection: profiles for blIds", blIds, "→", blProfiles, "error:", blProfilesError, "currentUserEmail:", currentUserEmail);

        // Double-filter: remove any profile whose email matches the current user
        // (handles edge case where caregiver_links has a stale/duplicate row for self)
        const filteredProfiles = (blProfiles || []).filter((p: any) => {
          if (p.email && currentUserEmail && p.email.toLowerCase() === currentUserEmail) {
            return false; // this is me, skip
          }
          return true;
        });

        // Collect emails of linked BLs to auto-clear from pending invites
        const linkedBLEmails = new Set<string>();
        (filteredProfiles || []).forEach((p: any) => {
          if (p.email) linkedBLEmails.add(p.email.toLowerCase());
        });

        // Auto-remove pending invites for BLs who have already accepted
        if (linkedBLEmails.size > 0) {
          const currentPending = getPendingInvites(patientId);
          const stillPending = currentPending.filter((e) => !linkedBLEmails.has(e.toLowerCase()));
          if (stillPending.length !== currentPending.length) {
            try {
              localStorage.setItem(
                `fb_bl_invites_${patientId}`,
                JSON.stringify(stillPending)
              );
            } catch (e) {}
            setInvitedEmails(stillPending);
          }
        }

        // Fetch received support messages (from these BLs to me, within last 24hrs)
        const { data: receivedMsgs } = await safeSupabaseQuery<any>(() =>
          (supabase.from("brainlover_support") as any)
            .select("id, from_brainlover_id, content, created_at, seen_at")
            .eq("to_brainlover_id", caregiverId)
            .in("from_brainlover_id", filteredProfiles.map((p: any) => p.user_id))
            .order("created_at", { ascending: false })
        );

        // Fetch sent support messages (from me to these BLs, within last 24hrs)
        const { data: sentMsgs } = await safeSupabaseQuery<any>(() =>
          (supabase.from("brainlover_support") as any)
            .select("id, to_brainlover_id, created_at")
            .eq("from_brainlover_id", caregiverId)
            .in("to_brainlover_id", filteredProfiles.map((p: any) => p.user_id))
            .order("created_at", { ascending: false })
        );

        const now = Date.now();
        const twentyFourHrsAgo = now - 24 * 60 * 60 * 1000;

        // Build map of last received message per sender
        const receivedMap: Record<string, { content: string; created_at: string }> = {};
        (receivedMsgs || []).forEach((m: any) => {
          if (!receivedMap[m.from_brainlover_id]) {
            receivedMap[m.from_brainlover_id] = { content: m.content, created_at: m.created_at };
          }
        });

        // Build set of BLs I've sent to in last 24hrs
        const sentRecently = new Set<string>();
        (sentMsgs || []).forEach((m: any) => {
          if (new Date(m.created_at).getTime() > twentyFourHrsAgo) {
            sentRecently.add(m.to_brainlover_id);
          }
        });

        setLinkedBLs(
          (filteredProfiles || []).map((p: any) => {
            const lastMsg = receivedMap[p.user_id];
            const msgTime = lastMsg ? new Date(lastMsg.created_at).getTime() : 0;
            const isRecent = msgTime > twentyFourHrsAgo;
            return {
              user_id: p.user_id,
              display_name: p.display_name || "BrainLover",
              lastMessage: isRecent ? lastMsg!.content : null,
              lastMessageTime: isRecent ? lastMsg!.created_at : null,
              canSend: !sentRecently.has(p.user_id),
            };
          })
        );
      } else {
        setLinkedBLs([]);
      }
    } catch (e) {
      console.warn("[FB-DEBUG] BrainLoverSupportSection load error:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId, caregiverId, isDevBypass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark received messages as seen when section mounts (clears the red dot)
  useEffect(() => {
    if (isDevBypass || !caregiverId) return;
    const markSeen = async () => {
      try {
        await safeSupabaseQuery(() =>
          (supabase.from("brainlover_support") as any)
            .update({ seen_at: new Date().toISOString() })
            .eq("to_brainlover_id", caregiverId)
            .is("seen_at", null)
        );
        window.dispatchEvent(new Event("fb-support-seen"));
      } catch (e) {
        // non-fatal
      }
    };
    // Small delay so it doesn't race with loadData
    const timer = setTimeout(markSeen, 1500);
    return () => clearTimeout(timer);
  }, [caregiverId, isDevBypass]);

  // Re-load when a new invite is sent
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener("fb-invite-sent", handler);
    return () => window.removeEventListener("fb-invite-sent", handler);
  }, [loadData]);

  const handlePostNote = async () => {
    const content = noteInput.trim();
    if (!content) return;
    setPosting(true);

    try {
      if (isDevBypass) {
        const newNote: SharedNote = {
          id: `dev_note_${Date.now()}`,
          author_id: caregiverId,
          author_name: "You",
          content,
          created_at: new Date().toISOString(),
        };
        const updated = [newNote, ...notes].slice(0, 20);
        setNotes(updated);
        localStorage.setItem(`fb_bl_notes_${patientId}`, JSON.stringify(updated));
      } else {
        const { error: noteError } = await safeSupabaseQuery(() =>
          (supabase.from("brainlover_notes") as any).insert({
            freebrainer_id: patientId,
            author_id: caregiverId,
            content,
          })
        );

        if (noteError) {
          console.warn("[FB-DEBUG] BrainLoverSupportSection: Supabase insert failed, using localStorage fallback:", noteError);
          const newNote: SharedNote = {
            id: `fallback_note_${Date.now()}`,
            author_id: caregiverId,
            author_name: "You",
            content,
            created_at: new Date().toISOString(),
          };
          const updated = [newNote, ...notes].slice(0, 20);
          setNotes(updated);
          localStorage.setItem(`fb_bl_notes_${patientId}`, JSON.stringify(updated));
        } else {
          await loadData();
        }
      }
      setNoteInput("");
      window.dispatchEvent(new CustomEvent("fb-activity-logged"));
      toast({ title: t("supportSection.notePosted", "Note shared!") });
    } catch (e) {
      toast({ title: t("supportSection.postError", "Failed to post"), variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleSendSupport = async (toId: string) => {
    const content = (supportInput[toId] || "").trim();
    if (!content) return;
    setSendingTo(toId);

    try {
      if (isDevBypass) {
        toast({ title: t("supportSection.supportSent", "Support sent! ❤️") });
      } else {
        await safeSupabaseQuery(() =>
          (supabase.from("brainlover_support") as any).insert({
            from_brainlover_id: caregiverId,
            to_brainlover_id: toId,
            freebrainer_id: patientId,
            content,
          })
        );
        toast({ title: t("supportSection.supportSent", "Support sent! ❤️") });
        window.dispatchEvent(new Event("fb-support-sent"));
      }
      setSupportInput((prev) => ({ ...prev, [toId]: "" }));
      // Update local state: mark as can't send again for 24hrs
      setLinkedBLs((prev) =>
        prev.map((bl) =>
          bl.user_id === toId ? { ...bl, canSend: false } : bl
        )
      );
    } catch (e) {
      toast({ title: t("supportSection.sendError", "Failed to send"), variant: "destructive" });
    } finally {
      setSendingTo(null);
    }
  };

  const handleReinvite = async (email: string) => {
    setReinviting(email);
    const resolvedName = await ensureInviterName();
    const result = await sendBrainLoverInvite(email, {
      patientId,
      caregiverId,
      patientName,
      patientAvatar: patientAvatar || null,
      inviterName: resolvedName,
      role: "caregiver",
      createdAt: Date.now(),
    });
    if (!result.success) {
      toast({ title: t("supportSection.reinviteError", "Failed to re-invite"), description: result.error, variant: "destructive" });
    } else {
      toast({ title: t("supportSection.reinviteSent", "Re-invite sent to {{email}}", { email }) });
    }
    setReinviting(null);
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    setSendingInvite(true);
    const resolvedName = await ensureInviterName();
    const result = await sendBrainLoverInvite(email, {
      patientId,
      caregiverId,
      patientName,
      patientAvatar: patientAvatar || null,
      inviterName: resolvedName,
      role: "caregiver",
      createdAt: Date.now(),
    });
    if (!result.success) {
      toast({
        title: t("supportSection.inviteError", "Failed to send invite"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      await loadData();
      setInviteEmail("");
      toast({
        title: t("supportSection.inviteSent", "Invite sent!"),
        description: t("supportSection.inviteSentDesc", { email, defaultValue: `An invitation has been sent to ${email}. If they don't receive it within 5 minutes, check spam or try again later (email providers may rate-limit).` }),
      });
    }
    setSendingInvite(false);
  };

  const handleDeleteInvite = async (email: string) => {
    await deleteBrainLoverInvite(patientId, email);
    setInvitedEmails(getPendingInvites(patientId));
    toast({ title: t("supportSection.inviteDeleted", "Invite removed") });
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          {t("supportSection.loading", "Loading support...")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          {t("supportSection.title", "BrainLover Support")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("supportSection.subtitle", "Share notes and support with other BrainLovers of {{name}}.", { name: patientName.split(" ")[0] })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Invite a BrainLover by email ── */}
        <div className="space-y-2 rounded-lg bg-primary/10 border border-primary/30 p-3">
          <p className="text-xs font-bold text-primary flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            {t("supportSection.inviteHeader", "Invite a BrainLover to help support")}
          </p>
          <div className="flex gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !sendingInvite && handleSendInvite()}
              placeholder={t("supportSection.invitePlaceholder", "Enter their email address...")}
              type="email"
              className="text-sm bg-background"
            />
            <Button
              size="sm"
              onClick={handleSendInvite}
              disabled={sendingInvite || !inviteEmail.trim()}
              className="gap-1.5 shrink-0"
            >
              {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("supportSection.inviteBtn", "Send Invite")}
            </Button>
          </div>
        </div>

        {/* ── Shared notes ── */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("supportSection.notesHeader", "Shared Notes")}
          </p>
          <div className="flex gap-2">
            <Input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value.slice(0, 140))}
              onKeyDown={(e) => e.key === "Enter" && !posting && handlePostNote()}
              placeholder={t("supportSection.notePlaceholder", "Write a note for other BrainLovers...")}
              maxLength={140}
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handlePostNote}
              disabled={posting || !noteInput.trim()}
              className="gap-1.5 shrink-0"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground text-right">
            {noteInput.length}/140
          </div>

          {notes.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-primary shrink-0">
                    {note.author_id === caregiverId ? t("supportSection.you", "You") : note.author_name}:
                  </span>
                  <span className="text-foreground">{note.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Other BrainLovers (with inline received messages + send support) ── */}
        {linkedBLs.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("supportSection.otherBrainLovers", "Other BrainLovers")}
            </p>
            {linkedBLs.map((bl) => (
              <div key={bl.user_id} className="space-y-1.5">
                {/* BrainLover row */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
                      {bl.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1 truncate">{bl.display_name}</span>
                </div>

                {/* Inline received message (if within 24hrs) */}
                {bl.lastMessage && (
                  <div className="ml-10 flex items-start gap-1.5 rounded-lg bg-success/10 border border-success/20 px-3 py-1.5 text-xs">
                    <Heart className="h-3 w-3 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground italic">{bl.lastMessage}</span>
                  </div>
                )}

                {/* Send support input (disabled if already sent in last 24hrs) */}
                {bl.canSend ? (
                  <div className="ml-10 flex gap-2">
                    <Input
                      value={supportInput[bl.user_id] || ""}
                      onChange={(e) =>
                        setSupportInput((prev) => ({
                          ...prev,
                          [bl.user_id]: e.target.value.slice(0, 140),
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && sendingTo !== bl.user_id && handleSendSupport(bl.user_id)
                      }
                      placeholder={t("supportSection.supportPlaceholder", "Send support...")}
                      maxLength={140}
                      className="h-8 text-xs w-40"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendSupport(bl.user_id)}
                      disabled={sendingTo === bl.user_id || !(supportInput[bl.user_id] || "").trim()}
                      className="gap-1 shrink-0 h-8 px-2"
                    >
                      {sendingTo === bl.user_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="ml-10 text-[10px] text-muted-foreground">
                    {t("supportSection.alreadySent", "Support sent — come back tomorrow to send more!")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {linkedBLs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {t("supportSection.noOtherBLs", "You're the only BrainLover for {{name}} so far.", { name: patientName.split(" ")[0] })}
          </p>
        )}

        {/* ── Invited emails (pending invites) ── */}
        {invitedEmails.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("supportSection.pendingInvites", "Pending Invites")}
            </p>
            {invitedEmails.map((email) => (
              <div key={email} className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 truncate">{email}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReinvite(email)}
                  disabled={reinviting === email}
                  className="gap-1 shrink-0 h-7 px-2 text-xs"
                >
                  {reinviting === email ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  {t("supportSection.reinvite", "Reinvite")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteInvite(email)}
                  className="shrink-0 h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  aria-label={t("supportSection.delete", "Delete")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
