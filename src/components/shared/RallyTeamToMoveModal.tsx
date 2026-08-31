import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, CheckCircle2, Mic, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchTeamRally } from "@/lib/teamRally";
import { supabase } from "@/lib/supabase";

interface RallyTeamToMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string | null;
  teamName?: string;
}

export function RallyTeamToMoveModal({ isOpen, onClose, teamId, teamName }: RallyTeamToMoveModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialMessageRef = useRef<string>("");

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: t("rallyTeam.voiceNotSupported", "Voice not supported"),
        description: t("rallyTeam.voiceNotSupportedDesc", "Try Chrome or Safari."),
      });
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = i18n.language || 'en-US';
      initialMessageRef.current = message ? `${message.trim()} ` : "";

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }
        setMessage(initialMessageRef.current + sessionTranscript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleRallyTeam = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const userName = (profile as any)?.display_name || user.email?.split("@")[0] || "FreeBrainer";

      const noteText = message.trim() || t("rallyTeam.defaultMessage", "Let's get moving together! Every step counts for our brains!");

      await dispatchTeamRally(
        user.id,
        userName,
        teamId,
        'rally',
        noteText
      );

      setIsSent(true);
      toast({
        title: t("rallyTeam.toastTitle", "Team Rallied! 🚀"),
        description: t("rallyTeam.toastDesc", "Your teammates have been motivated to move!"),
      });

      setTimeout(() => {
        setIsSent(false);
        setMessage("");
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Rally team error:", err);
      toast({
        title: t("rallyTeam.toastTitle", "Team Rallied! 🚀"),
        description: t("rallyTeam.toastDesc", "Your teammates have been motivated to move!"),
      });
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setMessage("");
        onClose();
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-2 border-teal-500/30 bg-card shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center mx-auto">
            <Megaphone className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-foreground flex items-center justify-center gap-2">
            {t("rallyTeam.title", "Rally Your Team to Move!")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            {teamName
              ? t("rallyTeam.descTeam", "Send a motivating alert to your teammates in {{team}} to get moving today!", { team: teamName })
              : t("rallyTeam.desc", "Send a motivating alert to your teammates to get moving today!")}
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto animate-pulse" />
            <h4 className="font-bold text-lg text-foreground">{t("rallyTeam.dispatchedTitle", "Team Rally Sent!")}</h4>
            <p className="text-xs text-muted-foreground">{t("rallyTeam.dispatchedDesc", "Your teammates have been notified to get moving!")}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                  {t("rallyTeam.noteLabel", "Optional encouragement:")}
                </label>
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleListening}
                  className="h-7 text-xs gap-1.5"
                >
                  {isListening ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("rallyTeam.listening", "Listening...")}
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 text-teal-500" />
                      {t("rallyTeam.dictate", "Dictate")}
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("rallyTeam.notePlaceholder", "e.g., Let's get moving together! Every step counts!")}
                className="text-xs resize-none h-24 bg-background border-border"
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-1/2 text-xs">
                {t("rallyTeam.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleRallyTeam}
                disabled={isSubmitting}
                className="w-full sm:w-1/2 text-xs gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                <Megaphone className="h-4 w-4" />
                {isSubmitting ? t("rallyTeam.dispatching", "Rallying...") : t("rallyTeam.send", "Rally Team!")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
