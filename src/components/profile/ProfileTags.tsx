import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProfileTagsProps {
  favoriteMovements: string[];
  setFavoriteMovements: (val: string[]) => void;
  symptoms: string[];
  setSymptoms: (val: string[]) => void;
}

export const ProfileTags: React.FC<ProfileTagsProps> = ({
  favoriteMovements,
  setFavoriteMovements,
  symptoms,
  setSymptoms,
}) => {
  const { t } = useTranslation();
  const [newMovement, setNewMovement] = React.useState("");
  const [newSymptom, setNewSymptom] = React.useState("");

  const addMovement = () => {
    if (newMovement.trim() && !favoriteMovements.includes(newMovement.trim())) {
      setFavoriteMovements([...favoriteMovements, newMovement.trim()]);
      setNewMovement("");
    }
  };

  const removeMovement = (m: string) => {
    setFavoriteMovements(favoriteMovements.filter((item) => item !== m));
  };

  const addSymptom = () => {
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom("");
    }
  };

  const removeSymptom = (s: string) => {
    setSymptoms(symptoms.filter((item) => item !== s));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Favorite Movements */}
      <div className="bg-card p-6 rounded-xl border space-y-4">
        <Label className="text-base font-bold">
          {t("profile.favoriteMovements", "Favorite Movements & Exercises")}
        </Label>
        <div className="flex gap-2">
          <Input
            value={newMovement}
            onChange={(e) => setNewMovement(e.target.value)}
            placeholder={t("profile.addMovementPlaceholder", "e.g. Seated Boxing")}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMovement())}
          />
          <Button type="button" onClick={addMovement} size="icon" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {favoriteMovements.map((m) => (
            <Badge key={m} variant="secondary" className="py-1 px-3 text-sm flex items-center gap-1.5">
              {m}
              <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => removeMovement(m)} />
            </Badge>
          ))}
          {favoriteMovements.length === 0 && (
            <p className="text-sm text-muted-foreground italic">{t("profile.noMovementsYet", "No favorite movements added yet.")}</p>
          )}
        </div>
      </div>

      {/* Tracked Symptoms & Wellness Parameters */}
      <div className="bg-card p-6 rounded-xl border space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">
            {t("profile.trackedSymptoms", "Tracked Wellness Parameters")}
          </Label>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t("profile.generalWellnessLabel", "General Wellness")}</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            placeholder={t("profile.addSymptomPlaceholder", "e.g. Movement Ease, Flexibility")}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
          />
          <Button type="button" onClick={addSymptom} size="icon" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {symptoms.map((s) => (
            <Badge key={s} variant="outline" className="py-1 px-3 text-sm flex items-center gap-1.5 bg-primary/5">
              {s}
              <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => removeSymptom(s)} />
            </Badge>
          ))}
          {symptoms.length === 0 && (
            <p className="text-sm text-muted-foreground italic">{t("profile.noWellnessParamsYet", "No wellness parameters added yet.")}</p>
          )}
        </div>
      </div>
    </div>
  );
};
