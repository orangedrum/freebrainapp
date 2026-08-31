import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Mic, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface StepProfileProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  photo: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  location: string;
  onSearchLocation: (query: string) => void;
  locationResults: any[];
  onSelectLocation: (loc: string) => void;
  diagnosisStory: string;
  setDiagnosisStory: (val: string) => void;
  shareConsent: boolean;
  setShareConsent: (val: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

export const StepProfile: React.FC<StepProfileProps> = ({
  displayName,
  setDisplayName,
  photo,
  fileInputRef,
  onPhotoUpload,
  location,
  onSearchLocation,
  locationResults,
  onSelectLocation,
  diagnosisStory,
  setDiagnosisStory,
  shareConsent,
  setShareConsent,
  onNext,
  onBack,
  isProcessing,
}) => {
  const { t } = useTranslation();
  const { isListening, toggle } = useSpeechRecognition({
    getInitialText: () => diagnosisStory,
    unsupportedMessage: t("common.speechUnsupported", "Voice input isn't supported on this browser."),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">
          {t("onboarding.profileTitle", "Complete Your FreeBrain Profile")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.profileDesc", "Personalize how you appear in the community.")}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
            <AvatarImage src={photo || undefined} />
            <AvatarFallback className="bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full shadow border h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoUpload}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("onboarding.displayName", "Display Name")}</Label>
          <Input
            id="displayName"
            placeholder="e.g. Sarah M."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="location">{t("onboarding.location", "City / Location")}</Label>
          <Input
            id="location"
            placeholder="e.g. Austin, TX"
            value={location}
            onChange={(e) => onSearchLocation(e.target.value)}
          />
          {locationResults.length > 0 && (
            <div className="absolute z-20 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
              {locationResults.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                  onClick={() => onSelectLocation(item.display_name)}
                >
                  {item.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="story">{t("onboarding.storyLabel", "Your Diagnosis Story (Optional)")}</Label>
            <Button
              type="button"
              size="sm"
              variant={isListening ? "destructive" : "outline"}
              className="h-8 gap-1.5"
              onClick={() => toggle(setDiagnosisStory)}
            >
              <Mic className="h-4 w-4" />
              {isListening ? t("common.listening", "Listening…") : t("common.dictate", "Dictate")}
            </Button>
          </div>
          <textarea
            id="story"
            rows={3}
            className="w-full p-2 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t("onboarding.storyPlaceholder", "Share a brief note about your journey...")}
            value={diagnosisStory}
            onChange={(e) => setDiagnosisStory(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="shareConsent"
            checked={shareConsent}
            onChange={(e) => setShareConsent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="shareConsent" className="text-sm font-normal">
            {t("onboarding.shareConsentLabel", "Share my story & first check-in to the Community Wall")}
          </Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          {t("common.back", "Back")}
        </Button>
        <Button
          onClick={onNext}
          disabled={!displayName.trim() || isProcessing}
          className="font-bold px-6"
        >
          {t("common.finish", "Finish & Save")}
        </Button>
      </div>
    </div>
  );
};
