import { useTranslation } from "react-i18next";
import { Calendar, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface VirtualSessionCTAProps {
  /** Called when the user clicks "Schedule" */
  onSchedule: () => void;
  /** Optional patient name for dual session variant (BrainLover) */
  patientName?: string;
  /** Visual variant: "default" for FreeBrainer, "dual" for BrainLover dual sessions */
  variant?: "default" | "dual";
}

/**
 * Shared virtual session scheduling CTA card.
 *
 * - `variant="default"`: FreeBrainer's "Ready for today's movement session?"
 * - `variant="dual"`: BrainLover's "Schedule Dual Session with {patientName}"
 *
 * All strings use i18n.
 */
export function VirtualSessionCTA({
  onSchedule,
  patientName,
  variant = "default",
}: VirtualSessionCTAProps) {
  const { t } = useTranslation();

  if (variant === "dual" && patientName) {
    return (
      <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("calendly.scheduleDualSession", "Schedule Dual Session with")} {patientName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("calendly.dualSessionDesc", "Book a live virtual movement session together to keep motivation high.")}
            </p>
          </div>
          <Button
            onClick={onSchedule}
            className="gap-2 font-bold shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Calendar className="h-4 w-4" /> {t("calendly.scheduleDualSession", "Schedule Dual Session with")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border-primary/25 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="space-y-1 text-center sm:text-left">
        <h4 className="font-bold text-base text-foreground flex items-center justify-center sm:justify-start gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t("calendly.readyTitle", "Ready for today's movement session?")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("calendly.readyDesc", "Schedule a private virtual movement session with a facilitator in your preferred language.")}
        </p>
      </div>
      <Button
        onClick={onSchedule}
        className="font-bold text-xs px-6 py-2 shrink-0 bg-primary text-primary-foreground gap-2 shadow-sm"
      >
        <Calendar className="h-4 w-4" /> {t("calendly.scheduleVirtualSession", "Schedule Virtual Session")}
      </Button>
    </Card>
  );
}
