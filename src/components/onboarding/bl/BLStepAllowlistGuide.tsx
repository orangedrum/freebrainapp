/**
 * BLStepAllowlistGuide — Parent flow: allowlist FreeBrain on the child's phone.
 *
 * Allowlist-only households (Screen Time / Family Link whitelists) must permit
 * three domains or the child's finish-link and videos won't load:
 *  1. This app's own domain (derived at runtime)
 *  2. The Supabase auth domain (magic links verify through it)
 *  3. YouTube (movement videos)
 * Skippable — most families don't restrict domains.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Volume2, ChevronRight, ShieldCheck, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPABASE_URL } from "@/lib/supabase";

interface BLStepAllowlistGuideProps {
  onNext: () => void;
  onBack?: () => void;
  speak: (text: string) => void;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const BLStepAllowlistGuide: React.FC<BLStepAllowlistGuideProps> = ({
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const domains = [window.location.host, hostOf(SUPABASE_URL), "youtube.com"];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
            {t("onboarding.bl.allowlistTitle", "Is your child's phone restricted?")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-1">
            {t("onboarding.bl.allowlistDesc", "If their phone only allows approved websites, permit these three so their finish-link and videos work. Otherwise, just skip ahead.")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() => speak(`${t("onboarding.bl.allowlistTitle", "Is your child's phone restricted?")}. ${t("onboarding.bl.allowlistDesc", "If their phone only allows approved websites, permit these three so their finish-link and videos work.")}`)}
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4 md:p-6 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t("onboarding.bl.allowlistDomainsLabel", "Allow these domains:")}
          </p>
          {domains.map((d) => (
            <p key={d} className="font-mono text-base md:text-lg font-bold text-foreground break-all">
              {d}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
          <p className="font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("onboarding.bl.allowlistIphoneTitle", "iPhone (Screen Time)")}
          </p>
          <ol className="text-sm md:text-base text-muted-foreground space-y-1 list-decimal list-inside">
            <li>{t("onboarding.bl.allowlistIphone1", "Settings → Screen Time → Content & Privacy Restrictions")}</li>
            <li>{t("onboarding.bl.allowlistIphone2", "Content Restrictions → Web Content → Allowed Websites Only")}</li>
            <li>{t("onboarding.bl.allowlistIphone3", "Add Website → enter each domain above")}</li>
          </ol>
        </div>
        <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
          <p className="font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("onboarding.bl.allowlistAndroidTitle", "Android (Family Link)")}
          </p>
          <ol className="text-sm md:text-base text-muted-foreground space-y-1 list-decimal list-inside">
            <li>{t("onboarding.bl.allowlistAndroid1", "Open Family Link → select your child's account")}</li>
            <li>{t("onboarding.bl.allowlistAndroid2", "Controls → Content restrictions → Google Chrome")}</li>
            <li>{t("onboarding.bl.allowlistAndroid3", "Allow access to these sites → add each domain above")}</li>
          </ol>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
          {t("onboarding.continue", "Continue")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onNext}
        >
          {t("onboarding.skip", "Skip for now")}
        </Button>
        {onBack && (
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            {t("onboarding.back", "Back")}
          </Button>
        )}
      </div>
    </div>
  );
};
