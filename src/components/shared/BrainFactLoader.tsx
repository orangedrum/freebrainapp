import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain } from "lucide-react";
import { getRandomBrainFact } from "@/components/shared/DailyBrainFact";

/**
 * BrainFactLoader — a loading screen that shows a rotating brain fact.
 *
 * Behaviour:
 *   - Does NOT appear instantly. A 400ms grace period lets fast loads
 *     skip the loader entirely (no flash).
 *   - Once visible, stays for a minimum of 3.5s so the fact is legible
 *     even if the data resolves sooner.
 *   - If data is still loading after the minimum hold, the loader stays
 *     until `isLoading` flips to false.
 */
export function BrainFactLoader({ isLoading }: { isLoading: boolean }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [fact] = useState(() => getRandomBrainFact());
  const [minHoldTimer, setMinHoldTimer] = useState(false);

  // ── Grace period: only show if loading takes longer than 400ms ──
  useEffect(() => {
    if (!isLoading) return;
    const grace = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(grace);
  }, [isLoading]);

  // ── Minimum hold: once visible, keep for at least 3.5s ──
  useEffect(() => {
    if (!visible) return;
    const hold = setTimeout(() => setMinHoldTimer(true), 3500);
    return () => clearTimeout(hold);
  }, [visible]);

  // ── Hide when loading is done AND minimum hold elapsed ──
  useEffect(() => {
    if (!isLoading && minHoldTimer) {
      setVisible(false);
    }
  }, [isLoading, minHoldTimer]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="max-w-md mx-4 text-center space-y-6">
        {/* Animated brain icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative p-4 rounded-full bg-primary/10">
              <Brain className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Brain fact */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {t("loader.brainFact", "Daily Brain Fact")}
          </span>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            "{fact}"
          </p>
        </div>

        {/* Subtle progress bar */}
        <div className="w-48 mx-auto h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary/60 animate-pulse rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}
