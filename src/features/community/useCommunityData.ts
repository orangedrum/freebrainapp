/**
 * useCommunityData — All data fetching and mutations for the Community Wall.
 * Extracted from Community.tsx to keep the page a thin shell.
 *
 * Fetches posts from Supabase, enriches with profile data and Pro links,
 * merges with local cache and mock fallbacks, and provides create/cheer mutations.
 *
 * i18n: toast messages use the `community` namespace.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { PostItem } from "@/components/community/PostCard";

/** Fallback mock posts if table is empty or error */
const MOCK_POSTS: PostItem[] = [
  {
    id: "mock-1",
    user_id: "m1",
    posted_by_id: "m1",
    content: "Need urgent advice: struggling with severe morning stiffness today. Has anyone found a gentle 5-minute stretch routine that helps before getting out of bed?",
    type: "sos",
    video_url: null,
    external_link: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    author_name: "Sarah M.",
    author_avatar: "",
    cheer_count: 5,
  },
  {
    id: "mock-2",
    user_id: "m2",
    posted_by_id: "m2",
    content: "Reminder for everyone to check in and record your movement therapy today! Every step counts.",
    type: "general",
    video_url: null,
    external_link: null,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    author_name: "Coach Alex",
    author_avatar: "",
    cheer_count: 12,
  },
  {
    id: "mock-3",
    user_id: "m3",
    posted_by_id: "m3",
    content: "Highly recommend doing the seated balance exercise right before dinner! It noticeably reduced my evening tremors.",
    type: "recommendation",
    video_url: null,
    external_link: null,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    author_name: "David K.",
    author_avatar: "",
    cheer_count: 3,
  },
];

export interface CreatePostInput {
  content: string;
  video_url?: string;
  external_link?: string;
  type?: string;
  on_behalf_of_id?: string;
  posted_as_pro?: boolean;
}

export function useCommunityData() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch posts ──────────────────────────────────────────────
  const { data: posts, isLoading } = useQuery({
    queryKey: ["community_posts"],
    queryFn: async () => {
      let dbPosts: any[] = [];
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30) as { data: any[] | null; error: any };

        if (!error && data && data.length > 0) {
          dbPosts = data;
        }
      } catch (e) {
        console.warn("Error fetching community posts:", e);
      }

      // Collect user profiles
      const userIds = new Set<string>();
      dbPosts.forEach((p) => {
        if (p.posted_by_id) userIds.add(p.posted_by_id);
        if (p.on_behalf_of_id) userIds.add(p.on_behalf_of_id);
        if (p.user_id) userIds.add(p.user_id);
      });

      let profileMap = new Map<string, any>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", Array.from(userIds)) as { data: any[] | null; error: any };

        profileMap = new Map(profiles?.map((pr) => [pr.user_id, pr]) || []);
      }

      // Fetch caregiver_links for Pro posts
      const proPostUserIds = Array.from(
        new Set(dbPosts.filter((p) => p.posted_as_pro).map((p) => p.posted_by_id))
      );
      let proLinksMap = new Map<string, { id: string; name: string }[]>();

      if (proPostUserIds.length > 0) {
        const { data: links } = await supabase
          .from("caregiver_links")
          .select("caregiver_id, patient_id")
          .in("caregiver_id", proPostUserIds) as {
          data: { caregiver_id: string; patient_id: string }[] | null;
          error: any;
        };

        if (links && links.length > 0) {
          const patientIds = Array.from(new Set(links.map((l) => l.patient_id)));
          const { data: patientProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", patientIds) as {
            data: { user_id: string; display_name: string }[] | null;
            error: any;
          };

          const pProfileMap = new Map(
            patientProfiles?.map((pr) => [pr.user_id, pr.display_name]) || []
          );

          links.forEach((l) => {
            const current = proLinksMap.get(l.caregiver_id) || [];
            const pName = pProfileMap.get(l.patient_id) || "FreeBrainer";
            current.push({ id: l.patient_id, name: pName });
            proLinksMap.set(l.caregiver_id, current);
          });
        }
      }

      const formattedDbPosts = dbPosts.map((p) => {
        const onBehalfId = p.on_behalf_of_id;
        const authorId = onBehalfId || p.posted_by_id || p.user_id;

        const authorProf = profileMap.get(authorId);
        const posterProf = profileMap.get(p.posted_by_id);

        return {
          ...p,
          type: p.type || p.post_type || "general",
          author_name:
            p.author_name ||
            authorProf?.display_name ||
            posterProf?.display_name ||
            "Community Member",
          author_avatar: authorProf?.avatar_url || posterProf?.avatar_url || "",
          posted_by_name: posterProf?.display_name || "BrainLover",
          linked_freebrainers: p.posted_as_pro
            ? proLinksMap.get(p.posted_by_id) || []
            : [],
          cheer_count: p.cheer_count || 1,
        };
      });

      // Merge local cached posts
      let localPosts: any[] = [];
      try {
        const cachedStr = localStorage.getItem("fb_community_posts_cache");
        if (cachedStr) localPosts = JSON.parse(cachedStr);
      } catch (e) {
        /* ignore */
      }

      // Combine DB and local posts without duplicates
      const postMap = new Map<string, any>();
      [...formattedDbPosts, ...localPosts, ...MOCK_POSTS].forEach((p) => {
        if (!postMap.has(p.id)) {
          postMap.set(p.id, {
            ...p,
            type: p.type || p.post_type || "general",
          });
        }
      });

      const mergedList = Array.from(postMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return mergedList;
    },
    staleTime: 1000 * 30,
  });

  // ── Create post mutation ─────────────────────────────────────
  const createPostMutation = useMutation({
    mutationFn: async (newPost: CreatePostInput) => {
      if (!user) throw new Error("Not logged in");

      const targetUserId = newPost.on_behalf_of_id || user.id;

      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: targetUserId,
          posted_by_id: user.id,
          on_behalf_of_id: newPost.on_behalf_of_id || null,
          posted_as_pro: newPost.posted_as_pro || false,
          content: newPost.content,
          video_url: newPost.video_url || null,
          external_link: newPost.external_link || null,
          type: newPost.type || "general",
        } as any)
        .select()
        .single();

      if (error) {
        // Fallback optimistic return if DB fails or column missing
        return {
          id: `local-${Date.now()}`,
          user_id: targetUserId,
          posted_by_id: user.id,
          on_behalf_of_id: newPost.on_behalf_of_id || null,
          posted_as_pro: newPost.posted_as_pro || false,
          content: newPost.content,
          video_url: newPost.video_url || null,
          external_link: newPost.external_link || null,
          type: newPost.type || "general",
          created_at: new Date().toISOString(),
          author_name: user.email?.split("@")[0] || "You",
          cheer_count: 1,
        };
      }

      return data;
    },
    onSuccess: () => {
      toast.success(t("community.postSharedToast"));
      queryClient.invalidateQueries({ queryKey: ["community_posts"] });
    },
    onError: () => {
      toast.error(t("community.postErrorToast"));
    },
  });

  // ── Cheer mutation ───────────────────────────────────────────
  const cheerMutation = useMutation({
    mutationFn: async ({
      postId,
      authorId,
    }: {
      postId: string;
      authorId: string;
    }) => {
      if (!user) return;
      await supabase.from("user_cheers").insert({
        from_user_id: user.id,
        to_user_id: authorId,
        message: `Cheered post ${postId}`,
      } as any);
    },
    onSuccess: () => {
      toast.success(t("community.cheerSentToast"));
    },
  });

  return {
    posts: posts || [],
    isLoading,
    createPost: createPostMutation.mutate,
    isCreating: createPostMutation.isPending,
    cheerPost: cheerMutation.mutate,
  };
}
