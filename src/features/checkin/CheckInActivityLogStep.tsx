/**
 * CheckInActivityLogStep — "Log an Activity" card inside the check-in flow.
 *
 * Shows a 140-char text input so the user can describe what they did.
 * The text is saved as the check-in `notes` field and also dispatched
 * as a `fb-activity-logged` event so the timeline updates live.
 *
 * Perspective-aware: "self" (FreeBrainer) vs "proxy" (BrainLover).
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import type { CheckInPerspective } from "./CheckInFlow";

interface CheckInActivityLogStepProps {
  /** Initial value (pre-filled from existing notes) */
  initialNotes?: string;
  /** Called when user taps Continue — passes the activity text */
  onContinue: (activityText: string) => void;
  onBack: () => void;
  perspective?: CheckInPerspective;
}

export const CheckInActivityLogStep: React.FC<CheckInActivityLogStepProps> = ({
  initialNotes = "",
  onContinue,
  onBack,
  perspective = "self",
}) => {
  const { t } = useTranslation();
  const pfx = perspective === "proxy" ? "proxy." : "";
  const [text, setText] = useState(initialNotes);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Pencil className="h-6 w-6" />
          <h4 className="font-bold text-lg">
            {t(`checkin.${pfx}logActivityTitle`, "Log an Activity")}
          </h4>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            `checkin.${pfx}logActivityDesc`,
            "What did you do? Describe your movement so it shows up in the log."
          )}
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 140))}
          placeholder={t(
            `checkin.${pfx}logActivityPlaceholder`,
            "e.g. Walked in the park, stretched for 10 min, danced in the kitchen..."
          )}
          maxLength={140}
          className="min-h-[100px] resize-none text-base"
          autoFocus
        />
        <div className="text-[10px] text-muted-foreground text-right">
          {text.length}/140
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
        <Button variant="ghost" className="h-14" onClick={onBack}>
          {t("checkin.goBack", "Go Back")}
        </Button>
        <Button
          size="lg"
          className="h-14 min-w-[200px] font-bold text-lg"
          onClick={() => onContinue(text.trim())}
        >
          {t(`checkin.${pfx}logActivityContinue`, "Continue")}
        </Button>
      </div>
    </div>
  );
};
