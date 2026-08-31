import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, RotateCcw, Activity, Trash2 } from "lucide-react";
import { PlaylistManager } from "@/components/profile/PlaylistManager";
import { SessionTestPanel } from "@/features/profile/SessionTestPanel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { isDevBypassUser, clearDevCheckIn, isDevBypassMode, seedMockTables } from "@/lib/devBypass";

/** Clear all caches (localStorage + service worker + browser cache) and hard-reload. */
async function clearAllCachesAndReload() {
  // 1. Clear all localStorage
  localStorage.clear();

  // 2. Unregister all service workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }

  // 3. Clear Cache Storage API (used by vite-plugin-pwa)
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  // 4. Hard reload (bypass cache)
  window.location.reload();
}

/**
 * Admin-only controls page — fully decoupled from Profile.
 *
 * Accessible only from the admin drawer sidebar link.
 * Contains: Reset Check-in, Playlist Manager, Session Test Panel.
 */
export default function AdminControls() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex justify-center p-8">
        {t("adminControls.notAuthorized", "Admin access required.")}
      </div>
    );
  }

  const handleResetCheckIn = async () => {
    if (!user) return;
    if (isDevBypassUser(user?.id) || isDevBypassMode()) {
      // Dev-bypass mode: clear ALL localStorage check-in markers
      // 1. Clear the admin's own dev check-in
      clearDevCheckIn();
      // 2. Clear all mock patient check-ins for today
      const today = format(new Date(), "yyyy-MM-dd");
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("fb_mock_checkin_") && key.endsWith(today)) {
          localStorage.removeItem(key);
        }
      });
      // 3. Clear the mock daily_checkins table so the dashboard re-reads fresh
      localStorage.removeItem("dev_table_daily_checkins");
      seedMockTables();
      toast({
        title: t("checkin.resetTitle", "Check-in reset"),
        description: t("checkin.resetDesc", "You can now check in again."),
      });
      return;
    }
    setResetting(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await (supabase.from("daily_checkins") as any)
        .delete()
        .eq("user_id", user.id)
        .eq("checkin_date", today);
      toast({
        title: t("checkin.resetTitle", "Check-in reset"),
        description: t("checkin.resetDesc", "You can now check in again."),
      });
    } catch (err: any) {
      toast({
        title: t("checkin.resetError", "Error resetting"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-bold">
            {t("adminControls.title", "Admin Controls")}
          </h1>
          <p className="text-muted-foreground">
            {t("adminControls.subtitle", "Manage playlists, test sessions, and reset data.")}
          </p>
        </div>
      </div>

      {/* Reset Check-in */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Activity className="h-5 w-5" />
            {t("profile.adminTools", "Admin Tools")}
          </CardTitle>
          <CardDescription>
            {t("profile.adminToolsDesc", "Manage global playlists and videos for all FreeBrainers.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCheckIn}
            disabled={resetting}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("checkin.resetAdmin", "Reset Check-in (Admin)")}
          </Button>
        </CardContent>
      </Card>

      {/* Playlist Manager */}
      <PlaylistManager isAdmin={true} />

      {/* Session Test Panel */}
      <SessionTestPanel />

      {/* Clear All Caches & Reload */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("adminControls.clearCacheTitle", "Clear All Caches & Reload")}
          </CardTitle>
          <CardDescription>
            {t("adminControls.clearCacheDesc", "Wipes localStorage, service workers, and browser cache. The app will hard-reload immediately. Use this to force all users onto the latest version.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearAllCachesAndReload()}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("adminControls.clearCacheButton", "Clear & Reload")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
