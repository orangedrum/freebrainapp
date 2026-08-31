/**
 * VirtualSessionCalendar.tsx
 *
 * Reusable shared component showing a FreeBrainer's upcoming and past
 * virtual movement sessions — clean "Option 1" design.
 *
 * Features:
 *  - "Next Session" hero card with Join button (if one is upcoming)
 *  - Compact upcoming sessions list (below the hero)
 *  - Past sessions (collapsed by default)
 *  - "Schedule More" button (opens CalendlyModal)
 *
 * Data: Supabase `virtual_sessions` table (Tier 2 — social).
 * No Tier 1 (sensitive) data is touched.
 *
 * @param freebrainerEmail — email to filter sessions by
 * @param freebrainerName  — display name for the scheduling pre-fill
 * @param onSchedule      — callback to open the CalendlyModal
 */
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isPast } from "date-fns";
import { Video, Clock, ChevronDown, ChevronUp, Plus, CheckCircle2, CalendarPlus, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useVirtualSessions, type VirtualSession } from "@/features/sessions/useVirtualSessions";

interface VirtualSessionCalendarProps {
  freebrainerEmail: string | null | undefined;
  freebrainerName?: string | null;
  onSchedule: () => void;
}

export function VirtualSessionCalendar({
  freebrainerEmail,
  freebrainerName,
  onSchedule,
}: VirtualSessionCalendarProps) {
  const { t } = useTranslation();
  const { sessions, loading } = useVirtualSessions(freebrainerEmail);
  const [showPast, setShowPast] = useState(false);

  // Split into upcoming / past
  const { upcoming, past, nextSession } = useMemo(() => {
    const now = new Date();
    const up: VirtualSession[] = [];
    const pastS: VirtualSession[] = [];

    for (const s of sessions) {
      const start = parseISO(s.session_start);
      if (s.status === "cancelled") continue;
      if (isPast(start) || s.status === "completed") {
        pastS.push(s);
      } else {
        up.push(s);
      }
    }

    up.sort((a, b) => parseISO(a.session_start).getTime() - parseISO(b.session_start).getTime());
    pastS.sort((a, b) => parseISO(b.session_start).getTime() - parseISO(a.session_start).getTime());

    return { upcoming: up, past: pastS, nextSession: up[0] || null };
  }, [sessions]);

  // Button becomes visible 15 min before start; "Join Now" active from 10 min before to 30 min after
  const canShowJoinButton = (session: VirtualSession) => {
    if (!session.join_url) return false;
    const start = parseISO(session.session_start);
    const now = new Date();
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    return diffMin <= 15 && diffMin >= -30;
  };

  const canJoinNow = (session: VirtualSession) => {
    if (!session.join_url) return false;
    const start = parseISO(session.session_start);
    const now = new Date();
    const diffMin = (start.getTime() - now.getTime()) / 60000;
    return diffMin <= 10 && diffMin >= -30; // 10 min before to 30 min after
  };

  const formatSessionDate = (iso: string) => {
    const d = parseISO(iso);
    return format(d, "EEE MMM d, h:mm a");
  };

  // Test sessions have calendly_event_id starting with "TEST_"
  const isTestSession = (s: VirtualSession) =>
    !!s.calendly_event_id && s.calendly_event_id.startsWith("TEST_");

  // ─── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-2 border-primary/15 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-primary" />
            {t("sessions.title", "Your Virtual Sessions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("sessions.loading", "Loading sessions...")}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Gold CTA button (matches Aha Insights chart accent)
  const GoldScheduleButton = () => (
    <Button
      onClick={onSchedule}
      className="gap-2 font-bold bg-gold text-gold-foreground hover:opacity-90"
      size="sm"
    >
      <Plus className="h-4 w-4" />
      {t("sessions.scheduleFirst", "Schedule Your First Session")}
    </Button>
  );

  // ─── Empty state (no sessions at all) ────────────────────────
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <Card className="border-2 border-primary/15 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-primary" />
            {t("sessions.title", "Your Virtual Sessions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center space-y-3">
            <Video className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("sessions.emptySubtitle", "1-on-1 virtual calls keep users on track & motivated")}
            </p>
            <GoldScheduleButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Main content ────────────────────────────────────────────
  const restUpcoming = nextSession ? upcoming.slice(1) : upcoming;

  return (
    <Card className="border-2 border-primary/15 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          {t("sessions.title", "Your Virtual Sessions")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* No upcoming sessions banner (has past but no future) */}
        {!nextSession && upcoming.length === 0 && past.length > 0 && (
          <div className="rounded-xl border-2 border-primary/15 bg-muted/20 p-4 space-y-3 text-center">
            <Video className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">
              {t("sessions.noUpcoming", "No upcoming sessions!")}
            </p>
            <GoldScheduleButton />
          </div>
        )}

        {/* Next Session hero card */}
        {nextSession && (
          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4 space-y-2">
          <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1 text-xs">
                <Video className="h-3 w-3" />
                {t("sessions.nextSession", "Next Session")}
              </Badge>
              {isTestSession(nextSession) && (
                <Badge variant="outline" className="gap-1 text-xs border-warning text-warning font-bold uppercase">
                  <FlaskConical className="h-3 w-3" />
                  {t("sessions.testSession", "Test")}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="font-bold text-base">
                {formatSessionDate(nextSession.session_start)}
              </p>
              {nextSession.brainlover_name && (
                <p className="text-sm text-muted-foreground">
                  {t("sessions.with", "with")} {nextSession.brainlover_name}
                </p>
              )}
            </div>
            {nextSession.join_url && canShowJoinButton(nextSession) && (
              <Button
                asChild
                className="w-full gap-2 font-bold"
              >
                <a href={nextSession.join_url} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" />
                  {canJoinNow(nextSession)
                    ? t("sessions.joinNow", "Join Now")
                    : t("sessions.startingSoon", "Starting Soon — Join Now")}
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Upcoming sessions list (excluding the hero) */}
        {restUpcoming.length > 0 && (
          <div className="space-y-2">
            {restUpcoming.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                formatSessionDate={formatSessionDate}
                canJoinNow={canJoinNow}
                canShowJoinButton={canShowJoinButton}
                isTest={isTestSession(s)}
                compact
              />
            ))}
          </div>
        )}

        {/* Past sessions (collapsible) */}
        {past.length > 0 && (
          <Collapsible open={showPast} onOpenChange={setShowPast}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t("sessions.past", "Past Sessions")} ({past.length})
                </span>
                {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {past.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  formatSessionDate={formatSessionDate}
                  canJoinNow={canJoinNow}
                  canShowJoinButton={canShowJoinButton}
                  isTest={isTestSession(s)}
                  compact
                  isPastRow
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Schedule more button */}
        <Button onClick={onSchedule} variant="outline" className="w-full gap-2 font-semibold">
          <CalendarPlus className="h-4 w-4" />
          {t("sessions.scheduleAnother", "Schedule Another Session")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Session row sub-component ─────────────────────────────────
function SessionRow({
  session,
  formatSessionDate,
  canJoinNow,
  canShowJoinButton,
  isTest = false,
  compact = false,
  isPastRow = false,
}: {
  session: VirtualSession;
  formatSessionDate: (iso: string) => string;
  canJoinNow: (s: VirtualSession) => boolean;
  canShowJoinButton: (s: VirtualSession) => boolean;
  isTest?: boolean;
  compact?: boolean;
  isPastRow?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${
        isPastRow ? "bg-muted/30 opacity-70" : "bg-background"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clock className={`h-4 w-4 shrink-0 ${isPastRow ? "text-muted-foreground" : "text-primary"}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">
              {formatSessionDate(session.session_start)}
            </p>
            {isTest && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-warning text-warning font-bold uppercase shrink-0">
                <FlaskConical className="h-2.5 w-2.5" />
                {t("sessions.testSession", "Test")}
              </Badge>
            )}
          </div>
          {!compact && session.brainlover_name && (
            <p className="text-xs text-muted-foreground truncate">
              {t("sessions.with", "with")} {session.brainlover_name}
            </p>
          )}
        </div>
      </div>
      {isPastRow && (
        <Badge variant="secondary" className="text-xs shrink-0">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("sessions.completed", "Completed")}
        </Badge>
      )}
      {!isPastRow && session.join_url && canShowJoinButton(session) && (
        <Button asChild size="sm" className="shrink-0 gap-1">
          <a href={session.join_url} target="_blank" rel="noopener noreferrer">
            <Video className="h-3.5 w-3.5" />
            {t("sessions.join", "Join")}
          </a>
        </Button>
      )}
    </div>
  );
}
