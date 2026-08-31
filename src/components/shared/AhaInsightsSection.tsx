import { useTranslation } from "react-i18next";
import { TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SymptomMovementChart } from "@/components/shared/SymptomMovementChart";

export interface AhaInsightsSectionProps {
  /** User ID to fetch symptom/movement data for */
  userId: string;
  /** Display name for titles and consent messages */
  displayName: string;
  /** Whether the user has consented to share their data */
  shareConsent: boolean;
  /** Optional custom title (defaults to "{name}'s Aha! Insights Engine") */
  title?: string;
  /** Optional custom description */
  description?: string;
}

/**
 * Shared "Aha!" Insights section — wraps SymptomMovementChart with
 * HIPAA share_consent check. Used by FreeBrainer, BrainLover, and BrainLover Pro.
 *
 * When share_consent is false, shows a private/locked card instead of the chart.
 * All strings use i18n.
 */
export function AhaInsightsSection({
  userId,
  displayName,
  shareConsent,
  title,
  description,
}: AhaInsightsSectionProps) {
  const { t } = useTranslation();

  if (!shareConsent) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg text-foreground">
            <span className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              {t("caregiverDashboard.symptomCorrelation", "Symptom Correlation")}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {t("caregiverDashboard.private", "Private")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground text-xs bg-muted/10 rounded-lg border border-dashed border-border/60">
            {t("caregiverDashboard.mustEnableSharing", "{{name}} must enable HIPAA / Wall sharing in settings for trend chart visibility.", { name: displayName })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <SymptomMovementChart
      userId={userId}
      title={title || `${displayName}'s ${t("dashboard.ahaInsights", "\"Aha!\" Insights Engine")}`}
      description={description || t("caregiverDashboard.chartDesc", "Visually proving how consistent movement directly lowers symptom severity over time.")}
    />
  );
}
