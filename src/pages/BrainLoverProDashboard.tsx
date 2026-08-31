import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BrainLoverBase } from "@/features/brainlover/BrainLoverBase";
import { ProBulkInvitePanel } from "@/features/pro/ProBulkInvitePanel";
import { ProSubAccountManager } from "@/features/pro/ProSubAccountManager";
import { ProFacilityOverview } from "@/features/pro/ProFacilityOverview";
import { ProRosterTable } from "@/features/pro/ProRosterTable";
import { ProFreeBrainerDetailDrawer } from "@/features/pro/ProFreeBrainerDetailDrawer";
import { useProRosterData, type RosterEntry } from "@/features/pro/useProRosterData";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function BrainLoverProDashboard() {
  const { user } = useAuth();
  const pwa = usePWAInstall();

  // Pro-only: shared roster data for facility overview + roster table + drawer
  const { roster, isLoading: rosterLoading, stats: rosterStats } =
    useProRosterData(user?.id);
  const [drawerEntry, setDrawerEntry] = useState<RosterEntry | null>(null);

  return (
    <div className="space-y-6 pb-20 text-foreground">
      <InstallBanner
        platform={pwa.platform}
        isInstalled={pwa.isInstalled}
        shouldShowBanner={pwa.shouldShowBanner()}
        canInstall={pwa.canInstall}
        userEmail={user?.email || ""}
        onPromptInstall={pwa.promptInstall}
        onDismiss={pwa.markBannerDismissed}
      />

      {/* Shared BrainLover sections (selector, status, insights, schedule) */}
      <BrainLoverBase showBulkInvite />

      {/* Pro-only: facility overview + roster table */}
      <ProFacilityOverview stats={rosterStats} isLoading={rosterLoading} />
      <ProRosterTable
        roster={roster}
        isLoading={rosterLoading}
        onRowClick={(entry) => setDrawerEntry(entry)}
      />

      {/* Pro-only: bulk invite + sub-account management */}
      {user && (
        <>
          <ProBulkInvitePanel proId={user.id} />
          <ProSubAccountManager proId={user.id} />
        </>
      )}

      {/* Pro detail drawer */}
      <ProFreeBrainerDetailDrawer
        open={drawerEntry !== null}
        onOpenChange={(open) => { if (!open) setDrawerEntry(null); }}
        freeBrainerId={drawerEntry?.user_id ?? null}
        freeBrainerName={drawerEntry?.display_name ?? null}
        freeBrainerCondition={drawerEntry?.condition ?? null}
      />
    </div>
  );
}
