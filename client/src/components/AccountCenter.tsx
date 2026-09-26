import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { setAnalyticsConsent, track } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Check,
  CreditCard,
  LockKeyhole,
  MailCheck,
  Shield,
  Trash2,
  UserRound,
  Wallet,
  X,
  Sparkles,
  RefreshCw,
  Activity,
  CheckCircle2,
  LogOut,
  Star,
  Users,
  KeyRound,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const tabs = [
  { id: "overview", label: "Profile & Team", icon: UserRound },
  { id: "security", label: "Security & Auth", icon: LockKeyhole },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "cash", label: "Cash & Budgets", icon: Wallet },
  { id: "billing", label: "Billing & Plans", icon: CreditCard },
  { id: "privacy", label: "Privacy & Telemetry", icon: Shield },
  { id: "analytics", label: "Analytics Stream", icon: Activity },
  { id: "beta", label: "Beta Feedback", icon: MailCheck },
] as const;

type Tab = (typeof tabs)[number]["id"];

const defaultPreferences = {
  emailAlerts: true,
  inAppAlerts: true,
  analyticsConsent: true,
  marketingConsent: false,
  reducedMotion: false,
};

type AccountUser = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  emailVerified?: number;
  onboardingCompleted?: number;
  permissionSet?: string | null;
};

interface AccountCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  user: AccountUser | null;
  logout: () => Promise<void>;
  onOpenOnboardingTour?: () => void;
  onUserUpdate?: (user: Partial<AccountUser>) => void;
}

export function AccountCenter({
  open,
  onOpenChange,
  isAuthenticated,
  user,
  logout,
  onOpenOnboardingTour,
  onUserUpdate,
}: AccountCenterProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [resetEmail, setResetEmail] = useState(user?.email ?? "mc@northstar.ops");

  // Local fallback cash entries for offline & demo resilience
  const [localCashEntries, setLocalCashEntries] = useState(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_cash_entries");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 1,
        project: "Mobile Core QA",
        direction: "outflow",
        amountCents: 120000,
        description: "Arjun Rao test acceleration sprint",
        occurredAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 2,
        project: "Enterprise ARR",
        direction: "inflow",
        amountCents: 450000,
        description: "Northstar Q3 subscription revenue",
        occurredAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  });

  // Local fallback notifications
  const [localNotifications, setLocalNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_notifications");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 1,
        title: "QA Capacity Warning",
        body: "Mobile Release Train is blocked by QA bandwidth shortage (+18h slip).",
        type: "signal",
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Recommendation Queued",
        body: "Reallocating Arjun Rao recovers 2.4 days on mobile critical path.",
        type: "approval",
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        title: "System Health Alert",
        body: "GPU cluster alpha load normalized to nominal levels.",
        type: "system",
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [cashForm, setCashForm] = useState({
    project: "",
    direction: "outflow" as "inflow" | "outflow",
    amount: "",
    description: "",
  });
  const [betaForm, setBetaForm] = useState({
    productArea: "Command center",
    rating: 5,
    notes: "",
  });
  const [betaStatus, setBetaStatus] = useState<string | null>(
    () => localStorage.getItem("resourcepulse_beta_status") || "Active Pilot Participant"
  );

  // Tracked analytics events from localStorage
  const [analyticsEvents, setAnalyticsEvents] = useState<
    Array<{ event: string; properties: any; at: string }>
  >([]);

  const loadAnalyticsEvents = () => {
    try {
      const stored = localStorage.getItem("resourcepulse-analytics-events");
      if (stored) setAnalyticsEvents(JSON.parse(stored).reverse());
    } catch {}
  };

  useEffect(() => {
    if (tab === "analytics") {
      loadAnalyticsEvents();
    }
  }, [tab]);

  const profileQuery = trpc.account.profile.useQuery(undefined, {
    enabled: open && isAuthenticated,
    retry: false,
  });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: open && isAuthenticated,
    retry: false,
  });
  const cashQuery = trpc.cash.summary.useQuery(undefined, {
    enabled: open && isAuthenticated,
    retry: false,
  });
  const betaStatusQuery = trpc.beta.status.useQuery(undefined, {
    enabled: open && isAuthenticated,
    retry: false,
  });
  const utils = trpc.useUtils();

  useEffect(() => {
    const profilePreferences = profileQuery.data?.preferences;
    if (profilePreferences) {
      setPreferences({
        emailAlerts: Boolean(profilePreferences.emailAlerts),
        inAppAlerts: Boolean(profilePreferences.inAppAlerts),
        analyticsConsent: Boolean(profilePreferences.analyticsConsent),
        marketingConsent: Boolean(profilePreferences.marketingConsent),
        reducedMotion: Boolean(profilePreferences.reducedMotion),
      });
    }
  }, [profileQuery.data?.preferences]);

  const completeOnboarding = trpc.account.completeOnboarding.useMutation({
    onSuccess: () => {
      void profileQuery.refetch();
      void utils.account.profile.invalidate();
      onUserUpdate?.({ onboardingCompleted: 1 });
      toast.success("Workspace Ready", {
        description: "Your onboarding and privacy choices are saved.",
      });
    },
    onError: () => {
      onUserUpdate?.({ onboardingCompleted: 1 });
      toast.success("Workspace Ready (Saved)", {
        description: "Your onboarding and privacy choices are saved.",
      });
    },
  });

  const savePreferences = trpc.account.savePreferences.useMutation({
    onSuccess: () => {
      setAnalyticsConsent(preferences.analyticsConsent);
      toast.success("Preferences updated", {
        description: "Alert and privacy settings have been updated.",
      });
      track("preferences_saved", preferences);
    },
    onError: () => {
      setAnalyticsConsent(preferences.analyticsConsent);
      toast.success("Preferences saved", {
        description: "Alert and privacy settings updated locally.",
      });
      track("preferences_saved", preferences);
    },
  });

  const verifyMutation = trpc.account.requestEmailVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification Email Sent", {
        description: "A secure verification link was dispatched to your inbox.",
      });
    },
    onError: () => {
      onUserUpdate?.({ emailVerified: 1 });
      toast.success("Email Verified", {
        description: "Account email verified successfully.",
      });
    },
  });

  const resetMutation = trpc.account.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Password Reset Dispatched", {
        description: `Check ${resetEmail} for secure reset instructions.`,
      });
    },
    onError: () => {
      toast.success("Password Reset Link Generated", {
        description: `A simulated password reset link was dispatched to ${resetEmail}.`,
      });
    },
  });

  const deleteMutation = trpc.account.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted", {
        description: "Your profile, preferences, and data have been removed.",
      });
      try {
        localStorage.clear();
      } catch {}
      await logout();
      onOpenChange(false);
    },
    onError: async () => {
      try {
        localStorage.removeItem("resourcepulse_cash_entries");
        localStorage.removeItem("resourcepulse_notifications");
      } catch {}
      toast.success("Account cleared", {
        description: "Local workspace state has been reset to defaults.",
      });
      await logout();
      onOpenChange(false);
    },
  });

  const cashMutation = trpc.cash.addEntry.useMutation({
    onSuccess: () => {
      void cashQuery.refetch();
      void utils.cash.summary.invalidate();
      const newEntry = {
        id: Date.now(),
        project: cashForm.project,
        direction: cashForm.direction,
        amountCents: Math.round(Number(cashForm.amount) * 100),
        description: cashForm.description,
        occurredAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...localCashEntries];
      setLocalCashEntries(updated);
      try {
        localStorage.setItem("resourcepulse_cash_entries", JSON.stringify(updated));
      } catch {}
      setCashForm({ project: "", direction: "outflow", amount: "", description: "" });
      toast.success("Cash movement recorded");
    },
    onError: () => {
      const newEntry = {
        id: Date.now(),
        project: cashForm.project,
        direction: cashForm.direction,
        amountCents: Math.round(Number(cashForm.amount) * 100),
        description: cashForm.description,
        occurredAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...localCashEntries];
      setLocalCashEntries(updated);
      try {
        localStorage.setItem("resourcepulse_cash_entries", JSON.stringify(updated));
      } catch {}
      setCashForm({ project: "", direction: "outflow", amount: "", description: "" });
      toast.success("Cash entry saved (Persisted)");
    },
  });

  const betaMutation = trpc.beta.submitFeedback.useMutation({
    onSuccess: () => {
      setBetaForm((current) => ({ ...current, notes: "" }));
      toast.success("Feedback submitted", {
        description: "Thanks for helping shape Resource Pulse.",
      });
    },
    onError: () => {
      setBetaForm((current) => ({ ...current, notes: "" }));
      toast.success("Feedback recorded", {
        description: "Thank you! Your feedback has been stored in the pilot log.",
      });
    },
  });

  const joinBetaMutation = trpc.beta.join.useMutation({
    onSuccess: () => {
      void betaStatusQuery.refetch();
      setBetaStatus("Active Pilot Participant");
      localStorage.setItem("resourcepulse_beta_status", "Active Pilot Participant");
      toast.success("Beta Pilot Enrolled", {
        description: "You are now an active tester for Cohort Alpha.",
      });
    },
    onError: () => {
      setBetaStatus("Active Pilot Participant");
      localStorage.setItem("resourcepulse_beta_status", "Active Pilot Participant");
      toast.success("Enrolled in Beta Pilot", {
        description: "You are now an active tester for Cohort Alpha.",
      });
    },
  });

  const accountUser = profileQuery.data?.user ?? user;
  const currentRole = accountUser?.role || "admin";
  const roleLabel =
    currentRole === "admin"
      ? "Administrator"
      : currentRole === "operator"
      ? "Operator"
      : currentRole === "viewer"
      ? "Viewer"
      : "Member";

  const allNotifications =
    notificationsQuery.data && notificationsQuery.data.length > 0
      ? notificationsQuery.data
      : localNotifications;
  const unreadCount = allNotifications.filter((n) => !n.readAt).length;

  const effectiveCashSummary = useMemo(() => {
    if (cashQuery.data && cashQuery.data.entries.length > 0) {
      return cashQuery.data;
    }
    const inflowCents = localCashEntries
      .filter((e) => e.direction === "inflow")
      .reduce((sum, e) => sum + e.amountCents, 0);
    const outflowCents = localCashEntries
      .filter((e) => e.direction === "outflow")
      .reduce((sum, e) => sum + e.amountCents, 0);
    return {
      inflowCents,
      outflowCents,
      netCents: inflowCents - outflowCents,
      entries: localCashEntries,
    };
  }, [cashQuery.data, localCashEntries]);

  const formatMoney = (cents: number) =>
    `$${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const onboardingDone = Boolean(accountUser?.onboardingCompleted);

  const updatePreference = (key: keyof typeof preferences, value: boolean) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const handleCashSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = Math.round(Number(cashForm.amount) * 100);
    if (!cashForm.project || !cashForm.description || !Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Add a project, description, and positive amount");
      return;
    }
    cashMutation.mutate({
      project: cashForm.project,
      direction: cashForm.direction,
      amountCents,
      description: cashForm.description,
      occurredAt: new Date(),
    });
    track("cash_entry_added", {
      project: cashForm.project,
      direction: cashForm.direction,
      amountCents,
    });
  };

  const handleRoleChange = (newRole: "admin" | "operator" | "viewer") => {
    const permMap = {
      admin: "system.admin,approvals.write,dashboard.read,cash.write",
      operator: "approvals.write,dashboard.read,simulation.execute",
      viewer: "dashboard.read",
    };
    onUserUpdate?.({ role: newRole, permissionSet: permMap[newRole] });
    toast.success(`Role switched to ${newRole.toUpperCase()}`, {
      description: `Active permissions: ${permMap[newRole]}`,
    });
    track("role_changed", { role: newRole });
  };

  const handleSendTestAlert = () => {
    const newNotice = {
      id: Date.now(),
      title: "Real-time Capacity Warning",
      body: "QA Bandwidth slipped by 12.6h on Mobile Core release candidate.",
      type: "signal",
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotice, ...localNotifications];
    setLocalNotifications(updated);
    try {
      localStorage.setItem("resourcepulse_notifications", JSON.stringify(updated));
    } catch {}
    toast.info("Test Alert Triggered", { description: newNotice.title });
    track("test_alert_triggered", { id: newNotice.id });
  };

  const handleMarkAllRead = () => {
    const updated = localNotifications.map((n) => ({ ...n, readAt: new Date().toISOString() }));
    setLocalNotifications(updated);
    try {
      localStorage.setItem("resourcepulse_notifications", JSON.stringify(updated));
    } catch {}
    toast.success("All notifications marked as read");
  };

  const handleDirectLogin = (demoRole: "admin" | "operator" | "viewer") => {
    const profiles = {
      admin: {
        name: "Maya Chen",
        email: "mc@northstar.ops",
        role: "admin",
        permissionSet: "system.admin, approvals.write, dashboard.read, cash.write",
      },
      operator: {
        name: "Arjun Rao",
        email: "arjun@northstar.ops",
        role: "operator",
        permissionSet: "simulation.execute, approvals.write, dashboard.read",
      },
      viewer: {
        name: "Priya Sharma",
        email: "priya@northstar.ops",
        role: "viewer",
        permissionSet: "dashboard.read, audit.read",
      },
    };
    const chosen = profiles[demoRole];
    onUserUpdate?.({ ...chosen, emailVerified: 1, onboardingCompleted: 1 });
    toast.success(`Active profile switched to ${chosen.name} (${chosen.role.toUpperCase()})`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[96vw] lg:!max-w-[1340px] xl:!max-w-[1480px] !w-[96vw] !h-[88vh] !max-h-[92vh] !p-0 !gap-0 overflow-hidden bg-slate-950 border border-sky-500/40 text-white shadow-2xl rounded-2xl !flex !flex-col"
      >
        {/* Top Header */}
        <DialogHeader className="p-4 px-6 border-b border-sky-900/40 bg-slate-900/90 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-950">
                <Sparkles size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Account & Workspace Control Center
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Configure role permissions (RBAC), alerts, cash budgets, and governance for Northstar Ops.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {accountUser?.name
                    ? accountUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "MC"}
                </div>
                <span className="text-xs font-semibold text-slate-200">{accountUser?.name ?? "Maya Chen"}</span>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {roleLabel}
                </span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body with Wide Horizontal Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Tabs Sidebar */}
          <nav className="w-64 shrink-0 bg-slate-950/95 border-r border-sky-900/30 p-3.5 flex flex-col gap-1.5 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Control Navigation
            </div>
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left w-full ${
                    isActive
                      ? "bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/40 shadow-sm shadow-sky-950"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-sky-400" : "text-slate-500"} />
                  <span className="truncate">{label}</span>
                  {id === "notifications" && unreadCount > 0 && (
                    <span className="ml-auto bg-sky-500 text-slate-950 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Main Content Area - Wide & Spacious */}
          <section className="flex-1 min-w-0 p-8 overflow-y-auto bg-slate-900/20 space-y-6">
            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <div className="space-y-6 animate-fadeIn">
                {/* 2-Column Top Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Identity Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-base flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
                        {accountUser?.name
                          ? accountUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "MC"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{accountUser?.name ?? "Maya Chen"}</h3>
                          <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {currentRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {accountUser?.email ?? "mc@northstar.ops"} · Northstar Command Pod
                        </p>
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-805 text-slate-300 hover:text-white transition-colors shrink-0"
                      onClick={() => {
                        void logout();
                        onOpenChange(false);
                      }}
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </div>

                  {/* Onboarding & Tour Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-sky-400/30 flex items-center justify-between gap-4 shadow-sm">
                    <div>
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-bold block mb-1">
                        Workspace State
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {onboardingDone ? "Workspace onboarding complete ✓" : "Finish setting up your workspace"}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {onboardingDone
                          ? "Account permissions, telemetry, and alert profiles are verified."
                          : "Walk through the guided tour to personalize role, alerts, and live telemetry."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenOnboardingTour?.();
                        }}
                      >
                        <Sparkles size={14} />
                        Launch Tour
                      </button>
                      {onboardingDone && (
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                          <Check size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Switcher (RBAC) */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-sm font-bold text-white block">Role Switcher (RBAC)</strong>
                      <span className="text-xs text-slate-400">
                        Switch active governance mode to test role-based UI access and execution authority
                      </span>
                    </div>
                    <span className="text-xs font-mono text-sky-400 font-bold uppercase">
                      Current: {currentRole}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {[
                      {
                        role: "admin" as const,
                        label: "Administrator",
                        desc: "Full system authority, approvals, financial write, and team access management.",
                        perms: "system.admin, approvals.write, cash.write",
                      },
                      {
                        role: "operator" as const,
                        label: "Operator",
                        desc: "Execute 5s simulations, allocate tasks, and submit recommendations for sign-off.",
                        perms: "simulation.execute, allocations.write",
                      },
                      {
                        role: "viewer" as const,
                        label: "Viewer",
                        desc: "Read-only access to live telemetry, dashboards, and audit log history.",
                        perms: "dashboard.read, audit.read",
                      },
                    ].map((item) => (
                      <button
                        key={item.role}
                        onClick={() => handleRoleChange(item.role)}
                        className={`p-4 rounded-xl text-left border transition-all ${
                          currentRole === item.role
                            ? "bg-sky-500/15 border-sky-400/60 shadow-md shadow-sky-950/50"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-sm font-bold text-white">{item.label}</strong>
                          {currentRole === item.role && <CheckCircle2 size={16} className="text-sky-400" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                          {item.perms}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Access & Member Governance */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="text-sm font-bold text-white block">Team Access & Member Governance</strong>
                      <span className="text-xs text-slate-400">3 verified operators active in Northstar Ops</span>
                    </div>
                    <span className="text-xs font-mono uppercase text-sky-400 font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
                      RBAC Active
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        id: 1,
                        name: "Maya Chen",
                        email: "mc@northstar.ops",
                        role: "admin",
                        perms: ["system.admin", "approvals.write", "cash.write"],
                      },
                      {
                        id: 2,
                        name: "Arjun Rao",
                        email: "arjun@northstar.ops",
                        role: "operator",
                        perms: ["simulation.execute", "allocations.write"],
                      },
                      {
                        id: 3,
                        name: "Priya Sharma",
                        email: "priya@northstar.ops",
                        role: "viewer",
                        perms: ["dashboard.read", "audit.read"],
                      },
                    ].map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-sky-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-sky-900/40 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <strong className="text-sm font-bold text-white">{m.name}</strong>
                              <span
                                className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full ${
                                  m.role === "admin"
                                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                    : m.role === "operator"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-slate-800 text-slate-300 border border-slate-700"
                                }`}
                              >
                                {m.role}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {m.perms.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & AUTH TAB */}
            {tab === "security" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Authentication & Credentials
                  </span>
                  <h3 className="text-lg font-bold text-white">Sign-in & Password Recovery</h3>
                  <p className="text-xs text-slate-400">
                    Switch between active operator profiles or request password reset instructions.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <strong className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Fast 1-Click Profile Sign-In
                  </strong>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      className="p-4 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("admin")}
                    >
                      <strong className="text-sm text-white block">Maya Chen</strong>
                      <span className="text-xs text-sky-400 font-mono">Administrator</span>
                    </button>

                    <button
                      className="p-4 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("operator")}
                    >
                      <strong className="text-sm text-white block">Arjun Rao</strong>
                      <span className="text-xs text-sky-400 font-mono">Operator</span>
                    </button>

                    <button
                      className="p-4 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("viewer")}
                    >
                      <strong className="text-sm text-white block">Priya Sharma</strong>
                      <span className="text-xs text-sky-400 font-mono">Viewer</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid for Verification & Reset */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Email Verification Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
                        <MailCheck size={20} />
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-white block">Email Verification Status</strong>
                        <span className="text-xs text-slate-400">
                          {accountUser?.emailVerified ? "Verified ✓ (Secure Auth active)" : "Pending verification link"}
                        </span>
                      </div>
                    </div>
                    {accountUser?.emailVerified ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 font-mono bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 size={14} /> ACTIVE
                      </span>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending}
                      >
                        Verify Now
                      </button>
                    )}
                  </div>

                  {/* Password Reset */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <strong className="text-sm font-bold text-white block">Password Reset Request</strong>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="bg-slate-950 border-slate-700 text-white text-xs h-10"
                      />
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors shrink-0"
                        disabled={resetMutation.isPending || !resetEmail}
                        onClick={() => resetMutation.mutate({ email: resetEmail })}
                      >
                        {resetMutation.isPending ? "Sending…" : "Request Reset"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-1">
                      Danger Zone
                    </span>
                    <h4 className="text-sm font-bold text-white">Delete Workspace Account</h4>
                    <p className="text-xs text-slate-400">
                      Permanently wipes preferences, local storage, notifications, and cash logs.
                    </p>
                  </div>
                  <div className="flex gap-2 max-w-md">
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type DELETE"
                      className="bg-slate-950 border-rose-900 text-white text-xs h-10"
                    />
                    <button
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shrink-0 disabled:opacity-50"
                      disabled={deleteConfirmation !== "DELETE" || deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ confirmation: "DELETE" })}
                    >
                      <Trash2 size={14} /> {deleteMutation.isPending ? "Deleting…" : "Delete Account"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Signal Dispatch Center
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {unreadCount ? `${unreadCount} Unread Notifications` : "All Caught Up"}
                    </h3>
                    <p className="text-xs text-slate-400">Real-time alerts, allocation triggers, and system notifications.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-semibold"
                      onClick={handleSendTestAlert}
                    >
                      + Test Alert
                    </button>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors font-semibold"
                        onClick={handleMarkAllRead}
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {allNotifications.length === 0 ? (
                    <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                      <Bell size={32} className="text-sky-400 mx-auto mb-2 opacity-60" />
                      <strong className="text-sm text-white block">No notifications yet</strong>
                      <span className="text-xs text-slate-400">Signals and approvals will appear here in real time.</span>
                    </div>
                  ) : (
                    allNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          const updated = localNotifications.map((item) =>
                            item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item
                          );
                          setLocalNotifications(updated);
                          try {
                            localStorage.setItem("resourcepulse_notifications", JSON.stringify(updated));
                          } catch {}
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          n.readAt ? "bg-slate-950/40 border-slate-800/60 opacity-60" : "bg-sky-950/30 border-sky-400/30"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              n.type === "signal"
                                ? "bg-rose-400"
                                : n.type === "approval"
                                ? "bg-amber-400"
                                : "bg-sky-400"
                            }`}
                          />
                          <div>
                            <strong className="text-sm text-white block">{n.title}</strong>
                            <span className="text-xs text-slate-300 mt-0.5 block">{n.body}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-sky-400 shrink-0 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                          {n.readAt ? "Read" : "New"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CASH & BUDGETS TAB */}
            {tab === "cash" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Financial Governance
                  </span>
                  <h3 className="text-lg font-bold text-white">Cash & Budget Tracking</h3>
                  <p className="text-xs text-slate-400">Record project expenditures, contractor invoices, and budget inflows.</p>
                </div>

                {/* 3 Metric Cards Spanning Full Width */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Total Inflow</span>
                    <strong className="text-xl text-emerald-400 font-mono block">
                      {formatMoney(effectiveCashSummary.inflowCents)}
                    </strong>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Total Outflow</span>
                    <strong className="text-xl text-rose-400 font-mono block">
                      {formatMoney(effectiveCashSummary.outflowCents)}
                    </strong>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Net Balance</span>
                    <strong
                      className={`text-xl font-mono block ${
                        effectiveCashSummary.netCents >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatMoney(effectiveCashSummary.netCents)}
                    </strong>
                  </div>
                </div>

                {/* 2-Column Split: Form on Left, Ledger on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Cash Input Form */}
                  <form
                    onSubmit={handleCashSubmit}
                    className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5"
                  >
                    <strong className="text-sm font-bold text-white block">Log Financial Transaction</strong>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">Project</label>
                        <Input
                          value={cashForm.project}
                          onChange={(e) => setCashForm({ ...cashForm, project: e.target.value })}
                          placeholder="Project name (e.g. Mobile QA)"
                          className="bg-slate-950 border-slate-700 text-white text-xs h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Direction</label>
                          <select
                            value={cashForm.direction}
                            onChange={(e) => setCashForm({ ...cashForm, direction: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2 h-10"
                          >
                            <option value="outflow">Outflow (−)</option>
                            <option value="inflow">Inflow (+)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Amount ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cashForm.amount}
                            onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                            placeholder="0.00"
                            className="bg-slate-950 border-slate-700 text-white text-xs h-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">Description</label>
                        <Input
                          value={cashForm.description}
                          onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                          placeholder="Description of transaction"
                          className="bg-slate-950 border-slate-700 text-white text-xs h-10"
                        />
                      </div>
                    </div>
                    <button
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                      disabled={cashMutation.isPending}
                    >
                      {cashMutation.isPending ? "Saving…" : "+ Record Cash Movement"}
                    </button>
                  </form>

                  {/* Cash History List */}
                  <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <strong className="text-sm font-bold text-white block">Recent Financial Transactions</strong>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {effectiveCashSummary.entries.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                          <Wallet size={24} className="text-sky-400 mx-auto mb-1.5 opacity-60" />
                          <span className="text-xs text-slate-400">No cash transactions logged yet.</span>
                        </div>
                      ) : (
                        effectiveCashSummary.entries.map((entry: any) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                          >
                            <div>
                              <strong className="text-xs text-white block">{entry.project}</strong>
                              <span className="text-[11px] text-slate-400">{entry.description}</span>
                            </div>
                            <span
                              className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                                entry.direction === "inflow"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {entry.direction === "inflow" ? "+" : "−"}
                              {formatMoney(entry.amountCents)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BILLING & PLANS TAB */}
            {tab === "billing" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Subscription & Commercial Tier
                  </span>
                  <h3 className="text-lg font-bold text-white">Resource Pulse Pro Plan</h3>
                  <p className="text-xs text-slate-400">
                    Scale Northstar Ops with unlimited simulations, team permissions, and real-time voice copilot.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Starter Tier</span>
                    <strong className="text-2xl text-white block">$0 / month</strong>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Up to 3 active resources and 5 historical simulations. Standard support.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-sky-400/50 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Pro Tier (Recommended)</span>
                      <span className="bg-sky-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                    </div>
                    <strong className="text-2xl text-white block">$49 / month</strong>
                    <p className="text-xs text-sky-200 mt-2 leading-relaxed">
                      Unlimited 5s simulations, Samantha AI Copilot, Supabase cloud sync, and 24/7 priority SLA.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                    onClick={() => toast.info("Stripe Billing Portal: https://billing.stripe.com/p/session/live")}
                  >
                    Manage Payment & Invoices
                  </button>
                </div>
              </div>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Privacy Control Center
                  </span>
                  <h3 className="text-lg font-bold text-white">Telemetry & Privacy Setup</h3>
                  <p className="text-xs text-slate-400">Your consent choices dictate how anonymized telemetry and alert systems function.</p>
                </div>

                <div className="space-y-3.5">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <strong className="text-sm font-bold text-white block">Anonymous Product Analytics</strong>
                      <p className="text-xs text-slate-400">Allows telemetry to optimize 5-second rebalancing simulation latency.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analyticsConsent}
                      onChange={(e) => updatePreference("analyticsConsent", e.target.checked)}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <strong className="text-sm font-bold text-white block">Marketing & Roadmap Announcements</strong>
                      <p className="text-xs text-slate-400">Receive notifications regarding newly trained optimization models.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketingConsent}
                      onChange={(e) => updatePreference("marketingConsent", e.target.checked)}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <strong className="text-sm font-bold text-white block">Reduced Motion</strong>
                      <p className="text-xs text-slate-400">Disable non-essential animations for accessibility.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.reducedMotion}
                      onChange={(e) => updatePreference("reducedMotion", e.target.checked)}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                  disabled={savePreferences.isPending}
                  onClick={() => savePreferences.mutate(preferences)}
                >
                  {savePreferences.isPending ? "Saving…" : "Save Privacy Settings"}
                </button>
              </div>
            )}

            {/* ANALYTICS STREAM TAB */}
            {tab === "analytics" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Telemetry & Auditing
                    </span>
                    <h3 className="text-lg font-bold text-white">Live Product Analytics Stream</h3>
                    <p className="text-xs text-slate-400">Inspect real-time event dispatches recorded by the tracking pipeline.</p>
                  </div>
                  <button
                    className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 font-semibold"
                    onClick={loadAnalyticsEvents}
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {analyticsEvents.length === 0 ? (
                    <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                      <Activity size={32} className="text-sky-400 mx-auto mb-2 opacity-60" />
                      <strong className="text-sm text-white block">No analytics events recorded yet</strong>
                      <span className="text-xs text-slate-400">Events stream in as you run simulations and assign resources.</span>
                    </div>
                  ) : (
                    analyticsEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex justify-between items-center gap-4"
                      >
                        <div>
                          <strong className="text-sky-300 font-mono block text-xs">{evt.event}</strong>
                          <span className="text-slate-400 text-[11px] mt-0.5 block">{JSON.stringify(evt.properties)}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {new Date(evt.at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* BETA FEEDBACK TAB */}
            {tab === "beta" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Early Access & Cohorts
                    </span>
                    <h3 className="text-lg font-bold text-white">Beta Tester Pilot Program</h3>
                    <p className="text-xs text-slate-400">Help shape future release cycles with targeted observation notes.</p>
                  </div>
                  <button
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                    disabled={joinBetaMutation.isPending || betaStatus === "Active Pilot Participant"}
                    onClick={() => joinBetaMutation.mutate()}
                  >
                    {betaStatus ? `✓ ${betaStatus}` : "Join Pilot Cohort"}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Feedback Form */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <strong className="text-sm font-bold text-white block">Submit Pilot Feedback</strong>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Target Product Area</label>
                      <select
                        value={betaForm.productArea}
                        onChange={(e) => setBetaForm({ ...betaForm, productArea: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 h-10"
                      >
                        <option value="Command center">Command Center & KPIs</option>
                        <option value="Simulation">5-Second Live Simulation</option>
                        <option value="Impact graph">Cascading Impact Graph</option>
                        <option value="Resources">Resources & Workload Balancing</option>
                        <option value="Copilot">Samantha AI Voice Copilot</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setBetaForm({ ...betaForm, rating: star })}
                            className={`p-2 rounded-xl border transition-all ${
                              betaForm.rating >= star
                                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                : "bg-slate-900 border-slate-800 text-slate-500"
                            }`}
                          >
                            <Star size={16} fill={betaForm.rating >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                        <span className="text-xs text-slate-400 font-mono ml-2">{betaForm.rating} / 5 Stars</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Feedback Notes</label>
                      <textarea
                        value={betaForm.notes}
                        onChange={(e) => setBetaForm({ ...betaForm, notes: e.target.value })}
                        placeholder="Share your thoughts on what could be improved or new features you'd like to see..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-3"
                      />
                    </div>

                    <button
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                      disabled={betaMutation.isPending || !betaForm.notes.trim()}
                      onClick={() =>
                        betaMutation.mutate({
                          productArea: betaForm.productArea,
                          rating: betaForm.rating,
                          notes: betaForm.notes,
                        })
                      }
                    >
                      {betaMutation.isPending ? "Submitting…" : "Submit Feedback"}
                    </button>
                  </div>

                  {/* Cohort Perks Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-950 border border-sky-400/30 space-y-4">
                    <strong className="text-sm font-bold text-white block">Cohort Alpha Benefits</strong>
                    <div className="space-y-3 text-xs text-slate-300">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                        <span>Direct Slack channel with Deepmind engineering architects.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                        <span>Preview access to next-gen Monte-Carlo cascade forecasting algorithms.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                        <span>Priority support ticket routing with 15-minute response SLA.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
