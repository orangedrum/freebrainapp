/**
 * SessionTestPanel.tsx
 *
 * Admin-only debug panel for injecting test sessions into the
 * `virtual_sessions` Supabase table. Lets admins verify the
 * VirtualSessionCalendar component in all states without
 * waiting for real Calendly bookings.
 *
 * Uses the real Supabase table (not mocks) so the actual component
 * behavior is tested. Test rows are tagged with
 * `calendly_event_id = 'TEST_*'` so they can be cleaned up easily.
 *
 * Tier 2 (social) data only — no sensitive data touched.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Clock, CalendarDays, CheckCircle2, Trash2, Webhook, Loader2 } from "lucide-react";

const SUPABASE_URL = "https://omcbwbhtjrozbgvzqdya.supabase.co";

export function SessionTestPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);

  // Use the logged-in user's actual email so test sessions match what
  // VirtualSessionCalendar queries (which uses user.email from AuthContext).
  const TEST_EMAIL = user?.email || "test@example.com";
  const TEST_NAME = user?.user_metadata?.full_name || user?.email || "Test User";
  const TEST_HOST = "Facilitator";

  const handleRegisterWebhook = async () => {
    setWebhookBusy(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/setup-calendly-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        toast({ title: t("adminTestPanel.webhookSuccess", { user: data.user || "" }) });
      } else {
        toast({ title: t("adminTestPanel.webhookError"), description: data.error || "", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t("adminTestPanel.webhookError"), description: err.message, variant: "destructive" });
    }
    setWebhookBusy(false);
  };

  const insertTestSession = async (startISO: string, status: string) => {
    setBusy(true);
    const testId = `TEST_${Date.now()}`;
    const { error } = await safeSupabaseQuery(() =>
      (supabase.from("virtual_sessions") as any).insert({
        freebrainer_email: TEST_EMAIL,
        freebrainer_name: TEST_NAME,
        brainlover_name: TEST_HOST,
        session_start: startISO,
        session_end: new Date(new Date(startISO).getTime() + 30 * 60000).toISOString(),
        status,
        join_url: "https://meet.google.com/test-session",
        calendly_event_id: testId,
      })
    );

    if (error) {
      toast({ title: t("adminTestPanel.error"), variant: "destructive" });
    } else {
      toast({ title: t("adminTestPanel.added") });
    }
    setBusy(false);
  };

  const handleAddIn5Min = () => {
    const start = new Date(Date.now() + 5 * 60000).toISOString();
    insertTestSession(start, "upcoming");
  };

  const handleAddIn2Days = () => {
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    insertTestSession(start, "upcoming");
  };

  const handleAddCompleted = () => {
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    insertTestSession(start, "completed");
  };

  const handleClearAll = async () => {
    setBusy(true);
    const { error } = await safeSupabaseQuery(() =>
      (supabase.from("virtual_sessions") as any)
        .delete()
        .like("calendly_event_id", "TEST_%")
    );

    if (error) {
      toast({ title: t("adminTestPanel.error"), variant: "destructive" });
    } else {
      toast({ title: t("adminTestPanel.cleared") });
    }
    setBusy(false);
  };

  return (
    <Card className="border-2 border-warning/30 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <FlaskConical className="h-5 w-5" />
          {t("adminTestPanel.title")}
        </CardTitle>
        <CardDescription>{t("adminTestPanel.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          onClick={handleRegisterWebhook}
          disabled={webhookBusy}
          variant="default"
          className="gap-2 text-sm col-span-full sm:col-span-2 bg-indigo-600 hover:bg-indigo-700"
        >
          {webhookBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
          {t("adminTestPanel.registerWebhook")}
        </Button>
        <Button onClick={handleAddIn5Min} disabled={busy} variant="outline" className="gap-2 text-sm">
          <Clock className="h-4 w-4" />
          {t("adminTestPanel.addIn5Min")}
        </Button>
        <Button onClick={handleAddIn2Days} disabled={busy} variant="outline" className="gap-2 text-sm">
          <CalendarDays className="h-4 w-4" />
          {t("adminTestPanel.addIn2Days")}
        </Button>
        <Button onClick={handleAddCompleted} disabled={busy} variant="outline" className="gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {t("adminTestPanel.addCompleted")}
        </Button>
        <Button onClick={handleClearAll} disabled={busy} variant="destructive" className="gap-2 text-sm">
          <Trash2 className="h-4 w-4" />
          {t("adminTestPanel.clearAll")}
        </Button>
      </CardContent>
    </Card>
  );
}
