import { useState, useEffect, useCallback } from "react";
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

export function useAuth() {
  const utils = trpc.useUtils();
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => {
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
          localStorage.removeItem("resourcepulse_student_resources");
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // Effective user: Server session takes priority if present, otherwise local real user
  const effectiveUser = (meQuery.data as AuthUser | undefined) || localUser;

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setLocalUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const login = useCallback((userObj: AuthUser) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    } catch {}
    setLocalUser(userObj);
  }, []);

  const logout = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLocalUser(null);
      await logoutMutation.mutateAsync();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return {
    user: effectiveUser,
    loading: meQuery.isLoading,
    isAuthenticated: Boolean(effectiveUser),
    login,
    updateUser,
    logout,
  };
}

export default useAuth;
