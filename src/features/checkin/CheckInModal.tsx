/**
 * CheckInModal — the auto-popup check-in experience.
 *
 * This is a blocking bottom-sheet modal that pops up on the FreeBrainer
 * dashboard when they haven't checked in yet today. It reuses the existing
 * CheckInFlow component for the actual multi-step experience.
 *
 * Behavior:
 *  - Auto-opens on every dashboard visit if the user hasn't checked in today.
 *  - Cannot be dismissed (blocking) until check-in is complete.
 *  - After completion, the mystery box "Finish" button closes the modal.
 *
 * Data: Uses useCheckInData (same hook the old DailyCheckIn page used).
 */
import { useCallback } from "react";
import { useCheckInData } from "./useCheckInData";
import { CheckInFlow } from "./CheckInFlow";

export interface CheckInModalProps {
  /** Whether the modal should be open */
  isOpen: boolean;
  /** Called when the modal should close (only after check-in completion) */
  onOpenChange: (open: boolean) => void;
}

export function CheckInModal({ isOpen, onOpenChange }: CheckInModalProps) {
  const ci = useCheckInData();

  // When the sheet closes after completion, refresh overview data (NOT check-in data).
  // Calling ci.refetch() here would re-run getRandomPlaylistVideo(), creating
  // an infinite loop when the modal auto-reopens. The parent Overview component
  // already calls refetchOverview() on close, which is sufficient.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
    },
    [onOpenChange]
  );

  // Show loading state while data fetches
  if (ci.isFetching) {
    return null;
  }

  return (
    <CheckInFlow
      checkInData={ci}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onComplete={() => {
        // Don't close here — mystery box handles closing via its "Finish" button.
      }}
    />
  );
}
