import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Youtube, Plus, Trash2, CheckCircle2, Play, Loader2, Globe, Video, RefreshCw } from "lucide-react";
import {
  getStoredPlaylists,
  getCachedPlaylists,
  getActivePlaylistIds,
  getCachedActivePlaylistIds,
  setActivePlaylistIds,
  addYouTubePlaylist,
  removeYouTubePlaylist,
  getGlobalDefaultPlaylistIds,
  toggleGlobalDefault,
  forceSyncAllPlaylistsToSupabase,
  YouTubePlaylist,
  getStoredSingleVideos,
  getActiveSingleVideoIds,
  toggleActiveSingleVideo,
  addYouTubeVideo,
  removeYouTubeVideo,
  YouTubeSingleVideo,
} from "@/lib/youtube";
import { useToast } from "@/hooks/use-toast";

interface PlaylistManagerProps {
  isAdmin?: boolean;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ isAdmin = false }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // ─── State (declared BEFORE any conditional return to respect hooks rules) ──
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [globalDefaults, setGlobalDefaults] = useState<string[]>([]);
  const [newInput, setNewInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Individual video state
  const [singleVideos, setSingleVideos] = useState<YouTubeSingleVideo[]>([]);
  const [activeVideoIds, setActiveVideoIds] = useState<string[]>([]);
  const [newVideoInput, setNewVideoInput] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ─── Defense in depth: non-admins see nothing ───────────────────
  // The page-level gate in Profile.tsx already hides this component for
  // non-admins, but we enforce it here too so accidental renders anywhere
  // else can never expose playlist CRUD to non-admin users.
  // NOTE: This return is AFTER all hooks so React's rules of hooks are respected.
  if (!isAdmin) return null;

  useEffect(() => {
    refreshPlaylists();
    refreshSingleVideos();
  }, []);

  const refreshPlaylists = async () => {
    // Show cached instantly, then fetch from Supabase
    setPlaylists(getCachedPlaylists());
    setActiveIds(getCachedActivePlaylistIds());
    const [playlists, activeIds, globals] = await Promise.all([
      getStoredPlaylists(),
      getActivePlaylistIds(),
      getGlobalDefaultPlaylistIds(),
    ]);
    setPlaylists(playlists);
    setActiveIds(activeIds);
    setGlobalDefaults(globals);
  };

  const refreshSingleVideos = async () => {
    const [videos, activeVideoIds] = await Promise.all([
      getStoredSingleVideos(),
      getActiveSingleVideoIds(),
    ]);
    setSingleVideos(videos);
    setActiveVideoIds(activeVideoIds);
  };


  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const report = await forceSyncAllPlaylistsToSupabase();
      await refreshPlaylists();
      if (report.failed.length > 0) {
        toast({
          title: t("playlistManager.syncPartialTitle", "Sync Partially Failed"),
          description: `${report.synced.length} synced, ${report.failed.length} failed. Check console for [FB-DEBUG] details. RLS may be blocking inserts.`,
          variant: "destructive",
        });
      } else if (report.synced.length > 0) {
        toast({
          title: t("playlistManager.syncSuccessTitle", "Playlists Synced to Cloud"),
          description: `${report.synced.length} playlist(s) are now visible to all devices.`,
        });
      } else {
        toast({
          title: t("playlistManager.syncNoopTitle", "Already in Sync"),
          description: t("playlistManager.syncNoopDesc", "All playlists are already in Supabase."),
        });
      }
    } catch (e: any) {
      toast({
        title: t("playlistManager.syncErrorTitle", "Sync Failed"),
        description: e.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleActive = async (id: string) => {
    // With the new model, is_active is toggled directly on the playlists table.
    // We just flip the flag for this one playlist.
    const current = await getActivePlaylistIds();
    const isCurrentlyActive = current.includes(id);
    const updated = isCurrentlyActive
      ? current.filter((i) => i !== id)
      : [...current, id];
    if (updated.length === 0) {
      toast({
        title: t("playlistManager.needActiveTitle", "At least one playlist needed"),
        description: t("playlistManager.needActiveDesc", "Please keep at least one playlist active."),
        variant: "destructive",
      });
      return;
    }
    await setActivePlaylistIds(updated);
    setActiveIds(updated);
    // Clear video cache so check-in picks up the change
    const { clearPlaylistVideoCache } = await import("@/lib/youtube/selection");
    clearPlaylistVideoCache();
    toast({
      title: t("playlistManager.activeUpdatedTitle", "Active Playlists Updated"),
      description: t("playlistManager.activeUpdatedDesc", "{{count}} playlist(s) will power your check-ins.", { count: updated.length }),
    });
  };

  const handleToggleGlobalDefault = async (id: string) => {
    const updated = await toggleGlobalDefault(id);
    setGlobalDefaults(updated);
    toast({
      title: t("playlistManager.globalUpdatedTitle", "Global Defaults Updated"),
      description: t("playlistManager.globalUpdatedDesc", "New users will see these playlists by default."),
    });
  };
  const handleRemove = async (playlist: YouTubePlaylist) => {
    await removeYouTubePlaylist(playlist.id);
    await refreshPlaylists();
    toast({
      title: t("playlistManager.removedTitle", "Playlist Removed"),
      description: t("playlistManager.removedDesc", "Removed \"{{title}}\".", { title: playlist.title }),
    });
  };

  // ─── Individual video handlers ────────────────────────────────

  const handleToggleVideo = async (id: string) => {
    const updated = await toggleActiveSingleVideo(id);
    setActiveVideoIds(updated);
    // Clear video cache so check-in picks up the change
    const { clearPlaylistVideoCache } = await import("@/lib/youtube/selection");
    clearPlaylistVideoCache();
    toast({
      title: t("playlistManager.videoActiveUpdatedTitle", "Video Selection Updated"),
      description: t("playlistManager.videoActiveUpdatedDesc", "{{count}} individual video(s) will power your check-ins.", { count: updated.length }),
    });
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoInput.trim()) return;

    setIsAddingVideo(true);
    try {
      const created = await addYouTubeVideo(newVideoInput.trim());
      setNewVideoInput("");
      await refreshSingleVideos();
      toast({
        title: t("playlistManager.videoAddedTitle", "Video Added!"),
        description: t("playlistManager.videoAddedDesc", "Successfully added \"{{title}}\" and set it as active.", { title: created.title }),
      });
    } catch (err: any) {
      toast({
        title: t("playlistManager.videoAddErrorTitle", "Could not add video"),
        description: err.message || t("playlistManager.videoAddErrorDesc", "Please check the YouTube URL or Video ID and try again."),
        variant: "destructive",
      });
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleRemoveVideo = async (video: YouTubeSingleVideo) => {
    await removeYouTubeVideo(video.id);
    await refreshSingleVideos();
    toast({
      title: t("playlistManager.videoRemovedTitle", "Video Removed"),
      description: t("playlistManager.videoRemovedDesc", "Removed \"{{title}}\".", { title: video.title }),
    });
  };

  const handleAddPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInput.trim()) return;

    setIsAdding(true);
    try {
      const created = await addYouTubePlaylist(newInput.trim());
      setNewInput("");
      await refreshPlaylists();
      toast({
        title: t("playlistManager.addedTitle", "Playlist Added!"),
        description: t("playlistManager.addedDesc", "Successfully added \"{{title}}\" and set it as active.", { title: created.title }),
      });
    } catch (err: any) {
      toast({
        title: t("playlistManager.addErrorTitle", "Could not add playlist"),
        description: err.message || t("playlistManager.addErrorDesc", "Please check the YouTube URL or Playlist ID and try again."),
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl border space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg shrink-0">
            <Youtube className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold break-words">{t("playlistManager.title", "YouTube Movement Playlists")}</h3>
            <p className="text-sm text-muted-foreground break-words">
              {t("playlistManager.subtitle", "Add any public YouTube playlist to power your daily check-in videos.")}
            </p>
          </div>
        </div>
      </div>

      {/* Add Playlist Form */}
      <form onSubmit={handleAddPlaylist} className="space-y-3">
        <Label className="font-semibold text-sm">{t("playlistManager.addLabel", "Add New YouTube Playlist")}</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t("playlistManager.inputPlaceholder", "Paste Playlist URL or ID (e.g., https://youtube.com/playlist?list=PL...)")}
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isAdding || !newInput.trim()} className="shrink-0">
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" /> {t("playlistManager.addBtn", "Add")}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground break-words">
          {t("playlistManager.hint", "Works with any public YouTube playlist. Videos are randomly picked for daily check-ins. Select multiple to create variety!")}
        </p>
      </form>

      {/* Playlist List with multi-select */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-sm">{t("playlistManager.availableLabel", "Available Playlists")}</Label>
          <Badge variant="secondary" className="text-[11px]">
            {activeIds.length} {t("playlistManager.active", "active")}
          </Badge>
        </div>
        <div className="grid gap-3">
          {playlists.map((playlist) => {
            const isActive = activeIds.includes(playlist.id);
            const isGlobal = globalDefaults.includes(playlist.id);
            return (
              <div
                key={playlist.id}
                className={`flex items-start justify-between p-4 rounded-lg border transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm break-words">{playlist.title}</span>
                    {isActive && (
                      <Badge variant="default" className="gap-1 text-[11px] py-0 px-2 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> {t("playlistManager.activeBadge", "Active")}
                      </Badge>
                    )}
                    {isGlobal && (
                      <Badge variant="secondary" className="gap-1 text-[11px] py-0 px-2 bg-blue-500/10 text-blue-500 border-blue-500/20 shrink-0">
                        <Globe className="h-3 w-3" /> {t("playlistManager.globalBadge", "Global Default")}
                      </Badge>
                    )}
                  </div>
                  {playlist.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                      {playlist.description}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground font-mono break-all">
                    ID: {playlist.id}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => toggleActive(playlist.id)}
                    className="text-xs"
                  >
                    {isActive ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("playlistManager.selected", "Selected")}</>
                    ) : (
                      <><Play className="h-3.5 w-3.5 mr-1" /> {t("playlistManager.select", "Select")}</>
                    )}
                  </Button>

                  {isAdmin && (
                    <Button
                      size="sm"
                      variant={isGlobal ? "default" : "ghost"}
                      onClick={() => handleToggleGlobalDefault(playlist.id)}
                      title={t("playlistManager.globalToggleTitle", "Toggle global default for all users")}
                      className={`text-xs ${isGlobal ? "bg-blue-500 text-white hover:bg-blue-600" : "text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"}`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {playlist.isCustom && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(playlist)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Individual Videos Section ─────────────────────────── */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg shrink-0">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm break-words">{t("playlistManager.videosTitle", "Individual Movement Videos")}</h4>
            <p className="text-xs text-muted-foreground break-words">
              {t("playlistManager.videosSubtitle", "Add specific YouTube videos alongside your playlists for more variety.")}
            </p>
          </div>
        </div>

        {/* Add video form */}
        <form onSubmit={handleAddVideo} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={t("playlistManager.videoInputPlaceholder", "Paste YouTube Video or Shorts URL (e.g., https://youtu.be/... or https://youtube.com/shorts/...)")}
              value={newVideoInput}
              onChange={(e) => setNewVideoInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isAddingVideo || !newVideoInput.trim()} className="shrink-0">
              {isAddingVideo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" /> {t("playlistManager.videoAddBtn", "Add Video")}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Video list */}
        {singleVideos.length > 0 && (
          <div className="grid gap-2 pt-1">
            {singleVideos.map((video) => {
              const isVideoActive = activeVideoIds.includes(video.id);
              return (
                <div
                  key={video.id}
                  className={`flex items-start justify-between p-3 rounded-lg border transition-all ${
                    isVideoActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-10 w-16 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-xs break-words block">{video.title}</span>
                        <p className="text-[10px] text-muted-foreground font-mono break-all">
                          ID: {video.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant={isVideoActive ? "default" : "outline"}
                      onClick={() => handleToggleVideo(video.id)}
                      className="text-xs h-8 px-2"
                    >
                      {isVideoActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      onClick={() => handleRemoveVideo(video)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {singleVideos.length === 0 && (
          <p className="text-xs text-muted-foreground italic break-words">
            {t("playlistManager.noVideosYet", "No individual videos added yet. Add specific YouTube videos above.")}
          </p>
        )}
      </div>

      {/* Admin global defaults info */}
      {isAdmin && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="break-words">{t("playlistManager.adminSectionTitle", "Admin: Global Default Playlists")}</span>
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {t("playlistManager.adminSectionDesc", "Click the globe icon on any playlist to set it as a global default. New users will automatically see these playlists. Users can still add their own on top.")}
          </p>
          {globalDefaults.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {globalDefaults.map((id) => {
                const pl = playlists.find((p) => p.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1 text-[11px] bg-blue-500/10 text-blue-500 border-blue-500/20 max-w-full">
                    <Globe className="h-3 w-3 shrink-0" /> <span className="truncate">{pl?.title || id.slice(0, 12)}</span>
                  </Badge>
                );
              })}
            </div>
          )}
          {/* Force Sync button — pushes localStorage playlists to Supabase */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="w-full gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isSyncing
                ? t("playlistManager.syncing", "Syncing...")
                : t("playlistManager.forceSyncBtn", "Force Sync All Playlists to Cloud")}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1 break-words">
              {t("playlistManager.forceSyncDesc", "Pushes any localStorage-only playlists to Supabase so all devices can see them. Check console for details.")}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
