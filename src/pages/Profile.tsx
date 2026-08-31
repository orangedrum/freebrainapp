import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, LogOut, Activity, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { FavoriteMovementsEditor } from "@/components/profile/FavoriteMovementsEditor";
import { WellnessParamsSelector } from "@/components/profile/WellnessParamsSelector";
import { WearableSection } from "@/components/profile/WearableSection";
import { DangerZoneSection } from "@/components/profile/DangerZoneSection";
import { NotificationPreferences } from "@/components/profile/NotificationPreferences";
import { useProfileData } from "@/features/profile/useProfileData";
import { BrainLoverProfileTabs } from "@/features/brainlover/BrainLoverProfileTabs";

/**
 * Profile page — role-aware shell.
 *
 * FreeBrainer: 3-section layout (Identity / Tracking / Preferences).
 * BrainLover/Pro: Tabbed profile (Me / Them) via BrainLoverProfileTabs.
 *   - "Me" tab: BrainLover's own identity, language, notifications.
 *   - "Them" tab: Full edit access to their FreeBrainer's profile.
 */
export default function Profile() {
  const { user, userRole, signOut } = useAuth();
  const { t } = useTranslation();

  const {
    isLoading,
    isSaving,
    profile,
    setProfile,
    caregivers,
    fileInputRef,
    isCaregiver,
    saveProfile,
    handlePhotoUpload,
  } = useProfileData();

  if (isLoading) {
    return <div className="flex justify-center p-8">{t("profile.loading", "Loading profile...")}</div>;
  }

  // ── BrainLover / Pro layout: tabbed profile (Me / Them) ──
  if (isCaregiver) {
    return (
      <div className="pb-20">
        <BrainLoverProfileTabs />
      </div>
    );
  }

  // ── FreeBrainer layout: 3 clean sections ──
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">{t("profile.myProfile", "My Profile")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {t("common.signOut", "Sign Out")}
          </Button>
          <Button onClick={saveProfile} disabled={isSaving}>
            {isSaving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
          </Button>
        </div>
      </div>

      {/* ── Section 1: My Identity ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            {t("profile.myIdentity", "My Identity")}
          </CardTitle>
          <CardDescription>{t("profile.identityDesc", "Share your journey and preferences with the community.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileHeader
            displayName={profile.display_name}
            setDisplayName={(val) => setProfile((prev) => ({ ...prev, display_name: val }))}
            avatarUrl={profile.avatar_url}
            location={profile.location}
            setLocation={(val) => setProfile((prev) => ({ ...prev, location: val }))}
            diagnosisStory={profile.diagnosis_story}
            setDiagnosisStory={(val) => setProfile((prev) => ({ ...prev, diagnosis_story: val }))}
            fileInputRef={fileInputRef}
            onPhotoUpload={handlePhotoUpload}
            isBrainLover={false}
          />
        </CardContent>
      </Card>

      {/* ── Section 2: Tracking ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold">{t("profile.trackingTitle", "Tracking")}</h2>
        </div>

        {/* Wearable — prominent, own subsection */}
        <WearableSection
          wearableConnected={profile.wearable_connected}
          onConnectedChange={(connected) => setProfile((prev) => ({ ...prev, wearable_connected: connected }))}
        />

        {/* Wellness Parameters — pills, no write-in */}
        <WellnessParamsSelector
          selectedParams={profile.symptoms}
          onParamsChange={(params) => setProfile((prev) => ({ ...prev, symptoms: params }))}
        />
      </div>

      {/* ── Section 3: Preferences & Privacy ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold">{t("profile.preferencesTitle", "Preferences & Privacy")}</h2>
        </div>

        {/* Favorite Movements */}
        <FavoriteMovementsEditor
          favoriteMovements={profile.favorite_movements}
          setFavoriteMovements={(val) => setProfile((prev) => ({ ...prev, favorite_movements: val }))}
        />

        {/* Language + Share consent + PWA install (reuses ProfileSettings, FreeBrainer mode) */}
        <ProfileSettings
          shareConsent={profile.share_consent}
          setShareConsent={(val) => setProfile((prev) => ({ ...prev, share_consent: val }))}
          isBrainLover={false}
        />

        {/* Notification Preferences */}
        <NotificationPreferences userId={user?.id || ""} role={userRole || "freebrainer"} />
      </div>

      {/* ── Save button (bottom) ── */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={saveProfile} disabled={isSaving} size="lg" className="w-full sm:w-auto">
          {isSaving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
        </Button>
      </div>

      {/* ── Danger Zone ── */}
      <DangerZoneSection
        userId={user!.id}
        deletionScheduledAt={profile.deletion_scheduled_at}
        onProfileDeletionUpdated={(date) => setProfile((prev) => ({ ...prev, deletion_scheduled_at: date }))}
      />
    </div>
  );
}
