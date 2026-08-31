import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("msg") === "save_profile") {
      toast({
        title: t("auth.almostThere", "Almost there!"),
        description: t("auth.almostThereDesc", "Please enter your email to save your profile and progress."),
      });
    }
  }, [toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let redirectTo = window.location.origin.includes("freethebrains.com") ? window.location.origin : "https://app.freethebrains.com";
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      
      if (pendingInvite) {
        try {
          const invite = JSON.parse(pendingInvite);
          const params = new URLSearchParams();
          if (invite.teamId) params.append('team_id', invite.teamId);
          if (invite.caregiverId) params.append('caregiver_id', invite.caregiverId);
          if (invite.patientId) params.append('patient_id', invite.patientId);
          if (invite.role) params.append('role', invite.role);
          
          redirectTo = `https://app.freethebrains.com/join?${params.toString()}`;
        } catch (e) {
          console.error("Failed to parse pending invite", e);
        }
      }

      const hasPendingOnboarding = !!localStorage.getItem('pendingOnboarding');

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          // Only create new accounts when coming from onboarding flow
          shouldCreateUser: hasPendingOnboarding,
        },
      });
      
      if (error) {
        throw error;
      }
      
      setIsSent(true);
      toast({
        title: t("auth.toastSuccessTitle"),
        description: t("auth.toastSuccessDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("auth.toastErrorTitle"),
        description: error.message || t("auth.errorFallback", "Could not request login link. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.welcome")}</CardTitle>
          <CardDescription>
            {t("auth.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="bg-primary/10 text-primary p-4 rounded-lg">
                <p className="font-medium">{t("auth.checkEmail")}</p>
                <p className="text-sm mt-1">{t("auth.magicLinkSent", { email })}</p>
              </div>
              <Button variant="outline" onClick={() => setIsSent(false)} className="w-full">
                {t("auth.tryAnother")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? t("auth.sending") : t("auth.sendMagicLink")}
              </Button>
              {email.toLowerCase().trim() === 'jeankaluza@gmail.com' && (
                <div className="space-y-2 pt-2 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      localStorage.setItem('dev_bypass_auth', 'true');
                      window.location.href = '/';
                    }}
                  >
                    {t("auth.bypassAdmin", "Bypass Auth (Admin Only)")}
                  </Button>
                </div>
              )}
            </form>
          )}
          <div className="text-center pt-4 border-t mt-4">
            <a href="/onboarding" className="text-sm text-muted-foreground hover:text-primary underline">
              {t("auth.noAccountYet", "I don't have an account yet")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
