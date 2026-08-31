import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarUrl, getInitials } from "@/lib/avatar";
import type { PatientLink } from "./types";

interface FreeBrainerSelectorProps {
  patients: PatientLink[];
  selectedPatientId: string;
  onSelect: (id: string) => void;
}

/**
 * Full-width FreeBrainer selector — shown only when a BrainLover
 * supports multiple FreeBrainers. Renders as a prominent card-style
 * dropdown at the top of the dashboard.
 */
export function FreeBrainerSelector({
  patients,
  selectedPatientId,
  onSelect,
}: FreeBrainerSelectorProps) {
  const { t } = useTranslation();

  if (patients.length <= 1) return null;

  const selected =
    patients.find((p) => p.user_id === selectedPatientId) || patients[0];

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm px-4 py-3">
      <label className="block text-sm font-bold text-foreground mb-2">
        {t(
          "caregiverDashboard.whichFreeBrainer",
          "Which FreeBrainer are you supporting?"
        )}
      </label>
      <Select value={selectedPatientId} onValueChange={onSelect}>
        <SelectTrigger className="w-full h-12 text-sm font-semibold border-border bg-background/50 focus:ring-2 focus:ring-ring/40">
          <div className="flex items-center gap-3 w-full">
            <Avatar className="h-8 w-8 shrink-0">
              {selected?.avatar_url ? (
                <AvatarImage
                  src={selected.avatar_url}
                  alt={selected.display_name}
                />
              ) : (
                <AvatarImage
                  src={getAvatarUrl(selected?.display_name)}
                  alt={selected?.display_name}
                />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(selected?.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-left truncate">
              {selected?.display_name}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {patients.map((p) => (
            <SelectItem
              key={p.user_id}
              value={p.user_id}
              className="text-sm font-medium"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  {p.avatar_url ? (
                    <AvatarImage src={p.avatar_url} alt={p.display_name} />
                  ) : (
                    <AvatarImage
                      src={getAvatarUrl(p.display_name)}
                      alt={p.display_name}
                    />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(p.display_name)}
                  </AvatarFallback>
                </Avatar>
                {p.display_name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
