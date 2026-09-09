import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, Users } from "lucide-react";
import { getAvatarUrl, getInitials } from "@/lib/avatar";
import { searchUsersForInvite, getRoleLocaleKey, DirectoryUser } from "@/lib/userDirectory";

interface ExistingUserSearchProps {
  onConnect: (user: DirectoryUser) => void | Promise<void>;
  connectLabel?: string;
  busyUserId?: string | null;
  disabled?: boolean;
  /** When false, results are informational only (no connect button — e.g. "is this person already on FreeBrain?"). */
  showConnectButton?: boolean;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function ExistingUserSearch({
  onConnect,
  connectLabel,
  busyUserId,
  disabled,
  showConnectButton = true,
}: ExistingUserSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const clean = query.trim();
    if (clean.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      setErrorMsg(null);
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    timerRef.current = setTimeout(async () => {
      const found = await searchUsersForInvite(clean);
      setResults(found);
      setIsSearching(false);
      setHasSearched(true);
      if (!found.length) setErrorMsg(t("inviteSearch.noResults"));
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, t]);

  const label = connectLabel || t("inviteSearch.connect");

  return (
    <div className="space-y-3 min-w-0">
      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
        {t("inviteSearch.label")}
      </Label>

      <div className="relative min-w-0">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="h-11 pl-9 text-sm border-2 w-full"
          placeholder={t("inviteSearch.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2 min-w-0">
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("inviteSearch.searching")}
          </div>
        )}

        {!isSearching && !hasSearched && query.trim().length < MIN_QUERY_LENGTH && (
          <p className="text-xs text-muted-foreground py-1">{t("inviteSearch.startTyping")}</p>
        )}

        {!isSearching && hasSearched && results.length === 0 && !errorMsg && (
          <p className="text-xs text-muted-foreground py-1">{t("inviteSearch.noResults")}</p>
        )}

        {!isSearching && errorMsg && (
          <p className="text-xs text-danger py-1">{errorMsg}</p>
        )}

        {!isSearching &&
          results.map((user) => {
            const roleKey = getRoleLocaleKey(user.role);
            const isBusy = busyUserId === user.user_id;
            return (
              <div
                key={user.user_id}
                className="flex items-center gap-3 rounded-xl border-2 border-muted/60 bg-muted/30 p-2.5 min-w-0"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={getAvatarUrl(user.display_name || user.user_id)} alt={user.display_name || ""} />
                  <AvatarFallback className="bg-info/20 text-info text-xs font-bold">
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.display_name || "FreeBrainer"}
                  </p>
                  <Badge variant="outline" className="mt-0.5 text-[10px] px-2 py-0 border-primary/20 text-primary font-medium">
                    {t(`roles.${roleKey}`, roleKey)}
                  </Badge>
                </div>
                {showConnectButton ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 shrink-0 gap-1.5 border-2 text-xs font-medium"
                    onClick={() => onConnect(user)}
                    disabled={disabled || isBusy}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {isBusy ? t("inviteSearch.connecting") : label}
                  </Button>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-1 border-success/30 text-success font-medium">
                    {t("inviteSearch.alreadyOn")}
                  </Badge>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}