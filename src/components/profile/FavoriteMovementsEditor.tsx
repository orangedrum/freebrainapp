/**
 * FavoriteMovementsEditor — tag editor for favorite movements/exercises.
 *
 * Extracted from ProfileTags (which combined movements + symptoms).
 * Now only handles favorite movements — wellness params have their own
 * dedicated WellnessParamsSelector component.
 */
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Dumbbell, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FavoriteMovementsEditorProps {
  favoriteMovements: string[];
  setFavoriteMovements: (val: string[]) => void;
}

export const FavoriteMovementsEditor: React.FC<FavoriteMovementsEditorProps> = ({
  favoriteMovements,
  setFavoriteMovements,
}) => {
  const { t } = useTranslation();
  const [newMovement, setNewMovement] = React.useState("");

  const addMovement = () => {
    if (newMovement.trim() && !favoriteMovements.includes(newMovement.trim())) {
      setFavoriteMovements([...favoriteMovements, newMovement.trim()]);
      setNewMovement("");
    }
  };

  const removeMovement = (m: string) => {
    setFavoriteMovements(favoriteMovements.filter((item) => item !== m));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          {t("profile.favoriteMovements")}
        </CardTitle>
        <CardDescription>
          {t("profile.favoriteMovementsDesc", "Add movements you enjoy — we'll prioritize them in your check-in videos.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newMovement}
            onChange={(e) => setNewMovement(e.target.value)}
            placeholder={t("profile.addMovementPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMovement())}
            className="min-h-[44px]"
          />
          <Button type="button" onClick={addMovement} size="icon" variant="secondary" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {favoriteMovements.map((m) => (
            <Badge key={m} variant="secondary" className="py-1.5 px-3 text-sm flex items-center gap-1.5">
              {m}
              <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => removeMovement(m)} />
            </Badge>
          ))}
          {favoriteMovements.length === 0 && (
            <p className="text-sm text-muted-foreground italic">{t("profile.noMovementsYet")}</p>
          )}
        </div>

        {/* Smart matching tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
          <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground break-words">
            {t("playlistManager.smartHint", "Smart suggestions: Like videos you enjoy and they'll appear more often in your recommendations.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
