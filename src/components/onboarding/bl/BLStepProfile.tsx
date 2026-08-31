/**
 * BLStepProfile — Step 2 of the BrainLover onboarding flow.
 *
 * Name + photo + location for the BrainLover themselves.
 * Reuses usePhotoUpload + useLocationSearch patterns from StepProfile.
 *
 * @param displayName / setDisplayName
 * @param photo / fileInputRef / onPhotoUpload
 * @param location / searchLocation / locationResults / onSelectLocation
 * @param onNext / onBack
 * @param speak
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Volume2, ChevronRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAvatarUrl, getInitials } from "@/lib/avatar";

interface BLStepProfileProps {
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
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepProfile: React.FC<BLStepProfileProps> = ({
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
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.profileTitle", "Tell us about you")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.bl.profileTitle", "Tell us about you")}. ${t(
                "onboarding.bl.profileDesc",
                "Your name and photo help your FreeBrainer recognize you."
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground">
        {t("onboarding.bl.profileDesc", "Your name and photo help your FreeBrainer recognize you.")}
      </p>

      {/* Photo upload */}
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
            <AvatarImage src={photo || getAvatarUrl(displayName)} />
            <AvatarFallback className="bg-muted text-lg font-semibold">
              {getInitials(displayName)}
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

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="bl-displayName" className="text-lg font-semibold">
          {t("onboarding.displayName", "Display Name")}
        </Label>
        <Input
          id="bl-displayName"
          placeholder="e.g. Sarah M."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-14 md:h-16 text-lg md:text-xl border-2"
        />
      </div>

      {/* Location */}
      <div className="space-y-2 relative">
        <Label htmlFor="bl-location" className="text-lg font-semibold">
          {t("onboarding.location", "City / Location")}
        </Label>
        <Input
          id="bl-location"
          placeholder="e.g. Austin, TX"
          value={location}
          onChange={(e) => { setLocation(e.target.value); searchLocation(e.target.value); }}
          className="h-14 md:h-16 text-lg md:text-xl border-2"
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

      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <Button
          className="w-full h-16 md:h-20 text-xl md:text-2xl"
          disabled={!displayName.trim()}
          onClick={onNext}
        >
          {t("onboarding.continue", "Continue")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
