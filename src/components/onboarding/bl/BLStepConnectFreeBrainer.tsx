/**
 * BLStepConnectFreeBrainer — Step 4 of the BrainLover onboarding flow.
 *
 * Connect your FreeBrainer:
 *   - If "manage": sub-account creation form (reuses useSubAccountCreate).
 *   - If "independent": search for existing FreeBrainer by email, or invite.
 *   - "My FreeBrainer isn't available right now" skip link → step 5.
 *
 * @param managementMode       — 'manage' | 'independent'
 * @param caregiverId          — the BrainLover's auth user id
 * @param patientEmail / setPatientEmail
 * @param onSubAccountCreated  — callback when sub-account is created (passes patient id)
 * @param onSkip               — "not available right now" → proceed without connecting
 * @param onNext / onBack
 * @param speak
 */
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Volume2, ChevronRight, ArrowLeft, UserPlus, Search, Mail, Loader2, CheckCircle2, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/avatar";
import { isDevBypassUser, createDevSubAccount } from "@/lib/devBypass";
import { useLocationSearch } from "@/features/onboarding/useLocationSearch";
import { usePhotoUpload } from "@/features/onboarding/usePhotoUpload";
import type { ManagementMode } from "./BLStepManagementMode";
import { ensureSameTeam } from "@/features/shared/useSubAccountCreate";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";

interface BLStepConnectFreeBrainerProps {
  managementMode: ManagementMode;
  caregiverId: string;
  patientEmail: string;
  setPatientEmail: (email: string) => void;
  onSubAccountCreated: (patientId: string, patientName: string, formData?: { conditions?: string; location?: string; diagnosisStory?: string; photo?: string | null }) => void;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepConnectFreeBrainer: React.FC<BLStepConnectFreeBrainerProps> = ({
  managementMode,
  caregiverId,
  patientEmail,
  setPatientEmail,
  onSubAccountCreated,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locationResults, searchLocation, setLocationResults } = useLocationSearch();
  const { isProcessing: photoProcessing, handlePhotoUpload } = usePhotoUpload();
  const subPhotoInputRef = useRef<HTMLInputElement>(null);

  // ── Sub-account form state (manage mode) ──
  const [subName, setSubName] = useState("");
  const [subConditions, setSubConditions] = useState("");
  const [subLocation, setSubLocation] = useState("");
  const [subStory, setSubStory] = useState("");
  const [subPhoto, setSubPhoto] = useState<string | null>(null);
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [subCreated, setSubCreated] = useState(false);

  // ── Search state (independent mode) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [foundPatient, setFoundPatient] = useState<{ user_id: string; display_name: string } | null>(null);

  const handleCreateSubAccount = async () => {
    if (!subName.trim()) {
      toast({
        title: t("subAccountModal.nameRequiredTitle", "Name required"),
        description: t("subAccountModal.nameRequiredDesc", "Please enter your FreeBrainer's name."),
        variant: "destructive",
      });
      return;
    }

    setIsSavingSub(true);
    try {
      // ── Dev-bypass: create mock sub-account in localStorage ──
      if (isDevBypassUser(caregiverId)) {
        const mock = createDevSubAccount({
          name: subName.trim(),
          conditions: subConditions,
          location: subLocation,
          diagnosisStory: subStory,
          photo: subPhoto,
        });
        toast({
          title: t("subAccountModal.createdTitle", "FreeBrainer created!"),
          description: t("subAccountModal.createdDesc", { name: subName.trim() }),
        });
        onSubAccountCreated(mock.id, subName.trim(), { conditions: subConditions, location: subLocation, diagnosisStory: subStory, photo: subPhoto });
        setSubCreated(true);
        return;
      }

      const { data: managed, error } = await supabase
        .from("managed_freebrainers")
        .insert({
          managed_by: caregiverId,
          display_name: subName.trim(),
          avatar_url: subPhoto || getAvatarUrl(subName.trim()),
          conditions: subConditions.trim() || null,
          location: subLocation.trim() || null,
          diagnosis_story: subStory.trim() || null,
          share_consent: false,
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      if (!managed) throw new Error("Failed to create managed FreeBrainer");

      // Link to caregiver with management_mode
      const { error: linkErr } = await supabase
        .from("caregiver_links")
        .insert({
          caregiver_id: caregiverId,
          patient_id: (managed as any).id,
          status: "managed",
          management_mode: "manage",
        } as any);

      if (linkErr) console.warn("Caregiver link error (non-fatal):", linkErr.message);

      // Auto-team integration
      await ensureSameTeam(caregiverId, (managed as any).id);

      toast({
        title: t("subAccountModal.createdTitle", "FreeBrainer created!"),
        description: t("subAccountModal.createdDesc", { name: subName.trim() }),
      });

      onSubAccountCreated((managed as any).id, subName.trim(), { conditions: subConditions, location: subLocation, diagnosisStory: subStory, photo: subPhoto });
      setSubCreated(true);
    } catch (err: any) {
      toast({
        title: t("subAccountModal.failedTitle", "Could not create"),
        description: err.message || t("subAccountModal.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setIsSearching(true);
    try {
      // Search by email or display name
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${searchQuery.trim()}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      console.warn("Search error:", e);
      // Also try email-based invite
      if (searchQuery.includes("@")) {
        setPatientEmail(searchQuery.trim());
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async () => {
    if (!patientEmail.trim() || !patientEmail.includes("@")) {
      toast({
        title: t("inviteModal.invalidEmailTitle", "Invalid email"),
        description: t("inviteModal.invalidEmailDesc", "Please enter a valid email address."),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: patientEmail.trim(),
        options: {
          emailRedirectTo: getOtpRedirectUrl(`/join?caregiver_id=${caregiverId}&role=freebrainer`),
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.warn("Invite error:", error.message);
        toast({ title: "Invite failed", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: t("inviteModal.inviteSentTitle", "Invite sent!"),
        description: t("inviteModal.inviteSentDesc", { email: patientEmail.trim() }),
      });
      onNext();
    } catch (e: any) {
      toast({
        title: t("inviteModal.invitePreparedTitle", "Invite prepared"),
        description: t("inviteModal.invitePreparedDesc", { email: patientEmail.trim() }),
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {managementMode === "manage"
            ? t("onboarding.bl.connectManageTitle", "Create your FreeBrainer's account")
            : t("onboarding.bl.connectIndependentTitle", "Find your FreeBrainer")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              managementMode === "manage"
                ? t("onboarding.bl.connectManageTitle", "Create your FreeBrainer's account")
                : t("onboarding.bl.connectIndependentTitle", "Find your FreeBrainer")
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      {/* ── MANAGE MODE: Sub-account creation ── */}
      {managementMode === "manage" && (
        <>
          {subCreated ? (
            <div className="bg-success/10 border-2 border-success/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-lg font-bold text-foreground">
                {t("onboarding.bl.subCreated", "FreeBrainer account created!")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "onboarding.bl.subCreatedDesc",
                  "You can add more FreeBrainers later from your dashboard."
                )}
              </p>
              <Button className="w-full h-14 text-lg mt-2" onClick={onNext}>
                {t("onboarding.continue", "Continue")}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ── Photo upload ── */}
              <div className="flex flex-col items-center gap-2">
                <input
                  ref={subPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handlePhotoUpload(
                      e,
                      (dataUrl) => setSubPhoto(dataUrl),
                      (msg) =>
                        toast({ title: t("onboarding.uploadFailed", "Upload failed"), description: msg, variant: "destructive" })
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => subPhotoInputRef.current?.click()}
                  className="relative group"
                >
                  <img
                    src={subPhoto || getAvatarUrl(subName || "freebrainer")}
                    alt={subName || "FreeBrainer"}
                    className="h-20 w-20 rounded-full border-2 border-primary/20 object-cover shrink-0"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => subPhotoInputRef.current?.click()}
                  className="text-sm text-primary hover:underline"
                >
                  {subPhoto
                    ? t("onboarding.bl.changePhoto", "Change photo")
                    : t("onboarding.bl.addPhoto", "Add a photo")}
                </button>
                {photoProcessing && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {t("subAccountModal.displayNameLabel", "FreeBrainer's Name")}
                </Label>
                <Input
                  placeholder={t("subAccountModal.displayNamePlaceholder", "e.g. Jean K.")}
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="h-12 border-2 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {t("subAccountModal.conditionsLabel", "Condition (optional)")}
                </Label>
                <Input
                  placeholder={t("subAccountModal.conditionsPlaceholder", "e.g. Parkinson's")}
                  value={subConditions}
                  onChange={(e) => setSubConditions(e.target.value)}
                  className="h-12 border-2 text-base"
                />
                <p className="text-[0.7rem] text-muted-foreground/80 leading-snug">
                  {t(
                    "subAccountModal.conditionsDisclaimer",
                    "* By entering condition information, you confirm you have the legal authority (e.g. power of attorney or guardianship) to manage this person's account and are authorized to provide their health information on their behalf."
                  )}
                </p>
              </div>

              <div className="space-y-2 relative">
                <Label className="text-sm font-semibold">
                  {t("subAccountModal.locationLabel", "Location (optional)")}
                </Label>
                <Input
                  placeholder={t("subAccountModal.locationPlaceholder", "e.g. Austin, TX")}
                  value={subLocation}
                  onChange={(e) => {
                    setSubLocation(e.target.value);
                    searchLocation(e.target.value);
                  }}
                  className="h-12 border-2 text-base"
                />
                {locationResults.length > 0 && (
                  <div className="absolute z-20 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                    {locationResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setSubLocation(item.display_name);
                          setLocationResults([]);
                        }}
                      >
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {t("subAccountModal.diagnosisStoryLabel", "Their Story (optional)")}
                </Label>
                <Textarea
                  placeholder={t("subAccountModal.diagnosisStoryPlaceholder", "A brief note...")}
                  value={subStory}
                  onChange={(e) => setSubStory(e.target.value)}
                  className="border-2 text-sm min-h-[80px] resize-none"
                />
              </div>

              <Button
                onClick={handleCreateSubAccount}
                disabled={isSavingSub || !subName.trim()}
                className="w-full h-14 font-bold gap-2 text-lg"
              >
                {isSavingSub ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    {t("subAccountModal.createLinkBtn", "Create & Link")}
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── INDEPENDENT MODE: Search + Invite ── */}
      {managementMode === "independent" && (
        <div className="space-y-4">
          <p className="text-base text-muted-foreground">
            {t(
              "onboarding.bl.searchDesc",
              "Search for your FreeBrainer by name, or invite them by email."
            )}
          </p>

          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              placeholder={t("onboarding.bl.searchPlaceholder", "Search by name or email")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-14 text-lg border-2 flex-1"
            />
            <Button
              variant="outline"
              className="h-14 px-4 border-2 shrink-0"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((r) => (
                <button
                  key={r.user_id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => {
                    setFoundPatient({ user_id: r.user_id, display_name: r.display_name });
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold shrink-0">
                    {r.display_name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <span className="font-medium text-foreground">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Found patient confirmation */}
          {foundPatient && (
            <div className="bg-success/10 border-2 border-success/30 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-foreground">{foundPatient.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.bl.foundFreeBrainer", "Found! We'll link you when you finish setup.")}
                </p>
              </div>
            </div>
          )}

          {/* Email invite fallback */}
          {!foundPatient && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-primary" />
                {t("onboarding.bl.inviteByEmail", "Or invite by email")}
              </Label>
              <Input
                type="email"
                placeholder="their@email.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="h-14 text-lg border-2"
              />
              <Button
                variant="outline"
                className="w-full h-14 text-lg border-2"
                disabled={!patientEmail.trim() || !patientEmail.includes("@")}
                onClick={handleSendInvite}
              >
                {t("onboarding.bl.sendInvite", "Send Invite")}
              </Button>
            </div>
          )}

          {/* Note */}
          <p className="text-xs text-muted-foreground italic text-center pt-2">
            {t("onboarding.bl.addMoreLater", "You may add more FreeBrainers later.")}
          </p>

          {foundPatient && (
            <Button className="w-full h-14 text-lg" onClick={onNext}>
              {t("onboarding.continue", "Continue")}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
        <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
      </Button>
    </div>
  );
};
