/**
 * BrainLoverProfileTabs — tabbed profile shell for BrainLover role.
 *
 * Tab 1 "Me": BrainLover's own identity, language, notifications, danger zone.
 * Tab 2 "Them": Full edit access to their FreeBrainer's profile (identity,
 *   tracking, preferences, danger zone) with a dropdown to switch between
 *   multiple FreeBrainers.
 *
 * Reuses useProfileData for the BrainLover's own profile state.
 * Reuses all existing profile section components — no redundant code.
 */
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProfileData } from "@/features/profile/useProfileData";
import { useAuth } from "@/contexts/AuthContext";
import { BrainLoverMeTab } from "./BrainLoverMeTab";
import { BrainLoverThemTab } from "./BrainLoverThemTab";

export const BrainLoverProfileTabs: React.FC = () => {
  const { t } = useTranslation();
  const { user, userRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("me");

  const {
    isLoading,
    isSaving,
    profile,
    setProfile,
    caregivers,
    setCaregivers,
    fileInputRef,
    saveProfile,
    handlePhotoUpload,
  } = useProfileData();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        {t("profile.loading", "Loading profile...")}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="me" className="gap-2">
          <User className="h-4 w-4" />
          {t("profile.tabMe", "Me")}
        </TabsTrigger>
        <TabsTrigger value="them" className="gap-2">
          <Heart className="h-4 w-4" />
          {t("profile.tabThem", "Them")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="me">
        <BrainLoverMeTab
          profile={profile}
          setProfile={setProfile}
          isSaving={isSaving}
          onSave={saveProfile}
          onSignOut={signOut}
          fileInputRef={fileInputRef}
          onPhotoUpload={handlePhotoUpload}
          userId={user?.id || ""}
          userRole={userRole || "brainlover"}
          deletionScheduledAt={profile.deletion_scheduled_at}
          onProfileDeletionUpdated={(date) =>
            setProfile((prev) => ({ ...prev, deletion_scheduled_at: date }))
          }
        />
      </TabsContent>

      <TabsContent value="them">
        <BrainLoverThemTab
          caregivers={caregivers}
          onCaregiverDeletionUpdated={(patientId, date) => {
            setCaregivers((prev: any[]) =>
              prev.map((c) =>
                c.patient_id === patientId
                  ? { ...c, profiles: { ...c.profiles, deletion_scheduled_at: date } }
                  : c
              )
            );
          }}
        />
      </TabsContent>
    </Tabs>
  );
};
