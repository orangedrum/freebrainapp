import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CONDITIONS } from "./constants";
import { X, Search, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepConditionProps {
  conditions: string[];
  setConditions: React.Dispatch<React.SetStateAction<string[]>>;
  conditionSearch: string;
  setConditionSearch: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
  speak?: (text: string) => void;
}

export const StepCondition: React.FC<StepConditionProps> = ({
  conditions,
  setConditions,
  conditionSearch,
  setConditionSearch,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();

  const toggleCondition = (cond: string) => {
    if (conditions.includes(cond)) {
      setConditions(conditions.filter((c) => c !== cond));
    } else {
      setConditions([...conditions, cond]);
    }
  };

  const filteredConditions = CONDITIONS.filter((cond) =>
    cond.toLowerCase().includes(conditionSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {t("onboarding.selectConditions", "What condition(s) are you living with?")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.conditionsDesc", "Select all that apply. This helps us customize your daily movement recommendations.")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.selectConditions")}. ${t("onboarding.conditionsDesc")}`
              )
            }
          >
            <Volume2 className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("onboarding.searchConditions", "Search condition...")}
          value={conditionSearch}
          onChange={(e) => setConditionSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
        {filteredConditions.map((cond) => {
          const isSelected = conditions.includes(cond);
          return (
            <Badge
              key={cond}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer py-2 px-3 text-sm transition-all ${
                isSelected ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"
              }`}
              onClick={() => toggleCondition(cond)}
            >
              {cond}
              {isSelected && <X className="ml-1.5 h-3.5 w-3.5" />}
            </Badge>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          {t("common.back", "Back")}
        </Button>
        <Button
          onClick={onNext}
          disabled={conditions.length === 0}
          className="font-bold px-6"
        >
          {t("common.next", "Next")}
        </Button>
      </div>
    </div>
  );
};
