import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: "admin" | "operator" | "viewer" | "user" | null;
  emailVerified?: number;
  onboardingCompleted?: number;
  permissionSet?: string | null;
  field?: string | null;
  teamName?: string | null;
}

const STORAGE_KEY = "resourcepulse_session_user";

function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Automatically purge any stale legacy demo profiles
      if (
        parsed.name === "Maya Chen" ||
        parsed.name === "Alex Rivera" ||
        parsed.email?.includes("northstar.ops") ||
        parsed.email?.includes("demo")
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      // Correct legacy uppercase email prefix to authentic registered name Kailash
      if (
        parsed.name === "SALUJARADHA9" &&
        (parsed.email?.includes("salujaradha") || parsed.email?.includes("kailash"))
      ) {
        parsed.name = "Kailash";
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }
  } catch {}
  return null;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (userObj: AuthUser) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const [localUser, setLocalUser] = useState<AuthUser | null>(readStoredUser);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // Effective user: strictly bound to local session state
  const effectiveUser = localUser;

  // Listen to cross-component or cross-tab auth state changes
  useEffect(() => {
    const handleSync = () => {
      setLocalUser(readStoredUser());
    };
    window.addEventListener("resourcepulse-auth-changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("resourcepulse-auth-changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const login = useCallback((userObj: AuthUser) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    } catch {}
    setLocalUser(userObj);
    window.dispatchEvent(new Event("resourcepulse-auth-changed"));
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setLocalUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    window.dispatchEvent(new Event("resourcepulse-auth-changed"));
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLocalUser(null);
      utils.auth.me.setData(undefined, null);
      window.dispatchEvent(new Event("resourcepulse-auth-changed"));
      try {
        await logoutMutation.mutateAsync();
      } catch {}
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }, [logoutMutation, utils]);

  const value: AuthContextType = {
    user: effectiveUser,
    loading: meQuery.isLoading,
    isAuthenticated: Boolean(effectiveUser),
    login,
    updateUser,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;

  // Fallback if rendered outside AuthProvider
  const [localUser, setLocalUser] = useState<AuthUser | null>(readStoredUser);

  const login = (u: AuthUser) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {}
    setLocalUser(u);
    window.dispatchEvent(new Event("resourcepulse-auth-changed"));
  };

  const updateUser = (p: Partial<AuthUser>) => {
    setLocalUser((prev) => {
      if (!prev) return prev;
      const up = { ...prev, ...p };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(up));
      } catch {}
      return up;
    });
    window.dispatchEvent(new Event("resourcepulse-auth-changed"));
  };

  const logout = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLocalUser(null);
      window.dispatchEvent(new Event("resourcepulse-auth-changed"));
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return {
    user: localUser,
    loading: false,
    isAuthenticated: Boolean(localUser),
    login,
    updateUser,
    logout,
  };
}

export default useAuth;
