/**
 * CalendlyModal — scheduling modal with optional "Invite Team" feature.
 *
 * Wraps the Calendly inline scheduler. When `inviteOptions` is provided,
 * shows checkboxes before the scheduler so the user can notify team
 * members and/or BrainLovers about the session (ADR 006).
 *
 * Reuses:
 *  - Calendly inline embed (no custom scheduling logic)
 *  - Supabase `team_members` + `caregiver_links` for notification targets
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  defaultUrl?: string;
  /** Pre-fill the invitee email (ensures FreeBrainer books with their FreeBrain email) */
  prefillEmail?: string;
  /** Pre-fill the invitee name */
  prefillName?: string;
  /** Options for inviting team members. If omitted, no invite checkboxes shown. */
  inviteOptions?: {
    /** The team ID to fetch members from */
    teamId?: string | null;
    /** The FreeBrainer user ID (for BrainLover to invite their FreeBrainer's BrainLovers) */
    freeBrainerId?: string | null;
    /** Whether to show "Invite all team members" option (FreeBrainer only) */
    showTeamInvite?: boolean;
    /** Whether to show "Invite all BrainLovers" option */
    showBrainLoverInvite?: boolean;
  };
}

const DEFAULT_CALENDLY_LINKS: Record<string, string> = {
  en: "https://calendly.com/jean-kaluza/app-idea-day-1-facilitation-clone",
  es: "https://calendly.com/jean-kaluza/virtual-freebrain-call-espanol",
  fr: "https://calendly.com/jean-kaluza/app-idea-day-1-facilitation-clone",
  de: "https://calendly.com/jean-kaluza/app-idea-day-1-facilitation-clone",
  pt: "https://calendly.com/jean-kaluza/app-idea-day-1-facilitation-clone",
};

export function CalendlyModal({
  isOpen,
  onClose,
  patientName,
  defaultUrl,
  prefillEmail,
  prefillName,
  inviteOptions,
}: CalendlyModalProps) {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const currentLang = (i18n.language || "en").split("-")[0];

  const [inviteTeam, setInviteTeam] = useState(false);
  const [inviteBrainLovers, setInviteBrainLovers] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const calendlyUrl = defaultUrl || DEFAULT_CALENDLY_LINKS[currentLang] || DEFAULT_CALENDLY_LINKS.en;

  const getEmbedUrl = (url: string) => {
    if (!url) return "https://calendly.com";
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("embed_domain", window.location.hostname);
      parsed.searchParams.set("embed_type", "Inline");
      parsed.searchParams.set("hide_landing_page_details", "1");
      if (prefillEmail) parsed.searchParams.set("email", prefillEmail);
      if (prefillName) parsed.searchParams.set("name", prefillName);
      if (prefillEmail) parsed.searchParams.set("a1", prefillEmail);
      return parsed.toString();
    } catch {
      return url;
    }
  };

  // ── Send in-app notifications to team members / BrainLovers ──
  const handleNotifyTeam = async () => {
    if (!inviteOptions?.teamId && !inviteOptions?.freeBrainerId) return;
    if (!inviteTeam && !inviteBrainLovers) return;

    setNotifying(true);
    try {
      // Fetch team members if inviting team
      if (inviteTeam && inviteOptions.teamId) {
        const { data: teamMembers } = await (supabase.from("team_members") as any)
          .select("user_id")
          .eq("team_id", inviteOptions.teamId);

        if (teamMembers && teamMembers.length > 0) {
          // Insert notifications (best-effort — table may not exist yet)
          try {
            await (supabase.from("session_notifications") as any).insert(
              teamMembers.map((tm: any) => ({
                recipient_id: tm.user_id,
                type: "team_session_invite",
                message: t("calendly.teamInviteNotif", {
                  name: prefillName || "Someone",
                  defaultValue: "{{name}} scheduled a team movement session — join if you can!",
                }),
              }))
            );
          } catch (e) {
            // Table may not exist — non-fatal
          }
        }
      }

      // Fetch BrainLovers if inviting BrainLovers
      if (inviteBrainLovers && inviteOptions.freeBrainerId) {
        const { data: blLinks } = await (supabase.from("caregiver_links") as any)
          .select("caregiver_id")
          .eq("patient_id", inviteOptions.freeBrainerId);

        if (blLinks && blLinks.length > 0) {
          try {
            await (supabase.from("session_notifications") as any).insert(
              blLinks.map((link: any) => ({
                recipient_id: link.caregiver_id,
                type: "brainlover_session_invite",
                message: t("calendly.brainLoverInviteNotif", {
                  name: prefillName || "Someone",
                  defaultValue: "{{name}} scheduled a movement session — join if you can!",
                }),
              }))
            );
          } catch (e) {}
        }
      }

      toast({
        title: t("calendly.notifiedTitle", "Team Notified! 📣"),
        description: t("calendly.notifiedDesc", "Your team will see the session invite in the app."),
      });
    } catch (e) {
      // Non-fatal — the Calendly booking still succeeded
      console.warn("[FB-DEBUG] notifyTeam error:", e);
    } finally {
      setNotifying(false);
    }
  };

  const handleClose = () => {
    // Send notifications if any checkboxes are checked
    if (inviteTeam || inviteBrainLovers) {
      handleNotifyTeam();
    }
    // Reset state
    setInviteTeam(false);
    setInviteBrainLovers(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <span>{t("calendly.title", "Schedule a Dual Movement Session")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t("calendly.desc", "Book a dedicated movement session together with")} {patientName || t("calendly.yourFreebrainer", "your FreeBrainer")}.
          </DialogDescription>
        </DialogHeader>

        {/* ── Invite Team options (ADR 006) ── */}
        {inviteOptions && (inviteOptions.showTeamInvite || inviteOptions.showBrainLoverInvite) && (
          <div className="shrink-0 space-y-2 pb-2 border-b border-border/30 mb-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("calendly.inviteTeamLabel", "Invite others to join (optional)")}
            </p>
            {inviteOptions.showTeamInvite && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={inviteTeam}
                  onCheckedChange={(v) => setInviteTeam(!!v)}
                  aria-label={t("calendly.inviteTeam", "Invite all team members")}
                />
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-foreground">
                  {t("calendly.inviteTeam", "Invite all team members")}
                </span>
              </label>
            )}
            {inviteOptions.showBrainLoverInvite && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={inviteBrainLovers}
                  onCheckedChange={(v) => setInviteBrainLovers(!!v)}
                  aria-label={t("calendly.inviteBrainLovers", "Invite all BrainLovers")}
                />
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-xs text-foreground">
                  {t("calendly.inviteBrainLovers", "Invite all BrainLovers")}
                </span>
              </label>
            )}
          </div>
        )}

        <div className="flex-1 w-full min-h-[520px] h-[600px] border rounded-xl overflow-hidden bg-background relative shadow-inner">
          <iframe
            src={getEmbedUrl(calendlyUrl)}
            width="100%"
            height="100%"
            frameBorder="0"
            title={t("calendly.iframeTitle", "Calendly Scheduling Flow")}
            className="w-full h-full min-h-[520px] border-0"
          />
        </div>

        {notifying && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            {t("calendly.notifying", "Notifying your team...")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
