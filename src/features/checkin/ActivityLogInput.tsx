/**
 * ActivityLogInput — reusable inline activity log input (no Card wrapper).
 *
 * Used inside KeepMovingCard and BrainLoverJointCheckInCard to let users
 * log non-video activities after they've already checked in today.
 *
 * Posts to the `activity_log` table. Dev-bypass safe (localStorage fallback).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ActivityLogInputProps {
  patientId: string;
  patientName: string;
  brainloverId: string;
}

export function ActivityLogInput({ patientId, patientName, brainloverId }: ActivityLogInputProps) {
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
        console.warn("[FB-DEBUG] ActivityLogInput: insert failed, using localStorage fallback:", insertError);
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
    } catch {
      toast({ title: t("activityLog.error", "Failed to log"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
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
          size="sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground text-right mt-1">
        {content.length}/140
      </div>
    </div>
  );
}
