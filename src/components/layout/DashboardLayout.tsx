import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Activity, LayoutDashboard, Users, LogOut, Globe, User, Heart, Shield, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { changeLanguage, getCurrentLanguage } from "@/lib/language";
import { useLoveInteractions } from "@/features/freebrainer/useLoveInteractions";
import { useBrainLoverEmptyState } from "@/features/brainlover/emptyStateFlag";
import { useBrainLoverSupportBadge } from "@/features/brainlover/useBrainLoverSupportBadge";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user, userRole, setUserRole, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const { isEmpty: brainLoverEmpty } = useBrainLoverEmptyState();

  useEffect(() => {
    const handler = (lng: string) => setCurrentLang(lng.split("-")[0]);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);


  const isPro = userRole === 'pro';
  const isPureBrainLover = userRole === 'brainlover' || userRole === 'caregiver';
  const isFreeBrainer = !isPro && !isPureBrainLover;

  // Love badge — only for FreeBrainers, shows a pulsing dot when there's new love
  const { hasUnacknowledged: hasNewLove } = useLoveInteractions(
    isFreeBrainer ? user?.id : undefined,
    undefined
  );

  // Support badge — only for BrainLovers, shows a red dot when they have unread support messages
  const { hasUnread: hasUnreadSupport } = useBrainLoverSupportBadge(
    isPureBrainLover ? user?.id : undefined
  );

  const navItems = isPro ? [
    { name: t("nav.pro", "Pro Dashboard"), path: "/pro", icon: Activity },
    { name: t("nav.wall", "Wall"), path: "/community", icon: Users },
    { name: t("nav.profile", "Me"), path: "/profile", icon: User },
  ] : isPureBrainLover ? [
    { name: t("nav.blHome", "Home"), path: "/caregiver", icon: Activity },
    { name: t("nav.blTracking", "Tracking"), path: "/updates", icon: ScrollText },
    { name: t("nav.blProfile", "Profiles"), path: "/profile", icon: User },
  ] : [
    { name: t("nav.dashboard", "Dashboard"), path: "/overview", icon: LayoutDashboard },
    { name: t("nav.love", "Love"), path: "/support", icon: Heart },
    { name: t("nav.wall", "Wall"), path: "/community", icon: Users },
    { name: t("nav.profile", "Me"), path: "/profile", icon: User },
  ];

  const isOnboarding = location.pathname === '/onboarding';
  const showSidebar = !isOnboarding && isAdmin;
  const showHeader = !isOnboarding && isAdmin;
  const showBottomNav = !isOnboarding && !(isPureBrainLover && brainLoverEmpty);

  const content = (
    <div className="flex flex-col flex-1 min-w-0 h-[100dvh]">
      {showHeader && (
        <header className="shrink-0 sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            {isAdmin && <SidebarTrigger className="-ml-2" />}
            <h1 className="font-heading font-semibold text-lg">
              {navItems.find(item => item.path === location.pathname)?.name || t("nav.dashboard", "Dashboard")}
            </h1>
          </div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isOnboarding ? '' : 'p-4 md:p-6'}`}>
        <div className={`mx-auto ${isOnboarding ? 'max-w-full' : 'max-w-5xl'}`}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="shrink-0 sticky bottom-0 z-50 flex h-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showBadge =
              (item.path === "/support" && hasNewLove && !isActive) ||
              (item.path === "/caregiver" && hasUnreadSupport && !isActive);
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div className="relative">
                  <item.icon className={`h-5 w-5 ${isActive ? 'fill-primary/20' : ''}`} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );

  if (isOnboarding || !isAdmin) {
    return <div className="flex h-[100dvh] w-full bg-background overflow-hidden">{content}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border/50">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 font-heading font-bold text-xl text-primary">
              <Activity className="h-6 w-6" />
              <span>FreeBrain</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 mt-4">
              {navItems.map((item) => {
                const showBadge =
                  (item.path === "/support" && hasNewLove) ||
                  (item.path === "/caregiver" && hasUnreadSupport);
                return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.name}
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {showBadge && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Admin Controls — admin drawer only */}
            <SidebarMenu className="px-2 pt-4 border-t border-border/50">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/admin-controls"}
                  tooltip={t("nav.adminControls", "Admin Controls")}
                >
                  <Link to="/admin-controls" className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">{t("nav.adminControls", "Admin Controls")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="mt-auto p-4 space-y-4">
              <div className="space-y-4 border-t border-border/50 pt-4 mt-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center px-2">
                    {t("common.switchRole", "Dev: Switch Role")}
                    <span className="text-[10px] lowercase normal-case opacity-50 truncate max-w-[100px]">{user?.email}</span>
                  </div>
                  <Select value={userRole || "new_user"} onValueChange={(val) => {
                    // Handle onboarding test flows (prefixed with "onboarding_")
                    if (val.startsWith("onboarding_")) {
                      const flow = val.replace("onboarding_", "");
                      if (flow === "freebrainer") {
                        setUserRole(null);
                        window.location.href = "/onboarding?flow=freebrainer";
                      } else if (flow === "brainlover") {
                        setUserRole(null);
                        window.location.href = "/onboarding?flow=brainlover";
                      } else if (flow === "invited_bl") {
                        // Invited BrainLover: simulate having an invite context
                        // by setting a mock patient ID + inviter name in localStorage
                        const mockPatientId = "dev-patient-1";
                        const mockPatientName = "Jean K.";
                        const mockInviterName = "Sarah";
                        localStorage.setItem(`fb_invite_test-invited-bl@example.com`, JSON.stringify({
                          patientId: mockPatientId,
                          caregiverId: "dev-user-id",
                          patientName: mockPatientName,
                          inviterName: mockInviterName,
                          role: "caregiver",
                          createdAt: Date.now(),
                        }));
                        setUserRole(null);
                        window.location.href = "/onboarding?flow=brainlover&step=2&patient_id=dev-patient-1&fb_name=Jean%20K.&inviter_name=Sarah";
                      }
                      return;
                    }
                    // Handle role switches (dashboard views)
                    setUserRole(val === "new_user" ? null : val);
                    if (val === "brainlover" || val === "caregiver") {
                      window.location.href = "/caregiver";
                    } else if (val === "pro") {
                      window.location.href = "/pro";
                    } else if (val === "new_user") {
                      window.location.href = "/onboarding";
                    } else {
                      window.location.href = "/";
                    }
                  }}>
                    <SelectTrigger className="w-full text-xs h-8 bg-background">
                      <SelectValue placeholder={t("common.role", "Role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin (Dashboard)</SelectItem>
                      <SelectItem value="freebrainer">{t("roles.freebrainer", "FreeBrainer")} (Dashboard)</SelectItem>
                      <SelectItem value="brainlover">{t("roles.brainlover", "BrainLover")} (Dashboard)</SelectItem>
                      <SelectItem value="pro">{t("roles.pro", "Pro")} (Dashboard)</SelectItem>
                      <SelectItem value="new_user">New User (Role Selection)</SelectItem>
                      <SelectItem value="onboarding_freebrainer">Test: FreeBrainer Onboarding</SelectItem>
                      <SelectItem value="onboarding_brainlover">Test: BrainLover Onboarding</SelectItem>
                      <SelectItem value="onboarding_invited_bl">Test: Invited BrainLover Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-2">
                  <Select value={currentLang} onValueChange={(val) => changeLanguage(val, user?.id)}>
                    <SelectTrigger className="w-full text-xs h-8 bg-background">
                      <Globe className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SidebarMenuButton onClick={signOut} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-5 w-5 mr-2" />
                <span className="font-medium">{t('common.signOut', 'Sign Out')}</span>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>
        
        {content}
      </div>
    </SidebarProvider>
  );
}
