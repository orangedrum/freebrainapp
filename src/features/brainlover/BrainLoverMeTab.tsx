/**
 * BrainLoverMeTab — the BrainLover's own profile settings.
 *
 * Layout mirrors the FreeBrainer's 3-section structure but simplified:
 * 1. "My Identity" — photo, display name, location (no diagnosis story)
 * 2. No tracking section (BrainLovers don't track wellness)
 * 3. "Preferences" — language + app settings (no HIPAA, just general wellness
 *    disclaimer), notification preferences (no pokes/cheers toggles)
 * 4. Danger Zone (under save)
 *
 * Reuses: ProfileHeader, ProfileSettings, NotificationPreferences, DangerZoneSection
 */
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, LogOut, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { NotificationPreferences } from "@/components/profile/NotificationPreferences";
import { DangerZoneSection } from "@/components/profile/DangerZoneSection";
import type { ProfileData } from "@/features/profile/useProfileData";

interface BrainLoverMeTabProps {
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  isSaving: boolean;
  onSave: () => void;
  onSignOut: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userId: string;
  userRole: string;
  deletionScheduledAt: string | null;
  onProfileDeletionUpdated: (date: string | null) => void;
}

export const BrainLoverMeTab: React.FC<BrainLoverMeTabProps> = ({
  profile,
  setProfile,
  isSaving,
  onSave,
  onSignOut,
  fileInputRef,
  onPhotoUpload,
  userId,
  userRole,
  deletionScheduledAt,
  onProfileDeletionUpdated,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Save + Sign Out */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">{t("profile.myProfile", "My Profile")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive/10 gap-2"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" /> {t("common.signOut", "Sign Out")}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
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
          <CardDescription>
            {t("profile.identityDesc", "Your name and photo as seen by your FreeBrainer.")}
          </CardDescription>
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
            onPhotoUpload={onPhotoUpload}
            isBrainLover={true}
          />
        </CardContent>
      </Card>

      {/* ── Section 2: Preferences & Privacy ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold">
            {t("profile.preferencesTitle", "Preferences & Privacy")}
          </h2>
        </div>

        {/* Language + App Settings (no HIPAA, with general wellness disclaimer) */}
        <ProfileSettings
          shareConsent={profile.share_consent}
          setShareConsent={(val) => setProfile((prev) => ({ ...prev, share_consent: val }))}
          isBrainLover={true}
        />

        {/* Notification Preferences (role = brainlover, no pokes/cheers) */}
        <NotificationPreferences userId={userId} role={userRole} />
      </div>

      {/* ── Save button (bottom) ── */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={onSave} disabled={isSaving} size="lg" className="w-full sm:w-auto">
          {isSaving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
        </Button>
      </div>

      {/* ── Danger Zone ── */}
      <DangerZoneSection
        userId={userId}
        deletionScheduledAt={deletionScheduledAt}
        onProfileDeletionUpdated={onProfileDeletionUpdated}
      />
    </div>
  );
};
