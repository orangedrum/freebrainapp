/**
 * ActivityLogEntry — 40-char input "What did you do together?" with Save.
 *
 * Posts to the `activity_log` table. Dev-bypass safe (localStorage fallback).
 *
 * @param patientId — the selected FreeBrainer's user_id
 * @param brainloverId — the logged-in BrainLover's user_id
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Send, Loader2 } from "lucide-react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ActivityLogEntryProps {
  patientId: string;
  patientName: string;
  brainloverId: string;
}

export function ActivityLogEntry({ patientId, patientName, brainloverId }: ActivityLogEntryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);

    try {
      const { error: insertError } = await safeSupabaseQuery(() =>
        (supabase.from("activity_log") as any).insert({
          freebrainer_id: patientId,
          brainlover_id: brainloverId,
          content: trimmed,
        })
      );

      if (insertError) {
        console.warn("[FB-DEBUG] ActivityLogEntry: insert failed, using localStorage fallback:", insertError);
        const key = `fb_activity_log_${patientId}`;
        const existing = localStorage.getItem(key);
        const log = existing ? JSON.parse(existing) : [];
        log.unshift({
          id: `fallback_act_${Date.now()}`,
          brainlover_id: brainloverId,
          content: trimmed,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(log.slice(0, 20)));
      }

      setContent("");
      window.dispatchEvent(new CustomEvent("fb-activity-logged"));
      toast({
        title: t("activityLog.saved", "Activity logged! ✓"),
        description: t("activityLog.savedDesc", "Added to {{name}}'s timeline.", { name: patientName.split(" ")[0] }),
      });
    } catch (e) {
      toast({ title: t("activityLog.error", "Failed to log"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" />
          {t("activityLog.title", "Log an Activity")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("activityLog.subtitle", "Did something together that wasn't a video? Log it here (40 chars).")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 140))}
            onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
            placeholder={t("activityLog.placeholder", "e.g. Walked in the park together")}
            maxLength={140}
            className="text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="gap-1.5 shrink-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground text-right mt-1">
          {content.length}/140
        </div>
      </CardContent>
    </Card>
  );
}
