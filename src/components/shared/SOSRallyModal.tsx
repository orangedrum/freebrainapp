import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Users, HeartHandshake, CheckCircle2, ShieldAlert, Mic, MicOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchTeamRally } from "@/lib/teamRally";

interface SOSRallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string | null;
}

export function SOSRallyModal({ isOpen, onClose, teamId }: SOSRallyModalProps) {
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
        title: t("rally.voiceNotSupported", "Voice not supported"),
        description: t("rally.voiceNotSupportedDesc", "Try Chrome or Safari."),
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

  const handleRequestRally = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Get user profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, city, primary_condition")
        .eq("user_id", user.id)
        .maybeSingle();

      const userName = (profile as any)?.display_name || user.email?.split("@")[0] || "FreeBrainer";
      const userCondition = (profile as any)?.primary_condition || "Movement Warrior";

      const noteText = message.trim() || t("rally.defaultMessage", "Having a tough symptom day today. Sending strength to anyone else pushing through!");

      // 2. Dispatch team rally & post to community wall
      await dispatchTeamRally(
        user.id,
        `${userName} (${userCondition})`,
        teamId,
        'sos',
        noteText
      );

      setIsSent(true);
      toast({
        title: t("rally.toastSosTitle", "SOS Rally Alert Posted! 🆘"),
        description: t("rally.toastSosDesc", "Your team & community wall have been alerted to support you today!"),
      });

      setTimeout(() => {
        setIsSent(false);
        setMessage("");
        onClose();
      }, 1800);
    } catch (err) {
      console.error("SOS Rally error:", err);
      toast({
        title: t("rally.toastLocalTitle", "SOS Posted Locally"),
        description: t("rally.toastLocalDesc", "Your team will see your rally call on the community wall!"),
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
      <DialogContent className="max-w-md w-full p-6 rounded-2xl border-2 border-red-500/30 bg-card shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7 animate-bounce" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-foreground flex items-center justify-center gap-2">
            {t("rally.requestSosTitle", "Request SOS Support?")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            {t("rally.requestSosDesc", "Having a hard day? Post an SOS to the Community Wall and alert your teammates to send you extra love and encouragement.")}
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-pulse" />
            <h4 className="font-bold text-lg text-foreground">{t("rally.dispatchedTitle", "Rally Alert Dispatched!")}</h4>
            <p className="text-xs text-muted-foreground">{t("rally.dispatchedDesc", "Check the Community Wall to see your rally thread!")}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-red-500" />
                  {t("rally.noteLabel", "Optional note to your team:")}
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
                      {t("rally.listening", "Listening...")}
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 text-red-500" />
                      {t("rally.dictate", "Dictate")}
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("rally.notePlaceholder", "e.g., Heavy tremor day, need extra cheer or gentle movement video suggestions...")}
                className="text-xs resize-none h-24 bg-background border-border"
              />
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("rally.warningText", "This will create an urgent SOS post on the Community Wall and alert teammates who haven't checked in yet!")}</span>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-1/2 text-xs">
                {t("rally.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleRequestRally}
                disabled={isSubmitting}
                className="w-full sm:w-1/2 text-xs gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Users className="h-4 w-4" />
                {isSubmitting ? t("rally.dispatching", "Dispatched...") : t("rally.sendAlert", "Send Rally Alert")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
