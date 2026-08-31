import { DailyBrainFact } from "@/components/shared/DailyBrainFact";

/**
 * FreeBrainer dashboard section: Daily Brain Fact.
 *
 * Thin wrapper around the shared DailyBrainFact component so the
 * FreeBrainer dashboard composes sections modularly. The shared
 * component already handles all i18n internally.
 */
export function DailyBrainFactSection() {
  return <DailyBrainFact />;
}
