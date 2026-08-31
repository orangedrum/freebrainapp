/**
 * CreatePostModal — Shared community post creation modal.
 * Used by all roles. BrainLovers/Pros see a FreeBrainer selector dropdown
 * to post on behalf of a specific FreeBrainer.
 *
 * Speech recognition is handled by the reusable `useSpeechRecognition` hook.
 * FreeBrainer list is fetched by `useLinkedFreeBrainers` hook.
 *
 * i18n namespace: `createPost`
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setCheckInProgressGlobal } from "@/hooks/usePWAUpdate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Video, Link as LinkIcon, Users, ShieldCheck, Mic, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLinkedFreeBrainers } from "@/features/community/useLinkedFreeBrainers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LinkedFreeBrainer {
  id: string;
  display_name: string;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    content: string;
    video_url?: string;
    external_link?: string;
    type?: string;
    on_behalf_of_id?: string;
    posted_as_pro?: boolean;
  }) => void;
  isSubmitting?: boolean;
}

export function CreatePostModal({ open, onOpenChange, onSubmit, isSubmitting }: CreatePostModalProps) {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [postType, setPostType] = useState<"sos" | "general" | "recommendation">("sos");
  const [selectedFreeBrainerId, setSelectedFreeBrainerId] = useState<string>("");
  const [postAsPro, setPostAsPro] = useState(false);

  // Defer PWA updates while the post modal is open (typing, dictation, video links).
  useEffect(() => {
    if (open) {
      setCheckInProgressGlobal(true);
    } else {
      setCheckInProgressGlobal(false);
    }
    return () => setCheckInProgressGlobal(false);
  }, [open]);

  const { freeBrainers, isCaregiver } = useLinkedFreeBrainers(open);
  const isPro = userRole === "caregiver_pro" || userRole === "admin";

  const { isListening, toggle } = useSpeechRecognition({
    getInitialText: () => content,
    unsupportedMessage: t("rally.voiceNotSupportedDesc"),
  });

  // Auto-select first FreeBrainer when list loads
  if (freeBrainers.length > 0 && !selectedFreeBrainerId) {
    setSelectedFreeBrainerId(freeBrainers[0].id);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSubmit({
      content: content.trim(),
      video_url: videoUrl.trim() || undefined,
      external_link: externalLink.trim() || undefined,
      type: postType,
      on_behalf_of_id: isCaregiver && !postAsPro ? selectedFreeBrainerId : undefined,
      posted_as_pro: isPro ? postAsPro : false,
    });
    setContent("");
    setVideoUrl("");
    setExternalLink("");
    onOpenChange(false);
  };

  const postTypes = [
    { id: "sos", label: t("createPost.typeSos") },
    { id: "general", label: t("createPost.typeUpdate") },
    { id: "recommendation", label: t("createPost.typeRecommendation") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-heading">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            {t("createPost.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {isCaregiver && (
            <div className="space-y-2 bg-primary/10 border border-primary/20 p-3 rounded-lg">
              <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {t("createPost.postAsLabel")}
              </Label>
              {isPro && (
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPostAsPro(false)}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border transition-colors ${!postAsPro ? "bg-primary text-primary-foreground border-primary" : "bg-background/50 border-white/10 text-muted-foreground"}`}
                  >
                    {t("createPost.asFreeBrainer")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostAsPro(true)}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${postAsPro ? "bg-primary text-primary-foreground border-primary" : "bg-background/50 border-white/10 text-muted-foreground"}`}
                  >
                    <ShieldCheck className="h-3 w-3" /> {t("createPost.asBrainLoverPro")}
                  </button>
                </div>
              )}

              {!postAsPro && (
                freeBrainers.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">{t("createPost.selectFreeBrainer")}</span>
                    <Select value={selectedFreeBrainerId} onValueChange={setSelectedFreeBrainerId}>
                      <SelectTrigger className="h-9 text-xs bg-background/60 border-white/10">
                        <SelectValue placeholder={t("createPost.selectFreeBrainerPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {freeBrainers.map((fb) => (
                          <SelectItem key={fb.id} value={fb.id} className="text-xs">
                            {fb.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("createPost.noLinkedFreeBrainers")}
                  </p>
                )
              )}
              {postAsPro && (
                <p className="text-[11px] text-muted-foreground">
                  {t("createPost.postingAsPro")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("createPost.postTypeLabel")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {postTypes.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPostType(pt.id as any)}
                  className={`p-2 rounded-md border text-xs font-semibold text-center transition-all ${
                    postType === pt.id
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-white/10 text-muted-foreground hover:border-white/30"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-content" className="text-sm font-medium">{t("createPost.yourMessage")}</Label>
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={() => toggle(setContent)}
                className="h-7 text-xs gap-1.5 border-white/20"
              >
                {isListening ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-red-400" />
                    <span>{t("createPost.listening")}</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span>{t("createPost.dictateVoice")}</span>
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="post-content"
              placeholder={t("createPost.messagePlaceholder")}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="bg-background/50 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-url" className="text-xs text-muted-foreground flex items-center gap-1">
              <Video className="h-3.5 w-3.5" /> {t("createPost.videoLinkLabel")}
            </Label>
            <Input
              id="video-url"
              placeholder="https://..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="bg-background/50 border-white/10 text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ext-link" className="text-xs text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5" /> {t("createPost.resourceLinkLabel")}
            </Label>
            <Input
              id="ext-link"
              placeholder="https://..."
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              className="bg-background/50 border-white/10 text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10"
            >
              {t("createPost.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? t("createPost.posting") : t("createPost.postToWall")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
