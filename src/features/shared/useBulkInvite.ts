/**
 * useBulkInvite — Shared hook for multi-email FreeBrainer invitations.
 *
 * Extracted from both BulkInviteFreeBrainerModal and ProBulkInvitePanel
 * so there is ONE source of truth for the OTP send logic, row management,
 * and validation. Both the modal and the inline panel consume this hook.
 *
 * i18n: uses `bulkInviteModal.*` namespace for toast messages.
 */
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export interface InviteRow {
  email: string;
  name: string;
}

const EMPTY_ROWS: InviteRow[] = [
  { email: "", name: "" },
  { email: "", name: "" },
  { email: "", name: "" },
  { email: "", name: "" },
  { email: "", name: "" },
];

export function useBulkInvite(caregiverId: string) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<InviteRow[]>(EMPTY_ROWS);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const addRow = useCallback(
    () => setRows((prev) => [...prev, { email: "", name: "" }]),
    []
  );

  const removeRow = useCallback(
    (index: number) => setRows((prev) => prev.filter((_, i) => i !== index)),
    []
  );

  const updateRow = useCallback(
    (index: number, field: keyof InviteRow, value: string) =>
      setRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
      ),
    []
  );

  const resetRows = useCallback(() => setRows(EMPTY_ROWS), []);

  const validRows = rows.filter(
    (r) => r.email.trim() && r.email.includes("@")
  );

  const sendInvites = useCallback(async () => {
    if (validRows.length === 0) {
      toast({
        title: t("bulkInviteModal.noValidEmailsTitle"),
        description: t("bulkInviteModal.noValidEmailsDesc"),
        variant: "destructive",
      });
      return 0;
    }

    setIsSending(true);
    let successCount = 0;

    for (const row of validRows) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: row.email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/join?caregiver_id=${caregiverId}&role=caregiver`,
            shouldCreateUser: true,
          },
        });
        if (error) {
          console.warn(
            `OTP invite error for ${row.email} (non-fatal):`,
            error.message
          );
        }
        successCount++;
      } catch (err) {
        console.warn(`Failed to invite ${row.email}:`, err);
      }
    }

    setIsSending(false);
    setSentCount(successCount);
    toast({
      title: t("bulkInviteModal.invitesSentTitle", { count: successCount }),
      description: t("bulkInviteModal.invitesSentDesc"),
    });

    // Reset after short delay (caller can also reset manually)
    setTimeout(() => {
      resetRows();
      setSentCount(0);
    }, 2000);

    return successCount;
  }, [caregiverId, resetRows, t, toast, validRows.length]);

  return {
    rows,
    validRows,
    isSending,
    sentCount,
    addRow,
    removeRow,
    updateRow,
    resetRows,
    sendInvites,
  };
}
