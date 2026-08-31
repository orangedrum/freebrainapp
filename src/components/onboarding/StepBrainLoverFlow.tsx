/**
 * StepBrainLoverFlow — Slim orchestrator for the BrainLover onboarding flow.
 *
 * ── Primary BrainLover (creates sub-account or invites independent FB) ──
 *   2: BLStepWelcome           — "You must really love someone's brain!"
 *   3: BLStepProfile           — Name + photo + location
 *   4: BLStepManagementMode     — manage vs independent (not skippable)
 *   5: BLStepConnectFreeBrainer — sub-account or search/invite
 *   6: BLStepMoveTogetherIntro  — "Grab [FB]. Let's do our first exercise!" (manage mode only)
 *   7: BLStepMoveTogether       — follow-along video (manage mode only)
 *   8: BLStepWantSupport        — "Want support? Invite other BrainLovers"
 *   9: StepMagicLinkAuth        — email verification + install
 *
 * ── Invited BrainLover (invited by another BrainLover who has a sub FB) ──
 *   2: BLStepInvitedWelcome     — "Come Love Their Brain" + FB profile + inviter name
 *   3: BLStepHowYoullHelp       — 3-column "Here's How You'll Help" → "I'm In"
 *   4: BLStepProfile            — "Let's Learn About You" — name + photo + location
 *   5: BLStepGetSample          — "Get a Sample" → "I'm Ready"
 *   6: BLStepMoveTogether       — sample video (reused)
 *   7: StepMagicLinkAuth        — "1 more step!" email verification
 *
 * All step UI lives in src/components/onboarding/bl/ as modular components.
 * This file just routes step → component and passes props.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { StepMagicLinkAuth } from "./StepMagicLinkAuth";
import { BLStepWelcome } from "./bl/BLStepWelcome";
import { BLStepProfile } from "./bl/BLStepProfile";
import { BLStepManagementMode, type ManagementMode } from "./bl/BLStepManagementMode";
import { BLStepConnectFreeBrainer } from "./bl/BLStepConnectFreeBrainer";
import { BLStepMoveTogetherIntro } from "./bl/BLStepMoveTogetherIntro";
import { BLStepMoveTogether } from "./bl/BLStepMoveTogether";
import { BLStepWantSupport } from "./bl/BLStepWantSupport";
import { BLStepAboutFreeBrain } from "./bl/BLStepAboutFreeBrain";
import { BLStepInvitedWelcome } from "./bl/BLStepInvitedWelcome";
import { BLStepHowYoullHelp } from "./bl/BLStepHowYoullHelp";
import { BLStepGetSample } from "./bl/BLStepGetSample";

interface StepBrainLoverFlowProps {
  step: number;
  setStep: (step: number) => void;
  // Profile
  displayName: string;
  setDisplayName: (val: string) => void;
  photo: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  location: string;
  setLocation: (val: string) => void;
  searchLocation: (query: string) => void;
  locationResults: any[];
  onSelectLocation: (loc: string) => void;
  // Management mode
  managementMode: ManagementMode | null;
  setManagementMode: (mode: ManagementMode) => void;
  // Connect FreeBrainer
  caregiverId: string;
  patientEmail: string;
  setPatientEmail: (email: string) => void;
  onSubAccountCreated: (patientId: string, patientName: string, formData?: { conditions?: string; location?: string; diagnosisStory?: string; photo?: string | null }) => void;
  freeBrainerName: string;
  // Sub-account patient ID (for passing through to Want Support invites)
  subAccountPatientId?: string | null;
  // Completion
  handleCompleteBrainLover: () => void;
  isProcessing: boolean;
  speak: (text: string) => void;
  // Invited flow: when true, skip management mode + connect FreeBrainer + move together
  isInvited: boolean;
  freeBrainerAvatar?: string | null;
  // Invited flow: name of the BrainLover who sent the invite
  inviterName?: string | null;
}

export const StepBrainLoverFlow: React.FC<StepBrainLoverFlowProps> = ({
  step,
  setStep,
  displayName,
  setDisplayName,
  photo,
  fileInputRef,
  onPhotoUpload,
  location,
  setLocation,
  searchLocation,
  locationResults,
  onSelectLocation,
  managementMode,
  setManagementMode,
  caregiverId,
  patientEmail,
  setPatientEmail,
  onSubAccountCreated,
  freeBrainerName,
  subAccountPatientId,
  handleCompleteBrainLover,
  isProcessing,
  speak,
  isInvited,
  freeBrainerAvatar,
  inviterName,
}) => {
  const { t } = useTranslation();
  void t;

  // ════════════════════════════════════════════════════════════
  // INVITED BRAINLOVER FLOW
  // 2 → 3 → 4 → 5 → 6 → 7(Auth)
  // ════════════════════════════════════════════════════════════
  if (isInvited) {
    // Step 2: Invited Welcome — "Come Love Their Brain"
    if (step === 2) {
      return (
        <BLStepInvitedWelcome
          freeBrainerName={freeBrainerName}
          freeBrainerAvatar={freeBrainerAvatar}
          inviterName={inviterName}
          onNext={() => setStep(3)}
          speak={speak}
        />
      );
    }

    // Step 3: How You'll Help — 3 columns → "I'm In"
    if (step === 3) {
      return (
        <BLStepHowYoullHelp
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
          speak={speak}
        />
      );
    }

    // Step 4: Profile — "Let's Learn About You"
    if (step === 4) {
      return (
        <BLStepProfile
          displayName={displayName}
          setDisplayName={setDisplayName}
          photo={photo}
          fileInputRef={fileInputRef}
          onPhotoUpload={onPhotoUpload}
          location={location}
          setLocation={setLocation}
          searchLocation={searchLocation}
          locationResults={locationResults}
          onSelectLocation={onSelectLocation}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
          speak={speak}
        />
      );
    }

    // Step 5: Get Sample — "Grab your FreeBrainer..."
    if (step === 5) {
      return (
        <BLStepGetSample
          freeBrainerName={freeBrainerName}
          onNext={() => setStep(6)}
          onBack={() => setStep(4)}
          speak={speak}
        />
      );
    }

    // Step 6: Sample Video (reused from primary flow)
    if (step === 6) {
      return (
        <BLStepMoveTogether
          freeBrainerName={freeBrainerName}
          onNext={() => setStep(7)}
          onBack={() => setStep(5)}
          speak={speak}
        />
      );
    }

    // Step 7: Auth — "1 more step! Help us verify your email"
    return (
      <StepMagicLinkAuth
        onComplete={handleCompleteBrainLover}
        isProcessing={isProcessing}
        speak={speak}
        customTitle={t("onboarding.bl.invitedAuthTitle", "1 more step!")}
        customSubtitle={t("onboarding.bl.invitedAuthSubtitle", "Help us verify your email by adding it below")}
        customButtonLabel={t("onboarding.bl.invitedAuthButton", "Send")}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // PRIMARY BRAINLOVER FLOW
  // 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9(Auth)
  // ════════════════════════════════════════════════════════════

  // Step 2: Welcome
  if (step === 2) {
    return <BLStepWelcome onNext={() => setStep(3)} speak={speak} />;
  }

  // Step 3: Profile
  if (step === 3) {
    return (
      <BLStepProfile
        displayName={displayName}
        setDisplayName={setDisplayName}
        photo={photo}
        fileInputRef={fileInputRef}
        onPhotoUpload={onPhotoUpload}
        location={location}
        setLocation={setLocation}
        searchLocation={searchLocation}
        locationResults={locationResults}
        onSelectLocation={onSelectLocation}
        onNext={() => setStep(4)}
        onBack={() => setStep(2)}
        speak={speak}
      />
    );
  }

  // Step 4: Management Mode (not skippable)
  if (step === 4) {
    return (
      <BLStepManagementMode
        managementMode={managementMode}
        setManagementMode={setManagementMode}
        onNext={() => setStep(5)}
        onBack={() => setStep(3)}
        speak={speak}
      />
    );
  }

  // Step 5: Connect FreeBrainer
  if (step === 5) {
    return (
      <BLStepConnectFreeBrainer
        managementMode={managementMode || "manage"}
        caregiverId={caregiverId}
        patientEmail={patientEmail}
        setPatientEmail={setPatientEmail}
        onSubAccountCreated={onSubAccountCreated}
        onNext={() => setStep(managementMode === "manage" ? 6 : 8)}
        onBack={() => setStep(4)}
        speak={speak}
      />
    );
  }

  // Step 6: Move Together Intro (manage mode only)
  if (step === 6) {
    return (
      <BLStepMoveTogetherIntro
        freeBrainerName={freeBrainerName}
        onNext={() => setStep(7)}
        onSkip={() => setStep(8)}
        onBack={() => setStep(5)}
        speak={speak}
      />
    );
  }

  // Step 7: Move Together Video (manage mode only)
  if (step === 7) {
    return (
      <BLStepMoveTogether
        freeBrainerName={freeBrainerName}
        onNext={() => setStep(8)}
        onBack={() => setStep(6)}
        speak={speak}
      />
    );
  }

  // Step 8: Want Support? (invite other BrainLovers)
  if (step === 8) {
    return (
      <BLStepWantSupport
        freeBrainerName={freeBrainerName}
        caregiverId={caregiverId}
        patientId={subAccountPatientId}
        patientAvatar={freeBrainerAvatar}
        onNext={() => setStep(9)}
        onBack={() => setStep(managementMode === "manage" ? 7 : 5)}
        speak={speak}
      />
    );
  }

  // Step 9: Magic link auth + install
  return (
    <StepMagicLinkAuth
      onComplete={handleCompleteBrainLover}
      isProcessing={isProcessing}
      speak={speak}
    />
  );
};
