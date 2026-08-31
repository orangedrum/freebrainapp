/**
 * GuiltFreeRulesModal — explains the streak rules (rest days, tested days).
 *
 * Pure presentational modal — no data fetching.
 * Uses semantic tokens (success for positive, primary for neutral).
 *
 * Props:
 *  - open: whether the modal is visible
 *  - onOpenChange: callback to toggle visibility
 */
import { useTranslation } from "react-i18next";
import { Flame, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function GuiltFreeRulesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Flame className="h-6 w-6 text-warning" />
            {t("scoreboard.guiltFreeTitle", "Guilt-Free Streaks Explanation")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t("scoreboard.guiltFreeDesc", "At FreeBrain, we believe neuroplasticity requires both movement AND recovery. Your streak is designed to encourage consistency without guilt!")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 space-y-1">
            <div className="font-bold text-success flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> {t("scoreboard.restDaysTitle", "Rest Days Keep Streaks Alive!")}
            </div>
            <p className="text-muted-foreground">
              {t("scoreboard.restDaysDesc", "Taking a deliberate \"Rested My Brain\" day is essential for consolidation. Logging a rest day preserves your streak.")}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> {t("scoreboard.testedDaysTitle", "\"Tested My Brain\" Days Count")}
            </div>
            <p className="text-muted-foreground">
              {t("scoreboard.testedDaysDesc", "Even on tough symptom days where you gave it your best effort, checking in with \"Tested My Brain\" keeps your streak going!")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full text-xs">
            {t("scoreboard.gotItKeepMoving", "Got it! Keep Moving")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
