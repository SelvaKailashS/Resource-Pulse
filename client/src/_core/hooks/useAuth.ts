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
}

const STORAGE_KEY = "resourcepulse_session_user";

const defaultDemoUser: AuthUser = {
  id: 1,
  name: "Maya Chen",
  email: "mc@northstar.ops",
  role: "admin",
  emailVerified: 1,
  onboardingCompleted: 0,
  permissionSet: "system.admin,approvals.write,dashboard.read",
};

export function useAuth() {
  const utils = trpc.useUtils();
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
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

  // Effective user: Server session takes priority if present, otherwise local persistent user
  const effectiveUser = (meQuery.data as AuthUser | undefined) || localUser;

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setLocalUser((prev) => {
      const updated = { ...(prev || defaultDemoUser), ...partial };
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

  const quickDemoLogin = useCallback((role: "admin" | "operator" | "viewer") => {
    let demo: AuthUser;
    if (role === "admin") {
      demo = {
        id: 1,
        name: "Maya Chen",
        email: "mc@northstar.ops",
        role: "admin",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "system.admin,approvals.write,dashboard.read",
      };
    } else if (role === "operator") {
      demo = {
        id: 2,
        name: "Arjun Rao",
        email: "arjun@northstar.ops",
        role: "operator",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "approvals.write,dashboard.read",
      };
    } else {
      demo = {
        id: 3,
        name: "Priya Sharma",
        email: "priya@northstar.ops",
        role: "viewer",
        emailVerified: 1,
        onboardingCompleted: 1,
        permissionSet: "dashboard.read",
      };
    }
    login(demo);
  }, [login]);

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
    quickDemoLogin,
    updateUser,
    logout,
  };
}

export default useAuth;
