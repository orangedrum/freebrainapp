import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepRoleSelectionProps {
  onSelect: (flow: "freebrainer" | "brainlover") => void;
}

export const StepRoleSelection: React.FC<StepRoleSelectionProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t("onboarding.welcome", "Welcome to FreeBrain")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("onboarding.selectRole", "How will you be using FreeBrain today?")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <Card
          className="cursor-pointer hover:border-primary transition-all duration-200 border-2"
          onClick={() => onSelect("freebrainer")}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Activity className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">
                {t("onboarding.freebrainerRole", "I am a FreeBrainer")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("onboarding.freebrainerDesc", "I am tracking my own movement, symptoms, and brain health journey.")}
              </p>
            </div>
            <Button className="w-full mt-2 font-bold">{t("onboarding.continueFreebrainer", "Continue as FreeBrainer")}</Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-all duration-200 border-2"
          onClick={() => onSelect("brainlover")}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-accent/10 text-accent">
              <Heart className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">
                {t("onboarding.brainloverRole", "I am a BrainLover")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("onboarding.brainloverDesc", "I am supporting a loved one, family member, or patient as a caregiver or pro.")}
              </p>
            </div>
            <Button variant="outline" className="w-full mt-2 font-bold">{t("onboarding.continueBrainlover", "Continue as BrainLover")}</Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => navigate("/auth")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          {t("onboarding.alreadyHaveAccount", "I already have an account")}
        </button>
      </div>
    </div>
  );
};
