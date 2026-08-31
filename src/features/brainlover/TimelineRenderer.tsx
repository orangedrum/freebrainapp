/**
 * TimelineRenderer — renders a chronological list of TimelineEvents
 * grouped by day (Today, Yesterday, date headers).
 *
 * Each event is a row with an icon + title + optional description + time.
 * Clean, scannable, accessible.
 *
 * i18n keys used: brainLoverUpdates.timeline.*
 */
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Moon,
  FlaskConical,
  Heart,
  Zap,
  Video,
  Bell,
  Users,
  Lightbulb,
  Flame,
  AlertCircle,
  Calendar,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "./useBrainLoverUpdates";

const ICON_MAP: Record<TimelineEventType, typeof CheckCircle2> = {
  checkin_moved: CheckCircle2,
  checkin_rested: Moon,
  checkin_tested: FlaskConical,
  cheer: Heart,
  boost: Zap,
  recommend_video: Video,
  poke: Bell,
  joint_move: Users,
  activity_log: Users,
  aha_insight: Lightbulb,
  streak_milestone: Flame,
  sos: AlertCircle,
  virtual_session: Calendar,
};

const COLOR_MAP: Record<TimelineEventType, string> = {
  checkin_moved: "text-success",
  checkin_rested: "text-info",
  checkin_tested: "text-warning",
  cheer: "text-success",
  boost: "text-gold",
  recommend_video: "text-primary",
  poke: "text-warning",
  joint_move: "text-success",
  activity_log: "text-muted-foreground",
  aha_insight: "text-gold",
  streak_milestone: "text-warning",
  sos: "text-destructive",
  virtual_session: "text-info",
};

/** Convert an ISO timestamp to a local-date key (YYYY-MM-DD in local tz). */
function localDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD key as a local Date (NOT UTC midnight). */
function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDayHeader(dateKey: string, t: any): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const eventDay = parseLocalDate(dateKey);
  eventDay.setHours(0, 0, 0, 0);

  if (eventDay.getTime() === today.getTime()) return t("brainLoverUpdates.timeline.today", "Today");
  if (eventDay.getTime() === yesterday.getTime()) return t("brainLoverUpdates.timeline.yesterday", "Yesterday");
  return eventDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TimelineRenderer({ events }: { events: TimelineEvent[] }) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("brainLoverUpdates.timeline.empty", "No activity yet. Check back after your FreeBrainer moves!")}
        </p>
      </div>
    );
  }

  // Group by local day
  const grouped: Record<string, TimelineEvent[]> = {};
  events.forEach((e) => {
    const dayKey = localDateKey(e.timestamp);
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(e);
  });

  // Sort day keys descending — localDateKey returns YYYY-MM-DD so lexicographic sort works
  const dayKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {dayKeys.map((dayKey) => {
        const dayEvents = grouped[dayKey];
        return (
          <section key={dayKey} aria-label={formatDayHeader(dayKey, t)}>
            {/* Day header */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-wide">
                {formatDayHeader(dayKey, t)}
              </h3>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/70">
                {dayEvents.length} {dayEvents.length === 1 ? t("brainLoverUpdates.timeline.event", "event") : t("brainLoverUpdates.timeline.events", "events")}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const Icon = ICON_MAP[event.type] || CheckCircle2;
                const colorClass = COLOR_MAP[event.type] || "text-muted-foreground";
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card/60 border border-border/50"
                  >
                    <div className={`shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.authorName && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {t("brainLoverUpdates.timeline.by", "by")} {event.authorName}
                        </p>
                      )}
                    </div>
                    <time
                      className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5"
                      dateTime={event.timestamp}
                    >
                      {formatTime(event.timestamp)}
                    </time>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
