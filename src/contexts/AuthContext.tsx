import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import i18n from "@/lib/i18n";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  userRole: string | null;
  onboardingCompleted: boolean;
  setUserRole: (role: string | null) => void;
  isAdmin: boolean;
  isTestingMode: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRoleState] = useState<string | null>(localStorage.getItem('dev_role_override'));
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isTestingMode = isAdmin && !!localStorage.getItem('dev_role_override') && localStorage.getItem('dev_role_override') !== 'admin';

  const setUserRole = (role: string | null) => {
    if (role) {
      localStorage.setItem('dev_role_override', role);
    } else {
      localStorage.removeItem('dev_role_override');
    }
    setUserRoleState(role);
  };

  useEffect(() => {
    const isDevBypass = localStorage.getItem('dev_bypass_auth') === 'true';
    if (isDevBypass) {
      // Clear any signed-out flag — dev bypass user is authenticated
      sessionStorage.removeItem('fb_signed_out');
      const mockUser = { id: 'dev-user-id', email: 'jeankaluza@gmail.com' } as User;
      const mockSession = {
        user: mockUser,
        access_token: 'dev-token',
        refresh_token: 'dev-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer'
      } as Session;
      setSession(mockSession);
      setUser(mockUser);
      // Dev bypass user is always admin — even when role-switching
      setIsAdmin(true);
      setOnboardingCompleted(true);
      const override = localStorage.getItem('dev_role_override');
      setUserRoleState(override || 'admin');
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Clear the signed-out flag — user has a valid session
        sessionStorage.removeItem('fb_signed_out');
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          console.warn("Stale session detected (user removed in DB reset). Auto signing out.");
          await supabase.auth.signOut();
          localStorage.removeItem('dev_bypass_auth');
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        setSession(session);
        setUser(session.user);
        await fetchUserRole(session.user.id, session.user.email || '');
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event !== 'SIGNED_OUT') {
        // Clear the signed-out flag — user has authenticated
        sessionStorage.removeItem('fb_signed_out');
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          console.warn("Stale auth session on state change. Auto signing out.");
          await supabase.auth.signOut();
          localStorage.removeItem('dev_bypass_auth');
          setSession(null);
          setUser(null);
          setUserRoleState(null);
          setIsLoading(false);
          return;
        }
        setSession(session);
        setUser(session.user);
        await fetchUserRole(session.user.id, session.user.email || '');
      } else if (!session) {
        setSession(null);
        setUser(null);
        setUserRoleState(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, email: string) => {
    if (localStorage.getItem('dev_bypass_auth') === 'true') {
      setIsAdmin(true);
      setOnboardingCompleted(true);
      const override = localStorage.getItem('dev_role_override');
      setUserRoleState(override || 'admin');
      return;
    }

    const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', userId) as { data: any[] | null, error: any };
    if (roleError) console.error("🚨 AuthContext: Error fetching user role:", roleError);
    console.log("🔍 AuthContext: Fetched roleData:", roleData);

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('onboarding_completed').eq('user_id', userId).maybeSingle() as { data: any | null, error: any };
    if (profileError) console.error("🚨 AuthContext: Error fetching profile:", profileError);
    console.log("🔍 AuthContext: Fetched profileData:", profileData);
    
    if (roleError) {
      console.error('Error fetching role:', roleError);
      return;
    }

    if (profileData) {
      setOnboardingCompleted(!!profileData.onboarding_completed);

      // Restore saved language preference from DB on login
      // Only if the user hasn't explicitly set it this session
      const dbLocale = (profileData as any).locale;
      if (dbLocale && !sessionStorage.getItem("lang_user_set")) {
        const cachedLang = (localStorage.getItem("i18nextLng") || "en").split("-")[0];
        if (dbLocale !== cachedLang) {
          i18n.changeLanguage(dbLocale);
        }
      }
    }
    
    const isAdminUser = email.toLowerCase() === 'jeankaluza@gmail.com';
    setIsAdmin(isAdminUser);

    const override = localStorage.getItem('dev_role_override');
    
    // Only allow role overrides for admins
    if (override && !isAdminUser) {
      localStorage.removeItem('dev_role_override');
    }

    // Admin role override ALWAYS wins — never clobber it with DB role
    if (override && isAdminUser) {
      setUserRoleState(override);
      return;
    }

    if (roleData && roleData.length > 0) {
      const adminRole = roleData.find(r => (r as any).role === 'admin');
      setUserRoleState(adminRole ? 'admin' : (roleData[0] as any).role);
    } else {
      setUserRoleState(null);
    }
  };

    // fetchUserRole is now called during auth state initialization

  const refreshRole = async () => {
    if (user) await fetchUserRole(user.id, user.email || '');
  };

  const signOut = async () => {
    localStorage.removeItem('dev_role_override');
    sessionStorage.removeItem('lang_user_set');
    // Set flag so ProtectedRoute redirects to /auth (not /onboarding) after sign-out
    sessionStorage.setItem('fb_signed_out', 'true');
    if (localStorage.getItem('dev_bypass_auth') === 'true') {
      localStorage.removeItem('dev_bypass_auth');
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, userRole, onboardingCompleted, setUserRole, isAdmin, isTestingMode, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
