/**
 * BrainLoverCheckInModal — wraps the full CheckInFlow for a BrainLover
 * checking in their FreeBrainer.
 *
 * Instead of the simplified inline BrainLoverJointCheckInCard, this opens
 * the SAME multi-step modal experience the FreeBrainer sees (movement
 * choice → time → video → symptoms → review → mystery box), but writes
 * the check-in to the FreeBrainer's user_id via useCheckInData's
 * overrideUserId option.
 *
 * Reuses: useCheckInData, CheckInFlow — no redundant code.
 */
import { useCallback } from "react";
import { useCheckInData } from "@/features/checkin/useCheckInData";
import { CheckInFlow } from "@/features/checkin/CheckInFlow";

export interface BrainLoverCheckInModalProps {
  /** Whether the modal should be open */
  isOpen: boolean;
  /** Called when the modal should close */
  onOpenChange: (open: boolean) => void;
  /** The FreeBrainer's user ID to check in on behalf of */
  patientId: string;
  /** The FreeBrainer's email (for wall posts / display) */
  patientEmail?: string;
  /** Called after a successful check-in so parent can refresh */
  onCheckedIn?: () => void;
}

export function BrainLoverCheckInModal({
  isOpen,
  onOpenChange,
  patientId,
  patientEmail,
  onCheckedIn,
}: BrainLoverCheckInModalProps) {
  const ci = useCheckInData({
    overrideUserId: patientId,
    overrideEmail: patientEmail,
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
      if (!open) onCheckedIn?.();
    },
    [onOpenChange, onCheckedIn]
  );

  // Don't return null while fetching — that prevents the Sheet from ever
  // rendering. The CheckInFlow sheet handles its own loading states, and
  // the auto-close effect in CheckInFlow now waits for isFetching to be
  // false before checking hasCheckedInToday.
  return (
    <CheckInFlow
      checkInData={ci as any}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      perspective="proxy"
      onComplete={() => {
        // Mystery box handles closing via its "Finish" button.
      }}
    />
  );
}
