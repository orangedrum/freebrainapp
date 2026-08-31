/**
 * Community — Community Wall page (thin shell).
 *
 * All data fetching/mutations live in `useCommunityData`.
 * All UI sub-components (CommunityHeader, PostCard, CreatePostModal, TeamRankAlertCard) are modular.
 * Auto-detects team rank changes via `useTeamRankWatcher`.
 * i18n namespace: `community`
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { PostCard } from "@/components/community/PostCard";
import { TeamRankAlertCard } from "@/components/community/TeamRankAlertCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareOff } from "lucide-react";
import { useCommunityData } from "@/features/community/useCommunityData";
import { useTeamRankWatcher } from "@/features/community/useTeamRankWatcher";

export default function Community() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const { posts, isLoading, createPost, isCreating, cheerPost } = useCommunityData();

  // Auto-detect team rank changes and create community posts
  useTeamRankWatcher();

  const filteredPosts = posts.filter((p) => {
    if (activeFilter === "sos") return p.type === "sos";
    if (activeFilter === "recommendations") return p.type === "recommendation";
    return true;
  });

  return (
    <div className="space-y-6">
      <CommunityHeader
        onNewPost={() => setIsModalOpen(true)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/40 border-white/10">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="bg-card/40 border-white/10 text-center p-8">
          <CardContent className="space-y-3 pt-4">
            <MessageSquareOff className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold">{t("community.noPostsTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("community.noPostsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) =>
            post.type === "team_rank_change" ? (
              <TeamRankAlertCard
                key={post.id}
                post={post}
                onCheer={(postId, authorId) => cheerPost({ postId, authorId })}
              />
            ) : (
              <PostCard
                key={post.id}
                post={post}
                onCheer={(postId, authorId) => cheerPost({ postId, authorId })}
              />
            )
          )}
        </div>
      )}

      <CreatePostModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={(data) => createPost(data)}
        isSubmitting={isCreating}
      />
    </div>
  );
}
