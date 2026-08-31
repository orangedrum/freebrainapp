/**
 * BulkInviteFreeBrainerModal — Multi-invite modal for BrainLovers/Pros.
 * Sends magic-link emails to multiple FreeBrainers at once.
 *
 * Logic lives in `useBulkInvite` hook — this is just the modal UI wrapper.
 * Fully i18n via `bulkInviteModal` namespace.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, Loader2, Brain, CheckCircle2 } from "lucide-react";
import { useBulkInvite } from "./useBulkInvite";

interface BulkInviteFreeBrainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverId: string;
}

export function BulkInviteFreeBrainerModal({
  open,
  onOpenChange,
  caregiverId,
}: BulkInviteFreeBrainerModalProps) {
  const { t } = useTranslation();
  const {
    rows,
    validRows,
    isSending,
    sentCount,
    addRow,
    removeRow,
    updateRow,
    resetRows,
    sendInvites,
  } = useBulkInvite(caregiverId);

  const handleSend = async () => {
    await sendInvites();
    if (sentCount === 0) {
      // Close modal after successful send
      setTimeout(() => onOpenChange(false), 2000);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) resetRows();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Brain className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                {t("bulkInviteModal.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {t("bulkInviteModal.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 min-w-0 overflow-y-auto flex-1">
          {sentCount > 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-lg font-bold">
                {t("bulkInviteModal.invitesSentTitle", { count: sentCount })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("bulkInviteModal.invitesSentDesc")}
              </p>
            </div>
          ) : (
            <>
              {rows.map((row, index) => (
                <div key={index} className="flex gap-2 items-start min-w-0">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                    <Input
                      type="email"
                      placeholder={t("bulkInviteModal.emailPlaceholder")}
                      value={row.email}
                      onChange={(e) => updateRow(index, "email", e.target.value)}
                      className="h-10 border-2 text-sm min-w-0"
                    />
                    <Input
                      type="text"
                      placeholder={t("bulkInviteModal.namePlaceholder")}
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value)}
                      className="h-10 border-2 text-sm min-w-0"
                    />
                  </div>
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-2 border-dashed gap-1.5 text-sm"
                onClick={addRow}
              >
                <Plus className="h-4 w-4 text-primary" />{" "}
                {t("bulkInviteModal.addAnother")}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className="text-xs">
                  {t("bulkInviteModal.validEmails", { count: validRows.length })}
                </Badge>
                <Button
                  onClick={handleSend}
                  disabled={isSending || validRows.length === 0}
                  className="gap-2 font-bold"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("bulkInviteModal.sendInvites", {
                        count: validRows.length,
                      })}
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">
                  {t("bulkInviteModal.noEmailForSomeTitle")}
                </strong>{" "}
                {t("bulkInviteModal.noEmailForSomeDesc")}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
