import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Loader2, ImagePlus, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { useToast } from "@/hooks/use-toast";

interface TeamProfileEditorProps {
  team: {
    id: string;
    name: string;
    slogan?: string | null;
    image_url?: string | null;
    code?: string | null;
  };
  onTeamUpdated: (updated: any) => void;
}

/**
 * Inline team profile editor — lets any team member set the team's
 * name, slogan, and image. Updates Supabase directly.
 *
 * Data tier: Tier 2 (Supabase) — team data is social/shared.
 */
export function TeamProfileEditor({ team, onTeamUpdated }: TeamProfileEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(team.name || "");
  const [slogan, setSlogan] = useState(team.slogan || "");
  const [imageUrl, setImageUrl] = useState(team.image_url || "");

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // ── Dev-bypass: simulate save locally ──
      if (isDevBypassUser(team.id) || team.id === "dev-team") {
        const mockData = { ...team, name, slogan, image_url: imageUrl };
        onTeamUpdated(mockData);
        setIsEditing(false);
        toast({
          title: t("teamProfile.savedTitle"),
          description: t("teamProfile.savedDesc"),
        });
        return;
      }

      // Cast to any to bypass strict type check for custom columns in teams table
      const { data, error } = await (supabase.from("teams" as any) as any)
        .update({ name, slogan, image_url: imageUrl })
        .eq("id", team.id)
        .select("*")
        .single();

      if (error) throw error;

      onTeamUpdated(data);
      setIsEditing(false);
      toast({
        title: t("teamProfile.savedTitle"),
        description: t("teamProfile.savedDesc"),
      });
    } catch (err: any) {
      toast({
        title: t("teamProfile.errorTitle"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [team, name, slogan, imageUrl, onTeamUpdated, toast, t]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 200;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          setImageUrl(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: t("teamProfile.uploadFailed"), variant: "destructive" });
    }
  }, [toast, t]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 w-full">
        <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover rounded-full" />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
              {name?.substring(0, 2).toUpperCase() || "TE"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">{name}</p>
          {slogan && (
            <p className="text-xs text-muted-foreground truncate italic">"{slogan}"</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1 text-xs"
          onClick={() => {
            setName(team.name || "");
            setSlogan(team.slogan || "");
            setImageUrl(team.image_url || "");
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" /> {t("teamProfile.edit")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover rounded-full" />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
              {name?.substring(0, 2).toUpperCase() || "TE"}
            </AvatarFallback>
          )}
        </Avatar>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" /> {t("teamProfile.changeImage")}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">{t("teamProfile.teamName")}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("teamProfile.namePlaceholder")}
          className="h-10 border-2"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">{t("teamProfile.slogan")}</Label>
        <Textarea
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
          placeholder={t("teamProfile.sloganPlaceholder")}
          className="border-2 text-sm min-h-[60px] resize-none"
          maxLength={120}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5 flex-1"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t("teamProfile.save")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(false)}
          disabled={isSaving}
        >
          {t("teamProfile.cancel")}
        </Button>
      </div>
    </div>
  );
}
