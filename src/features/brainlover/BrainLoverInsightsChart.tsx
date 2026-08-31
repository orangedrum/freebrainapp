import { useTranslation } from "react-i18next";
import { AhaInsightsSection } from "@/components/shared/AhaInsightsSection";
import type { PatientLink } from "./types";

interface BrainLoverInsightsChartProps {
  patient: PatientLink | null;
}

export function BrainLoverInsightsChart({ patient }: BrainLoverInsightsChartProps) {
  if (!patient) return null;

  return (
    <AhaInsightsSection
      userId={patient.user_id}
      displayName={patient.display_name}
      shareConsent={patient.share_consent}
    />
  );
}
