/**
 * ProBulkInvitePanel — Inline panel (not a modal) for BrainLover Pros to
 * invite multiple FreeBrainers at once via email.
 *
 * Logic lives in `useBulkInvite` hook — this is just the inline card UI.
 * i18n: `pro.bulkInvite.*` for panel title, `bulkInviteModal.*` for shared strings.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, Loader2, Users, CheckCircle2 } from "lucide-react";
import { useBulkInvite } from "@/features/shared/useBulkInvite";

interface ProBulkInvitePanelProps {
  proId: string;
  onInvited?: () => void;
}

export function ProBulkInvitePanel({ proId, onInvited }: ProBulkInvitePanelProps) {
  const { t } = useTranslation();
  const {
    rows,
    validRows,
    isSending,
    sentCount,
    addRow,
    removeRow,
    updateRow,
    sendInvites,
  } = useBulkInvite(proId);

  const handleSend = async () => {
    const count = await sendInvites();
    if (count > 0) onInvited?.();
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold text-foreground">
            {t("pro.bulkInvite.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("pro.bulkInvite.description")}
          </p>
        </div>
      </div>

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
          <div className="space-y-3">
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
          </div>

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
                  {t("bulkInviteModal.sendInvites", { count: validRows.length })}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
