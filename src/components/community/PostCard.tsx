/**
 * PostCard — Renders a single community post with author info, badges, and cheer button.
 * Supports Pro posts with linked FreeBrainer hover card.
 * Fully i18n via `community` namespace.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl, getInitials } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Video, ShieldCheck, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export interface PostItem {
  id: string;
  user_id: string;
  posted_by_id: string;
  on_behalf_of_id?: string | null;
  posted_as_pro?: boolean | null;
  content: string | null;
  video_url: string | null;
  external_link: string | null;
  type: string | null;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  posted_by_name?: string;
  linked_freebrainers?: { id: string; name: string }[];
  cheer_count?: number;
  has_cheered?: boolean;
}

interface PostCardProps {
  post: PostItem;
  onCheer?: (postId: string, authorId: string) => void;
}

export function PostCard({ post, onCheer }: PostCardProps) {
  const { t } = useTranslation();
  const [cheered, setCheered] = useState(post.has_cheered || false);
  const [cheersCount, setCheersCount] = useState(post.cheer_count || 0);

  const handleCheerClick = () => {
    if (cheered) return;
    setCheered(true);
    setCheersCount((prev) => prev + 1);
    if (onCheer) {
      onCheer(post.id, post.posted_by_id);
    }
  };

  const getTypeBadge = (type?: string | null) => {
    switch (type) {
      case "sos":
      case "win":
        return <span className="bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-red-500/30">{t("community.sosBadge")}</span>;
      case "recommendation":
      case "question":
        return <span className="bg-warning/20 text-warning text-[10px] px-2 py-0.5 rounded-full font-semibold border border-warning/30">{t("community.recommendationBadge")}</span>;
      default:
        return <span className="bg-primary/20 text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-semibold border border-white/10">{t("community.updateBadge")}</span>;
    }
  };

  return (
    <Card className="bg-card/70 border-white/10 shadow-md hover:border-white/20 transition-all">
      <CardContent className="p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-white/20 mt-0.5">
              <AvatarImage src={post.author_avatar || getAvatarUrl(post.author_name || post.user_id)} alt={post.author_name || "User"} />
              <AvatarFallback className="bg-primary/30 text-xs font-bold text-foreground">
                {getInitials(post.author_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm md:text-base text-foreground">
                  {post.author_name || "Community Member"}
                </span>

                {post.posted_as_pro && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-500/30 cursor-pointer hover:bg-purple-500/30 transition-colors">
                        <ShieldCheck className="h-3 w-3" /> {t("community.brainLoverProBadge")}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64 bg-card border-white/10 p-3 shadow-xl">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground border-b border-white/10 pb-1.5">
                          <Users className="h-3.5 w-3.5 text-purple-400" /> {t("community.linkedFreeBrainers")}
                        </div>
                        {post.linked_freebrainers && post.linked_freebrainers.length > 0 ? (
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {post.linked_freebrainers.map((fb) => (
                              <div key={fb.id} className="text-xs text-muted-foreground flex items-center gap-1.5 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                                <span className="font-medium text-foreground">{fb.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">{t("community.noLinkedListed")}</p>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}

                {getTypeBadge(post.type)}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {post.posted_by_name && post.posted_by_name !== post.author_name && (
                  <span className="text-primary/90 font-medium">
                    {t("community.postedBy", { name: post.posted_by_name })}
                  </span>
                )}
                <span>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {post.content && (
          <p className="text-sm md:text-base text-foreground/90 whitespace-pre-line leading-relaxed">
            {post.content}
          </p>
        )}

        {post.video_url && (
          <a
            href={post.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50 border border-white/10 text-xs text-primary hover:underline"
          >
            <Video className="h-4 w-4 shrink-0" />
            <span className="truncate">{post.video_url}</span>
          </a>
        )}

        {post.external_link && (
          <a
            href={post.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50 border border-white/10 text-xs text-blue-300 hover:underline"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span className="truncate">{post.external_link}</span>
          </a>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheerClick}
            disabled={cheered}
            className={`gap-1.5 text-xs h-8 ${
              cheered ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400"
            }`}
          >
            <Heart className={`h-4 w-4 ${cheered ? "fill-current" : ""}`} />
            <span>{cheersCount > 0 ? `${cheersCount} ${t("community.cheers")}` : t("community.giveCheer")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
