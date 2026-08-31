/**
 * BrainLoverLoveSection — encouragement from the FreeBrainer's BrainLovers.
 *
 * Shows:
 *  1. Connected BrainLovers list (avatars + names) — always visible
 *  2. BrainLover help description — always visible
 *  3. BrainLover interactions (cheers, pokes, video recommendations)
 *  4. Invite button to bring in more BrainLovers
 *
 * Key behaviors:
 *  - Video recommendation cards persist until the FreeBrainer checks in
 *    with that video (NOT dismissable — encourages follow-through).
 *  - Pokes and cheers can be dismissed.
 *  - Empty state includes an invite CTA.
 *
 * Reuses: BrainLoverInteraction data from `brainloverInteractions.ts`,
 *         InviteCaregiverModal from `@/components/profile/InviteCaregiverModal`,
 *         useConnectedBrainLovers for the caregiver_links query.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Bell, Video, Play, X, UserPlus } from "lucide-react";
import { useLoveInteractions, type LoveItem } from "@/features/freebrainer/useLoveInteractions";
import { useConnectedBrainLovers } from "@/features/freebrainer/useConnectedBrainLovers";
import { InviteCaregiverModal } from "@/components/profile/InviteCaregiverModal";
import { useAuth } from "@/contexts/AuthContext";

interface BrainLoverLoveSectionProps {
  userId?: string;
  /** Called when user taps "Watch This Video" — opens check-in with that video */
  onWatchVideo?: (video: any) => void;
}

export function BrainLoverLoveSection({ userId, onWatchVideo }: BrainLoverLoveSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { items, loading, dismiss } = useLoveInteractions(userId, null);
  const { brainLovers } = useConnectedBrainLovers(userId);

  // Filter to only BrainLover interactions (not team rallies)
  const brainLoverItems = items.filter((i) => !i.isTeamRally);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Heart className="h-4 w-4 fill-primary" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              {t("love.fromBrainLovers", "From Your BrainLovers")}
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("love.inviteBrainLover", "Invite")}
          </Button>
        </div>

        {/* Connected BrainLovers — always visible */}
        {brainLovers.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {brainLovers.map((bl) => (
                <div
                  key={bl.caregiver_id}
                  className="flex items-center gap-2 bg-primary/10 rounded-full pl-1 pr-3 py-1"
                >
                  <Avatar className="h-6 w-6">
                    {bl.avatar_url ? (
                      <img src={bl.avatar_url} alt={bl.display_name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {bl.display_name?.substring(0, 2).toUpperCase() || "BL"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs font-semibold text-foreground">
                    {bl.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help description — always visible */}
        <p className="text-xs text-muted-foreground bg-primary/5 p-2.5 rounded-lg border border-primary/10 leading-relaxed">
          {t("network.brainLoverHelpDesc", "Your BrainLover can cheer you on, surprise you with new exercises, join you for sessions, and help you stay on track!")}
        </p>

        {/* Content — interactions */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("love.loading", "Loading your love...")}
          </p>
        ) : brainLoverItems.length === 0 && brainLovers.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {t("love.emptyBrainLoverTitle", "No new encouragement")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t("love.emptyBrainLoverDesc", "Invite a BrainLover to support your journey!")}
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2 font-bold"
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus className="h-4 w-4" />
              {t("love.inviteBrainLoverCta", "Invite a BrainLover")}
            </Button>
          </div>
        ) : brainLoverItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            {t("love.noNewEncouragement", "No new encouragement right now — check back later!")}
          </p>
        ) : (
          <div className="space-y-3">
            {brainLoverItems.map((item) => (
              <BrainLoverLoveCard
                key={item.id}
                item={item}
                onDismiss={() => dismiss(item)}
                onWatchVideo={() => onWatchVideo?.(item.video)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Invite BrainLover modal */}
      <InviteCaregiverModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userId={user?.id || ""}
        userRole="freebrainer"
      />
    </Card>
  );
}

// ── Individual BrainLover love card ───────────────────────────

interface BrainLoverLoveCardProps {
  item: LoveItem;
  onDismiss: () => void;
  onWatchVideo?: () => void;
}

function BrainLoverLoveCard({ item, onDismiss, onWatchVideo }: BrainLoverLoveCardProps) {
  const { t } = useTranslation();

  // Video recommendation: NOT dismissable, persists until check-in
  if (item.type === "recommend_video") {
    return (
      <Card className="border-2 border-primary bg-primary shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 rounded-xl bg-primary-foreground/20 text-primary-foreground shrink-0">
              <Video className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-primary-foreground text-sm sm:text-base">
                  {t("love.recommendTitle", { name: item.senderName })}
                </h4>
                <Badge variant="secondary" className="text-[10px]">
                  {t("love.recommended")}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-primary-foreground/90 mt-0.5 line-clamp-1">
                {item.video?.title || item.message}
              </p>
              {item.customMessage && (
                <p className="text-xs text-primary-foreground/75 mt-1 italic line-clamp-2">
                  "{item.customMessage}"
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {item.video && onWatchVideo && (
              <Button
                size="sm"
                className="gap-2 font-bold text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={onWatchVideo}
              >
                <Play className="h-3.5 w-3.5" /> {t("love.watchVideo")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Poke: dismissable reminder
  if (item.type === "poke") {
    return (
      <Card className="border-2 border-warning bg-warning/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-warning shrink-0" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">
                {t("love.pokeTitle")}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t("love.pokeMessage", { name: item.senderName })}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-xs font-semibold shrink-0" onClick={onDismiss}>
            <X className="h-4 w-4 mr-1" /> {t("love.dismiss")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Cheer: dismissable encouragement
  if (item.type === "cheer") {
    return (
      <Card className="border-2 border-rose-400 bg-rose-400/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 shrink-0">
              <Heart className="h-6 w-6 fill-rose-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base">
                {t("love.cheerTitle")}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t("love.cheerMessage", { name: item.senderName })}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-xs font-semibold shrink-0" onClick={onDismiss}>
            <X className="h-4 w-4 mr-1" /> {t("love.dismiss")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
