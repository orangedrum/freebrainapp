import React from "react";
import { Activity, Bed } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CheckInPerspective } from "./CheckInFlow";

interface CheckInMovementChoiceProps {
  checkinStep: number;
  setCheckinStep: (step: number) => void;
  setCheckinStatus: (status: "moved" | "rest_day" | "flare_up") => void;
  suggestedVideo: any;
  onSwapVideo: () => void;
  setVideoChoice: (choice: "followed" | "own" | "both") => void;
  perspective?: CheckInPerspective;
}

export const CheckInMovementChoice: React.FC<CheckInMovementChoiceProps> = ({
  checkinStep,
  setCheckinStep,
  setCheckinStatus,
  perspective = "self",
}) => {
  const { t } = useTranslation();
  const pfx = perspective === "proxy" ? "proxy." : "";

  if (checkinStep === 1) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => {
              setCheckinStatus("moved");
              setCheckinStep(1.5);
            }}
            className="relative p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 border-border hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Activity className="h-8 w-8 text-success" />
            </div>
            <div>
              <h4 className="font-bold text-lg">{t(`checkin.${pfx}moved`, "I Moved Today")}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t(`checkin.${pfx}movedDesc`, "I moved today!")}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCheckinStatus("flare_up");
              setCheckinStep(3);
            }}
            className="relative p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 border-border hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Activity className="h-8 w-8 text-warning" />
            </div>
            <div>
              <h4 className="font-bold text-lg">{t(`checkin.${pfx}flareUp`, "Tested My Brain")}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t(`checkin.${pfx}flareUpDesc`, "I tested my brain and gave it my best effort today.")}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCheckinStatus("rest_day");
              setCheckinStep(3);
            }}
            className="relative p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 border-border hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Bed className="h-8 w-8 text-info" />
            </div>
            <div>
              <h4 className="font-bold text-lg">{t(`checkin.${pfx}restDay`, "Rested My Brain")}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t(`checkin.${pfx}restDayDesc`, "I listened to my brain/body and am taking time to rest.")}
              </p>
            </div>
          </button>
        </div>
        {/* No cancel button — this is a blocking modal that can't be dismissed */}
      </div>
    );
  }

  return null;
};
