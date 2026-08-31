import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl, getInitials } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, MapPin, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLocationSearch } from "@/features/onboarding/useLocationSearch";

interface ProfileHeaderProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  avatarUrl: string;
  location: string;
  setLocation: (val: string) => void;
  diagnosisStory: string;
  setDiagnosisStory: (val: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isBrainLover?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  setDisplayName,
  avatarUrl,
  location,
  setLocation,
  diagnosisStory,
  setDiagnosisStory,
  fileInputRef,
  onPhotoUpload,
  isBrainLover = false,
}) => {
  const { t } = useTranslation();
  const { locationResults, searchLocation, setLocationResults } = useLocationSearch();
  const { isListening, toggle } = useSpeechRecognition({
    getInitialText: () => diagnosisStory,
    unsupportedMessage: t("common.speechUnsupported", "Voice input isn't supported on this browser."),
  });

  return (
    <div className="space-y-6 bg-card p-6 rounded-xl border">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-primary/20">
            <AvatarImage src={avatarUrl || getAvatarUrl(displayName || 'FreeBrain')} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={onPhotoUpload}
          />
        </div>

        <div className="flex-1 space-y-3 w-full">
          <div>
            <Label htmlFor="displayName">{t("profile.displayName", "Display Name")}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="relative">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {t("profile.location", "Location")}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => { setLocation(e.target.value); searchLocation(e.target.value); }}
              placeholder={t("profile.locationPlaceholder", "e.g. Austin, TX")}
              className="mt-1"
            />
            {locationResults.length > 0 && (
              <div className="absolute z-20 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                {locationResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => { setLocation(item.display_name); setLocationResults([]); }}
                  >
                    {item.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isBrainLover && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="diagnosisStory">{t("profile.story", "Diagnosis & Journey Story")}</Label>
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
            id="diagnosisStory"
            value={diagnosisStory}
            onChange={(e) => setDiagnosisStory(e.target.value)}
            rows={3}
            className="resize-none"
            placeholder={t("profile.storyPlaceholder", "Share a bit about your journey...")}
          />
        </div>
      )}
    </div>
  );
};
