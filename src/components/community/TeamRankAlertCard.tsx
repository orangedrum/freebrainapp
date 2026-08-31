/**
 * TeamRankAlertCard — Slim, alert-style card for team rank change announcements.
 * Renders as a compact 1-2 line banner with team names, rank arrows, and a cheer button.
 *
 * Post type: "team_rank_change"
 * Metadata (stored in post.metadata JSONB):
 *   { passingTeam: string, passedTeam: string, newRank: number, oldRank: number }
 *
 * i18n namespace: `community`
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostItem } from "@/components/community/PostCard";

interface TeamRankAlertCardProps {
  post: PostItem;
  onCheer?: (postId: string, authorId: string) => void;
}

interface RankChangeMeta {
  passingTeam: string;
  passedTeam: string;
  newRank: number;
  oldRank: number;
}

function parseMetadata(post: PostItem): RankChangeMeta | null {
  // Try metadata field first, fall back to parsing content as JSON
  const raw = (post as any).metadata || post.content;
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed.passingTeam && parsed.passedTeam) return parsed;
  } catch {
    /* not JSON */
  }
  return null;
}

export function TeamRankAlertCard({ post, onCheer }: TeamRankAlertCardProps) {
  const { t } = useTranslation();
  const [cheered, setCheered] = useState(post.has_cheered || false);
  const [cheersCount, setCheersCount] = useState(post.cheer_count || 0);

  const meta = parseMetadata(post);

  const handleCheer = () => {
    if (cheered) return;
    setCheered(true);
    setCheersCount((c) => c + 1);
    if (onCheer) onCheer(post.id, post.posted_by_id);
  };

  // Fallback: if metadata can't be parsed, show content as plain text
  if (!meta) {
    return (
      <Card className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning/30 shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <div className="p-2 rounded-lg bg-warning/20 text-warning shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-sm text-foreground/90 flex-1">{post.content}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheer}
            disabled={cheered}
            className={`gap-1 text-xs h-8 shrink-0 ${
              cheered ? "text-danger" : "text-muted-foreground hover:text-danger"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${cheered ? "fill-current" : ""}`} />
            {cheersCount > 0 ? cheersCount : ""}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning/30 shadow-sm hover:border-warning/50 transition-all">
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-warning/20 text-warning shrink-0">
          <TrendingUp className="h-4 w-4" />
        </div>

        {/* Alert content — 1-2 lines max */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground flex-wrap">
            <span className="inline-flex items-center gap-1 text-warning">
              <Users className="h-3.5 w-3.5" />
              {meta.passingTeam}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {t("community.rankPassed", "climbed past")}
            </span>
            <span className="text-foreground">{meta.passedTeam}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="inline-flex items-center gap-0.5">
              <span className="font-bold text-warning">#{meta.newRank}</span>
              <span className="text-muted-foreground/60">← #{meta.oldRank}</span>
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Cheer button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCheer}
          disabled={cheered}
          className={`gap-1.5 text-xs h-8 shrink-0 ${
            cheered ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${cheered ? "fill-current" : ""}`} />
          {cheersCount > 0 ? `${cheersCount} ${t("community.cheers")}` : t("community.giveCheer")}
        </Button>
      </div>
    </Card>
  );
}
