/**
 * BulkRecommendModal — wraps RecommendVideoModal to send a video to all teammates.
 *
 * Reuses RecommendVideoModal with the bulkRecipientIds prop so the user
 * browses/shuffles once, and the same video + message goes to every teammate.
 */
import { useTranslation } from "react-i18next";
import { RecommendVideoModal } from "@/components/shared/RecommendVideoModal";
import type { TeamMember } from "@/features/freebrainer/useTeamRoster";

interface BulkRecommendModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  senderName: string;
  onDone: () => void;
}

export function BulkRecommendModal({ isOpen, onClose, members, senderName, onDone }: BulkRecommendModalProps) {
  const { t } = useTranslation();
  const firstMember = members[0];
  if (!firstMember) return null;

  const bulkIds = members.map((m) => m.user_id).filter((id) => id !== firstMember.user_id);

  return (
    <RecommendVideoModal
      isOpen={isOpen}
      onClose={() => { onClose(); onDone(); }}
      patientId={firstMember.user_id}
      patientName={t("roster.allTeammates", "All Teammates")}
      senderName={senderName}
      bulkRecipientIds={bulkIds}
    />
  );
}
