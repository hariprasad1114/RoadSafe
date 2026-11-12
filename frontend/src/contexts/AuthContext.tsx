import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { insforge } from "@/lib/insforge";
import type { AuthUser, Profile, UserRole } from "@/types";

interface SignUpResult {
  requiresVerification: boolean;
  verifyMethod: "code" | "link";
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signInWithOAuth: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  exchangeResetCode: (email: string, code: string) => Promise<string>;
  resetPassword: (newPassword: string, otp: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (values: {
    full_name?: string;
    organisation?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(user: {
  id: string;
  email?: string | null;
  profile?: Record<string, unknown> | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    profile: user.profile ?? null,
  };
}

async function fetchProfile(user: AuthUser): Promise<Profile> {
  const { data, error } = await insforge.database
    .from("profiles")
    .select("id,email,full_name,role,organisation,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    const record = data as unknown as Profile;
    return {
      ...record,
      role: (record.role || "analyst") as UserRole,
    };
  }

  return {
    id: user.id,
    email: user.email,
    full_name:
      (user.profile?.full_name as string | undefined) ||
      (user.profile?.name as string | undefined) ||
      null,
    role: "analyst",
    organisation: null,
    created_at: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (cancelled) return;
        if (error || !data.user) {
          setUser(null);
          setProfile(null);
          return;
        }
        const mapped = mapUser(data.user);
        setUser(mapped);
        try {
          const nextProfile = await fetchProfile(mapped);
          if (!cancelled) setProfile(nextProfile);
        } catch {
          if (!cancelled) {
            setProfile({
              id: mapped.id,
              email: mapped.email,
              full_name: null,
              role: "analyst",
              organisation: null,
              created_at: null,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return insforge.auth.onAuthStateChange((event) => {
      if (event === "signedOut") {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data?.user) throw new Error("Sign in failed. Please try again.");
    const mapped = mapUser(data.user);
    setUser(mapped);
    setLoading(true);
    try {
      setProfile(await fetchProfile(mapped));
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
      const response = data as unknown as {
        requireEmailVerification?: boolean;
        verifyEmailMethod?: "code" | "link";
        accessToken?: string | null;
        user?: { id: string; email?: string | null; profile?: Record<string, unknown> | null };
      };
      if (response?.requireEmailVerification) {
        return {
          requiresVerification: true,
          verifyMethod: response.verifyEmailMethod || "code",
        };
      }
      if (response?.user) {
        const mapped = mapUser(response.user);
        setUser(mapped);
        setLoading(true);
        try {
          setProfile(await fetchProfile(mapped));
        } finally {
          setLoading(false);
        }
      }
      return { requiresVerification: false, verifyMethod: "code" as const };
    },
    [],
  );

  const signInWithOAuth = useCallback(async (provider: string) => {
    const { error } = await insforge.auth.signInWithOAuth(provider, {
      redirectTo: `${window.location.origin}/app`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await insforge.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
    setProfile(null);
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    const { data, error } = await insforge.auth.verifyEmail({ email, otp });
    if (error) throw new Error(error.message);
    if (data?.user) {
      const mapped = mapUser(data.user);
      setUser(mapped);
      setLoading(true);
      try {
        setProfile(await fetchProfile(mapped));
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await insforge.auth.resendVerificationEmail({
      email,
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    const { error } = await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const exchangeResetCode = useCallback(async (email: string, code: string) => {
    const { data, error } = await insforge.auth.exchangeResetPasswordToken({
      email,
      code,
    });
    if (error) throw new Error(error.message);
    const token = (data as { token?: string } | null)?.token;
    if (!token) throw new Error("The reset code could not be verified.");
    return token;
  }, []);

  const resetPassword = useCallback(async (newPassword: string, otp: string) => {
    const { error } = await insforge.auth.resetPassword({ newPassword, otp });
    if (error) throw new Error(error.message);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await fetchProfile(user));
  }, [user]);

  const updateProfile = useCallback(
    async (values: { full_name?: string; organisation?: string }) => {
      if (!user) throw new Error("Sign in to update your profile.");
      const { data, error } = await insforge.database
        .from("profiles")
        .update(values)
        .eq("id", user.id)
        .select("id,email,full_name,role,organisation,created_at,updated_at")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data as unknown as Profile);
      } else {
        setProfile(await fetchProfile(user));
      }
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      verifyEmail,
      resendVerification,
      sendResetEmail,
      exchangeResetCode,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      verifyEmail,
      resendVerification,
      sendResetEmail,
      exchangeResetCode,
      resetPassword,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
