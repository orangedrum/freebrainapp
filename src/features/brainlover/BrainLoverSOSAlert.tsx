/**
 * BrainLoverSOSAlert — shows when the selected FreeBrainer has triggered
 * an SOS / Hard Day alert. Lets the BrainLover send extra words of
 * encouragement and optionally heart the FreeBrainer's community post.
 *
 * Reuses sendBrainLoverInteraction for the cheer + localStorage for
 * tracking the heart-queue. No new data layer.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Heart, Send, Mic, Loader2 } from "lucide-react";
import { sendBrainLoverInteraction } from "@/lib/brainloverInteractions";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface BrainLoverSOSAlertProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  caregiverEmail?: string;
}

export function BrainLoverSOSAlert({
  patientId,
  patientName,
  caregiverId,
  caregiverEmail,
}: BrainLoverSOSAlertProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { isListening, toggle } = useSpeechRecognition({
    getInitialText: () => message,
  });

  const firstName = patientName.split(" ")[0];

  const handleSend = async () => {
    setSending(true);
    const senderName = caregiverEmail?.split("@")[0] || "BrainLover";
    try {
      await sendBrainLoverInteraction(patientId, caregiverId, senderName, "cheer", {
        customMessage: message.trim() || t("loveTheirBrain.sosDefaultMessage", "I see you're having a hard day. I'm here for you — you've got this! 💪"),
      });

      // Queue a heart on the FreeBrainer's community post
      const heartQueueStr = localStorage.getItem("fb_heart_queue");
      const heartQueue: string[] = heartQueueStr ? JSON.parse(heartQueueStr) : [];
      heartQueue.push(patientId);
      localStorage.setItem("fb_heart_queue", JSON.stringify(heartQueue));

      setSent(true);
      toast({
        title: t("loveTheirBrain.sosSentTitle", "Encouragement Sent! ❤️"),
        description: t("loveTheirBrain.sosSentDesc", "Your message and a heart were sent to {{name}}.", { name: firstName }),
      });
    } catch (e) {
      toast({ title: t("loveTheirBrain.sosError", "Failed to send"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-danger/40 bg-danger/5 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-danger animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-danger text-sm sm:text-base">
              {t("loveTheirBrain.sosTitle", "{{name}} Needs Extra Love", { name: firstName })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("loveTheirBrain.sosDesc", "They triggered an SOS. Send words of encouragement and heart their community post.")}
            </p>
          </div>
        </div>

        {sent ? (
          <div className="py-4 text-center">
            <Heart className="h-8 w-8 text-rose-500 fill-rose-500 mx-auto animate-pulse" />
            <p className="text-sm font-semibold mt-2">{t("loveTheirBrain.sosDelivered", "Delivered! ❤️")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("loveTheirBrain.sosMessageLabel", "Your message:")}
                </label>
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggle(setMessage)}
                  className="h-7 text-xs gap-1.5"
                >
                  {isListening ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                  {isListening ? t("loveTheirBrain.listening", "Listening...") : t("loveTheirBrain.dictate", "Dictate")}
                </Button>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("loveTheirBrain.sosPlaceholder", "Write a few words of encouragement...")}
                maxLength={200}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="gap-2 bg-danger hover:bg-danger/90 text-white font-bold text-sm flex-1"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("loveTheirBrain.sendEncouragement", "Send Encouragement")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const heartQueueStr = localStorage.getItem("fb_heart_queue");
                  const heartQueue: string[] = heartQueueStr ? JSON.parse(heartQueueStr) : [];
                  heartQueue.push(patientId);
                  localStorage.setItem("fb_heart_queue", JSON.stringify(heartQueue));
                  toast({ title: t("loveTheirBrain.heartQueued", "Heart queued! ❤️") });
                }}
                className="gap-2 text-sm"
              >
                <Heart className="h-4 w-4 text-rose-500" />
                {t("loveTheirBrain.heartPost", "Heart Post")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
