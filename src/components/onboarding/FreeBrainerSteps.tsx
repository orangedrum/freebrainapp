import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Volume2, Heart, Mail, Watch, Smartphone, RefreshCw, 
  ShieldCheck, Camera, ChevronRight, Mic
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { StepTeams } from "./StepTeams";

interface FreeBrainerStepsProps {
  step: number;
  setStep: (step: number) => void;

  photo: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayName: string;
  setDisplayName: (val: string) => void;
  location: string;
  searchLocation: (query: string) => void;
  isSearchingLocation: boolean;
  locationResults: any[];
  setLocation: (loc: string) => void;
  setLocationResults: (results: any[]) => void;
  brainLoverEmail: string;
  setBrainLoverEmail: (email: string) => void;
  movementDays: number[];
  setMovementDays: (days: number[]) => void;
  teamCode: string;
  setTeamCode: (code: string) => void;
  teamSearchQuery: string;
  setTeamSearchQuery: (query: string) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  isIOS: boolean;
  shareConsent: boolean;
  setShareConsent: (consent: boolean) => void;
  diagnosisStory: string;
  setDiagnosisStory: (story: string) => void;
  speak: (text: string) => void;
  toast: (options: any) => void;
}

export const FreeBrainerSteps: React.FC<FreeBrainerStepsProps> = ({
  step,
  setStep,
  photo,
  fileInputRef,
  handlePhotoUpload,
  displayName,
  setDisplayName,
  location,
  searchLocation,
  isSearchingLocation,
  locationResults,
  setLocation,
  setLocationResults,
  brainLoverEmail,
  setBrainLoverEmail,
  movementDays,
  setMovementDays,
  teamCode,
  setTeamCode,
  teamSearchQuery,
  setTeamSearchQuery,
  selectedTeam,
  setSelectedTeam,
  isIOS,
  shareConsent,
  setShareConsent,
  diagnosisStory,
  setDiagnosisStory,
  speak,
  toast,
}) => {
  const { t } = useTranslation();
  const { isListening, toggle } = useSpeechRecognition({
    getInitialText: () => diagnosisStory,
    unsupportedMessage: t("common.speechUnsupported", "Voice input isn't supported on this browser."),
  });

  // Step 5 ("Extracted Symptoms" review) has been removed — it was an
  // obsolete AI-extraction step that risked capturing clinical symptom data.
  // The wellness params selected in StepSymptoms are now used directly.

  if (step === 6) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
            {t("onboarding.step8.title", "Create Your Profile")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step8.title")}. ${t("onboarding.step8.addPhoto")}. ${t(
                  "onboarding.step8.locationLabel"
                )}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
          />
          <div
            className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-muted border-4 border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
          >
            {photo ? (
              <img src={photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground">
                  {t("onboarding.step8.addPhoto")}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-lg md:text-xl font-semibold">
            {t("onboarding.step8.nameLabel", "FreeBrainer Name")}
          </label>
          <Input
            placeholder={t("onboarding.step8.namePlaceholder", "How should we call you?")}
            className="h-14 md:h-16 text-lg md:text-xl border-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="text-lg md:text-xl font-semibold">
            {t("onboarding.step8.locationLabel")}
          </label>
          <div className="relative">
            <Input
              placeholder={t("onboarding.step8.locationPlaceholder", "Start typing your city...")}
              className="h-14 md:h-16 text-lg md:text-xl border-2"
              value={location}
              onChange={(e) => { setLocation(e.target.value); searchLocation(e.target.value); }}
            />
            {isSearchingLocation && (
              <div className="absolute right-4 top-4 md:top-5">
                <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            )}
            {locationResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border-2 rounded-xl shadow-lg z-50 max-h-[200px] overflow-y-auto">
                {locationResults.map((result: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 md:p-4 hover:bg-muted cursor-pointer text-base md:text-lg border-b last:border-b-0"
                    onClick={() => {
                      setLocation(result.display_name);
                      setLocationResults([]);
                    }}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={() => setStep(7)}>
          {t("onboarding.continue")} <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
            {t("onboarding.step6.title", "Invite a BrainLover")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step6.title")}. ${t("onboarding.step6.invite")}. ${t(
                  "onboarding.step6.inviteDesc"
                )}. ${t("onboarding.step6.emailLabel")}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        </div>
        <div className="bg-primary/5 p-4 md:p-6 rounded-2xl border-2 border-primary/10">
          <Heart className="h-10 w-10 md:h-12 md:w-12 text-primary mb-3 md:mb-4" />
          <p className="text-lg md:text-xl font-medium mb-2">{t("onboarding.step6.invite")}</p>
          <p className="text-base md:text-lg text-muted-foreground">
            {t("onboarding.step6.inviteDesc")}
          </p>
        </div>
        <div className="space-y-4">
          <label className="text-lg md:text-xl font-semibold">
            {t("onboarding.step6.emailLabel")}
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-4 md:top-5 h-6 w-6 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t("onboarding.step6.emailPlaceholder")}
              className="h-14 md:h-16 text-lg md:text-xl pl-12 md:pl-14 border-2"
              value={brainLoverEmail}
              onChange={(e) => setBrainLoverEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 md:gap-4 pt-4">
          <Button
            className="w-full h-16 md:h-20 text-xl md:text-2xl"
            onClick={() => {
              if (brainLoverEmail) {
                toast({
                  title: t("onboarding.inviteSavedTitle"),
                  description: t("onboarding.inviteSavedDesc", { email: brainLoverEmail }),
                });
              }
              setStep(8);
            }}
          >
            {brainLoverEmail ? t("onboarding.step6.sendInvite") : t("onboarding.skip")}{" "}
            <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
          </Button>
          <div className="text-center">
            <Button
              variant="link"
              className="text-base md:text-lg text-muted-foreground"
              onClick={() => setStep(8)}
            >
              {t("onboarding.doLater")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 8) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold text-balance leading-tight">
            {t("onboarding.step7.title", "How many days a week do you aim to move?")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step7.title")}. ${movementDays[0]} ${t(
                  "onboarding.step7.days"
                )}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        </div>
        <div className="py-8 md:py-12 space-y-8 md:space-y-12">
          <div className="text-center text-[clamp(4rem,10vw,4.5rem)] font-bold text-primary leading-none">
            {movementDays[0]}{" "}
            <span className="text-2xl md:text-3xl text-muted-foreground">
              {t("onboarding.step7.days")}
            </span>
          </div>
          <Slider
            value={movementDays}
            onValueChange={setMovementDays}
            max={7}
            min={0}
            step={1}
            className="py-4"
          />
        </div>
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={() => setStep(9)}>
          {t("onboarding.continue")} <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
      </div>
    );
  }

  if (step === 9) {
    return (
      <StepTeams
        teamCode={teamCode}
        setTeamCode={setTeamCode}
        teamSearchQuery={teamSearchQuery}
        setTeamSearchQuery={setTeamSearchQuery}
        selectedTeam={selectedTeam}
        setSelectedTeam={setSelectedTeam}
        onNext={() => setStep(10)}
        onSkip={() => setStep(10)}
        speak={speak}
      />
    );
  }

  if (step === 10) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
            {t("onboarding.step10.title", "Connect a Wearable")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step10.title")}. ${t(
                  "onboarding.step10.desc",
                  "Automatically track your activity with Apple Health or Google Fit."
                )}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        </div>
        <p className="text-lg md:text-xl text-muted-foreground">
          {t("onboarding.step10.desc")}
        </p>
        <div className="space-y-4 py-4 md:py-6">
          {isIOS ? (
            <Button
              variant="outline"
              className="w-full h-16 md:h-24 text-xl md:text-2xl justify-start px-4 md:px-8 border-2 hover:border-primary hover:bg-primary/5"
            >
              <Watch className="h-8 w-8 md:h-10 md:w-10 mr-4 md:mr-6 text-primary shrink-0" />{" "}
              {t("device.appleHealth")}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-16 md:h-24 text-xl md:text-2xl justify-start px-4 md:px-8 border-2 hover:border-primary hover:bg-primary/5"
            >
              <Smartphone className="h-8 w-8 md:h-10 md:w-10 mr-4 md:mr-6 text-primary shrink-0" />{" "}
              {t("device.googleFit")}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-16 md:h-24 text-xl md:text-2xl justify-start px-4 md:px-8 border-2 hover:border-primary hover:bg-primary/5"
          >
            <RefreshCw className="h-8 w-8 md:h-10 md:w-10 mr-4 md:mr-6 text-primary shrink-0" />{" "}
{t("device.otherDevice")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 md:gap-4 pt-4">
          <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={() => setStep(11)}>
            {t("onboarding.continue")} <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
          </Button>
          <div className="text-center">
            <Button
              variant="link"
              className="text-base md:text-lg text-muted-foreground"
              onClick={() => setStep(11)}
            >
              {t("onboarding.skip")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.step11.title", "HIPAA & Data Sharing")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.step11.title")}. ${t("onboarding.step11.consentTitle")}. ${t(
                "onboarding.step11.consentSubtitle"
              )}.`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <div className="bg-primary/5 p-4 md:p-6 rounded-2xl border-2 border-primary/20 flex gap-3 md:gap-4 items-start">
        <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0 mt-1" />
        <div>
          <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">
            {t("onboarding.step11.consentTitle", "HIPAA Authorization")}
          </h3>
          <p className="text-base md:text-lg font-medium text-primary mb-1 md:mb-2">
            {t("onboarding.step11.consentSubtitle", "Your privacy is fully protected.")}
          </p>
          <p className="text-sm md:text-lg text-muted-foreground">
            {t(
              "onboarding.step11.consentDesc",
              "We only share non-sensitive activity updates on the community wall when you grant explicit permission."
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 md:p-6 border-2 rounded-2xl">
        <Label
          htmlFor="share-consent"
          className="text-lg md:text-xl font-medium cursor-pointer pr-4"
        >
          {t("onboarding.step11.shareLabel", "Share my daily check-in streaks with the community")}
        </Label>
        <Switch
          id="share-consent"
          checked={shareConsent}
          onCheckedChange={setShareConsent}
          className="scale-125 md:scale-150 shrink-0 mr-1 md:mr-2"
        />
      </div>

      <div className="space-y-4 pt-2 md:pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg md:text-xl font-semibold">
            {t("onboarding.step11.storyLabel", "Your Diagnosis Story (Optional)")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant={isListening ? "destructive" : "outline"}
            className="h-9 gap-1.5"
            onClick={() => toggle(setDiagnosisStory)}
          >
            <Mic className="h-4 w-4" />
            {isListening ? t("common.listening", "Listening…") : t("common.dictate", "Dictate")}
          </Button>
        </div>
        <Textarea
          placeholder={t(
            "onboarding.step11.storyPlaceholder",
            "Share a brief message about your journey..."
          )}
          className="min-h-[120px] md:min-h-[150px] text-lg md:text-xl p-4 rounded-xl resize-none border-2"
          value={diagnosisStory}
          onChange={(e) => setDiagnosisStory(e.target.value)}
        />
      </div>

      <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={() => setStep(12)}>
        {t("onboarding.continue")} <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
      </Button>
    </div>
  );
};
