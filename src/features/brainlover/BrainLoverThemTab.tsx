/**
 * BrainLoverThemTab — the BrainLover's view of their FreeBrainer's profile.
 *
 * Mirrors the FreeBrainer's own 3-section profile layout exactly:
 * 1. "My Identity" — photo, name, location, diagnosis story (with dictate)
 * 2. "Tracking" — wearable sync + wellness parameter pills
 * 3. "Preferences & Privacy" — favorite movements, language, share consent,
 *    notification preferences
 *
 * If the BrainLover has multiple FreeBrainers, a dropdown selector appears
 * at the top to switch between them.
 *
 * Reuses ALL existing components: ProfileHeader, WellnessParamsSelector,
 * WearableSection, FavoriteMovementsEditor, ProfileSettings,
 * NotificationPreferences, DangerZoneSection, FreeBrainerSelector.
 */
import React, { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, Activity, Shield, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { FavoriteMovementsEditor } from "@/components/profile/FavoriteMovementsEditor";
import { WellnessParamsSelector } from "@/components/profile/WellnessParamsSelector";
import { WearableSection } from "@/components/profile/WearableSection";
import { DangerZoneSection } from "@/components/profile/DangerZoneSection";
import { NotificationPreferences } from "@/components/profile/NotificationPreferences";
import { FreeBrainerSelector } from "@/features/brainlover/FreeBrainerSelector";
import { useFreeBrainerProfile } from "@/features/brainlover/useFreeBrainerProfile";

interface BrainLoverThemTabProps {
  caregivers: any[];
  onCaregiverDeletionUpdated: (patientId: string, date: string | null) => void;
}

export const BrainLoverThemTab: React.FC<BrainLoverThemTabProps> = ({
  caregivers,
  onCaregiverDeletionUpdated,
}) => {
  const { t } = useTranslation();

  // Build patient list from caregivers for the selector
  const patients = caregivers.map((c: any) => ({
    user_id: c.patient_id,
    display_name: c.profiles?.display_name || t("profile.freeBrainerFallback", "FreeBrainer"),
    share_consent: c.profiles?.share_consent || false,
  }));

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.user_id || ""
  );

  // Fetch the selected FreeBrainer's profile (full edit access)
  const {
    isLoading,
    isSaving,
    profile: fbProfile,
    setProfile: setFbProfile,
    fileInputRef: fbFileInputRef,
    saveProfile: saveFbProfile,
    handlePhotoUpload: handleFbPhotoUpload,
  } = useFreeBrainerProfile(selectedPatientId || undefined);

  if (patients.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <h1 className="text-3xl font-heading font-bold">
          {t("profile.themTitle", "Their Profile")}
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("profile.noFreeBrainersLinked", "No FreeBrainers linked yet.")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        {t("profile.loading", "Loading profile...")}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header with selector + Save */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-heading font-bold">
          {t("profile.themTitle", "Their Profile")}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {patients.length > 1 && (
            <FreeBrainerSelector
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelect={setSelectedPatientId}
            />
          )}
          <Button onClick={saveFbProfile} disabled={isSaving}>
            {isSaving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
          </Button>
        </div>
      </div>

      {/* ── Section 1: FreeBrainer Identity ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            {t("profile.freeBrainerIdentity", "FreeBrainer Identity")}
          </CardTitle>
          <CardDescription>
            {t("profile.identityDesc", "Share your journey and preferences with the community.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileHeader
            displayName={fbProfile.display_name}
            setDisplayName={(val) => setFbProfile((prev) => ({ ...prev, display_name: val }))}
            avatarUrl={fbProfile.avatar_url}
            location={fbProfile.location}
            setLocation={(val) => setFbProfile((prev) => ({ ...prev, location: val }))}
            diagnosisStory={fbProfile.diagnosis_story}
            setDiagnosisStory={(val) => setFbProfile((prev) => ({ ...prev, diagnosis_story: val }))}
            fileInputRef={fbFileInputRef}
            onPhotoUpload={handleFbPhotoUpload}
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

        <WearableSection
          wearableConnected={fbProfile.wearable_connected}
          onConnectedChange={(connected) =>
            setFbProfile((prev) => ({ ...prev, wearable_connected: connected }))
          }
        />

        <WellnessParamsSelector
          selectedParams={fbProfile.symptoms}
          onParamsChange={(params) => setFbProfile((prev) => ({ ...prev, symptoms: params }))}
        />
      </div>

      {/* ── Section 3: Preferences & Privacy ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold">
            {t("profile.preferencesTitle", "Preferences & Privacy")}
          </h2>
        </div>

        <FavoriteMovementsEditor
          favoriteMovements={fbProfile.favorite_movements}
          setFavoriteMovements={(val) => setFbProfile((prev) => ({ ...prev, favorite_movements: val }))}
        />

        <ProfileSettings
          shareConsent={fbProfile.share_consent}
          setShareConsent={(val) => setFbProfile((prev) => ({ ...prev, share_consent: val }))}
          isBrainLover={false}
        />

        <NotificationPreferences
          userId={selectedPatientId || ""}
          role="freebrainer"
        />
      </div>

      {/* ── Save button (bottom) ── */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={saveFbProfile} disabled={isSaving} size="lg" className="w-full sm:w-auto">
          {isSaving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
        </Button>
      </div>

      {/* ── Danger Zone (FreeBrainer self-deletion) ── */}
      <DangerZoneSection
        userId={selectedPatientId || ""}
        deletionScheduledAt={
          caregivers.find((c: any) => c.patient_id === selectedPatientId)?.profiles?.deletion_scheduled_at || null
        }
        onProfileDeletionUpdated={(date) =>
          onCaregiverDeletionUpdated(selectedPatientId, date)
        }
      />
    </div>
  );
};
