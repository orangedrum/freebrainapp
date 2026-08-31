import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const BRAIN_FACTS = [
  "Aerobic movement stimulates BDNF (Brain-Derived Neurotrophic Factor), triggering new neuronal connections and neuroplasticity.",
  "Just 10 minutes of rhythmic movement increases dopamine levels, improving motor control and reducing tremors or stiffness.",
  "Rhythmic movement synchronizes neural firing patterns, helping bypass damaged motor pathways in neurological conditions.",
  "Consistent daily movement triggers neurogenesis in the hippocampus, strengthening memory and cognitive resistance.",
  "Cross-body coordination exercises recruit both brain hemispheres, rewiring motor signals around neural lesion areas.",
  "Rest days and gentle movement days actively consolidate neuroplastic gains made during vigorous movement sessions.",
  "Movement releases endorphins and reduces cortisol, directly decreasing pain perception and daily symptom intensity."
];

export function getRandomBrainFact() {
  const index = Math.floor(Math.random() * BRAIN_FACTS.length);
  return BRAIN_FACTS[index];
}

export function DailyBrainFact() {
  const { t } = useTranslation();
  const [factIndex, setFactIndex] = useState(() => {
    // Pick fact based on day of year so it stays consistent for the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return dayOfYear % BRAIN_FACTS.length;
  });

  const nextFact = () => {
    setFactIndex((prev) => (prev + 1) % BRAIN_FACTS.length);
  };

  return (
    <Card className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border-primary/30 shadow-sm">
      <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0 mt-0.5">
            <Lightbulb className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{t("dashboard.dailyBrainFact", "Daily Brain Fact")}</span>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">{t("dashboard.neuroplasticity", "Neuroplasticity")}</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              "{t(`dashboard.brainFacts.${factIndex}`, BRAIN_FACTS[factIndex])}"
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextFact}
          title={t("dashboard.newBrainFact", "New Brain Fact")}
          className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
