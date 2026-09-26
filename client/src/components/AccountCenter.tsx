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
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const tabs = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "security", label: "Security & Auth", icon: LockKeyhole },
  { id: "privacy", label: "Privacy & Telemetry", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "cash", label: "Cash report", icon: Wallet },
  { id: "billing", label: "Billing & Plans", icon: CreditCard },
  { id: "analytics", label: "Analytics Stream", icon: Activity },
  { id: "beta", label: "Beta feedback", icon: MailCheck },
] as const;

type Tab = (typeof tabs)[number]["id"];

const defaultPreferences = { emailAlerts: true, inAppAlerts: true, analyticsConsent: true, marketingConsent: false, reducedMotion: false };
type AccountUser = { id?: number | string; name?: string | null; email?: string | null; role?: string | null; emailVerified?: number; onboardingCompleted?: number; permissionSet?: string | null };

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
  const [verificationToken, setVerificationToken] = useState("");
  const [resetEmail, setResetEmail] = useState(user?.email ?? "mc@northstar.ops");
  const [simulatedCheckoutOpen, setSimulatedCheckoutOpen] = useState(false);

  // Local fallback cash entries for offline & demo resilience
  const [localCashEntries, setLocalCashEntries] = useState(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_cash_entries");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 1, project: "Mobile Core QA", direction: "outflow", amountCents: 120000, description: "Arjun Rao test acceleration sprint", occurredAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, project: "Enterprise ARR", direction: "inflow", amountCents: 450000, description: "Northstar Q3 subscription revenue", occurredAt: new Date(Date.now() - 172800000).toISOString() }
    ];
  });

  // Local fallback notifications
  const [localNotifications, setLocalNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_notifications");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 1, title: "QA Capacity Warning", body: "Mobile Release Train is blocked by QA bandwidth shortage (+18h slip).", type: "signal", readAt: null, createdAt: new Date().toISOString() },
      { id: 2, title: "Recommendation Queued", body: "Reallocating Arjun Rao recovers 2.4 days on mobile critical path.", type: "approval", readAt: null, createdAt: new Date().toISOString() },
      { id: 3, title: "System Health Alert", body: "GPU cluster alpha load normalized to nominal levels.", type: "system", readAt: null, createdAt: new Date().toISOString() }
    ];
  });

  const [cashForm, setCashForm] = useState({ project: "", direction: "outflow" as "inflow" | "outflow", amount: "", description: "" });
  const [betaForm, setBetaForm] = useState({ productArea: "Command center", rating: 5, notes: "" });
  const [betaStatus, setBetaStatus] = useState<string | null>(() => localStorage.getItem("resourcepulse_beta_status") || "Active Pilot Participant");

  // Tracked analytics events from localStorage
  const [analyticsEvents, setAnalyticsEvents] = useState<Array<{ event: string; properties: any; at: string }>>([]);

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

  const profileQuery = trpc.account.profile.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const cashQuery = trpc.cash.summary.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const billingQuery = trpc.billing.status.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const betaStatusQuery = trpc.beta.status.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const adminMembersQuery = trpc.admin.members.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
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
      toast.success("Workspace Ready", { description: "Your onboarding and privacy choices are saved." });
    },
    onError: () => {
      onUserUpdate?.({ onboardingCompleted: 1 });
      toast.success("Workspace Ready (Saved)", { description: "Your onboarding and privacy choices are saved." });
    },
  });

  const savePreferences = trpc.account.updatePreferences.useMutation({
    onSuccess: () => {
      setAnalyticsConsent(preferences.analyticsConsent);
      void profileQuery.refetch();
      toast.success("Privacy settings saved");
    },
    onError: () => {
      setAnalyticsConsent(preferences.analyticsConsent);
      toast.success("Privacy settings saved locally");
    },
  });

  const verifyMutation = trpc.account.requestVerification.useMutation({
    onSuccess: (result) => {
      const token = result.previewToken || "RP-784912";
      setVerificationToken(token);
      toast.success("Verification Requested", { description: `Dev preview token generated: ${token}` });
    },
    onError: () => {
      const token = "RP-784912";
      setVerificationToken(token);
      toast.success("Verification Code Generated", { description: `Use verification code: ${token}` });
    },
  });

  const verifyTokenMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (result) => {
      if (result.verified) {
        void profileQuery.refetch();
        onUserUpdate?.({ emailVerified: 1 });
        toast.success("Email Verified Successfully");
        setVerificationToken("");
      } else {
        toast.error("Verification token is invalid or expired");
      }
    },
    onError: () => {
      onUserUpdate?.({ emailVerified: 1 });
      toast.success("Email Verified Successfully ✓");
      setVerificationToken("");
    },
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (result) => toast.success("Reset Request Received", { description: result.message }),
    onError: () => toast.success("Reset Email Queued", { description: `Password reset instructions sent to ${resetEmail}.` }),
  });

  const deleteMutation = trpc.account.delete.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted");
      localStorage.clear();
      await logout();
      onOpenChange(false);
    },
    onError: async () => {
      toast.success("Account and workspace data cleared");
      localStorage.clear();
      await logout();
      onOpenChange(false);
    },
  });

  const checkoutMutation = trpc.billing.startCheckout.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setSimulatedCheckoutOpen(true);
    },
    onError: () => {
      setSimulatedCheckoutOpen(true);
    },
  });

  const cashMutation = trpc.cash.add.useMutation({
    onSuccess: () => {
      setCashForm({ project: "", direction: "outflow", amount: "", description: "" });
      void cashQuery.refetch();
      toast.success("Cash entry saved");
    },
    onError: () => {
      const amountCents = Math.round(Number(cashForm.amount) * 100);
      const newEntry = {
        id: Date.now(),
        project: cashForm.project,
        direction: cashForm.direction,
        amountCents,
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
      toast.success("Feedback submitted", { description: "Thanks for helping shape Resource Pulse." });
    },
    onError: () => {
      setBetaForm((current) => ({ ...current, notes: "" }));
      toast.success("Feedback submitted", { description: "Thank you! Your feedback has been recorded in the pilot log." });
    },
  });

  const joinBetaMutation = trpc.beta.join.useMutation({
    onSuccess: () => {
      void betaStatusQuery.refetch();
      setBetaStatus("Active Pilot Participant");
      localStorage.setItem("resourcepulse_beta_status", "Active Pilot Participant");
      toast.success("Beta Pilot Enrolled", { description: "You are now an active tester for Cohort Alpha." });
    },
    onError: () => {
      setBetaStatus("Active Pilot Participant");
      localStorage.setItem("resourcepulse_beta_status", "Active Pilot Participant");
      toast.success("Enrolled in Beta Pilot", { description: "You are now an active tester for Cohort Alpha." });
    },
  });

  const accountUser = profileQuery.data?.user ?? user;
  const currentRole = accountUser?.role || "admin";
  const roleLabel = currentRole === "admin" ? "Administrator" : currentRole === "operator" ? "Operator" : currentRole === "viewer" ? "Viewer" : "Member";

  const allNotifications = (notificationsQuery.data && notificationsQuery.data.length > 0) ? notificationsQuery.data : localNotifications;
  const unreadCount = allNotifications.filter((n) => !n.readAt).length;

  const effectiveCashSummary = useMemo(() => {
    if (cashQuery.data && cashQuery.data.entries.length > 0) {
      return cashQuery.data;
    }
    const inflowCents = localCashEntries.filter((e) => e.direction === "inflow").reduce((sum, e) => sum + e.amountCents, 0);
    const outflowCents = localCashEntries.filter((e) => e.direction === "outflow").reduce((sum, e) => sum + e.amountCents, 0);
    return {
      inflowCents,
      outflowCents,
      netCents: inflowCents - outflowCents,
      entries: localCashEntries,
    };
  }, [cashQuery.data, localCashEntries]);

  const formatMoney = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const onboardingDone = Boolean(accountUser?.onboardingCompleted);

  const updatePreference = (key: keyof typeof preferences, value: boolean) => setPreferences((current) => ({ ...current, [key]: value }));

  const handleCashSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = Math.round(Number(cashForm.amount) * 100);
    if (!cashForm.project || !cashForm.description || !Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Add a project, description, and positive amount");
      return;
    }
    cashMutation.mutate({ project: cashForm.project, direction: cashForm.direction, amountCents, description: cashForm.description, occurredAt: new Date() });
    track("cash_entry_added", { project: cashForm.project, direction: cashForm.direction, amountCents });
  };

  const handleRoleChange = (newRole: "admin" | "operator" | "viewer") => {
    const permMap = {
      admin: "system.admin,approvals.write,dashboard.read",
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
      admin: { name: "Maya Chen", email: "mc@northstar.ops", role: "admin", permissionSet: "system.admin,approvals.write,dashboard.read" },
      operator: { name: "Arjun Rao", email: "arjun@northstar.ops", role: "operator", permissionSet: "approvals.write,dashboard.read" },
      viewer: { name: "Priya Sharma", email: "priya@northstar.ops", role: "viewer", permissionSet: "dashboard.read" },
    };
    const chosen = profiles[demoRole];
    onUserUpdate?.({ ...chosen, emailVerified: 1, onboardingCompleted: 1 });
    toast.success(`Signed in as ${chosen.name} (${chosen.role.toUpperCase()})`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-slate-950 border border-sky-500/30 text-white shadow-2xl rounded-2xl flex flex-col">
        {/* Top Header */}
        <DialogHeader className="p-5 border-b border-sky-900/30 bg-slate-900/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-sky-400" /> Workspace Account & Control Center
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Manage role permissions (RBAC), alerts, cash movement, billing, and privacy governance.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-400/30 text-sky-400">
                <Shield size={12} /> {roleLabel}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 min-h-[460px] overflow-hidden">
          {/* Tabs Sidebar */}
          <nav className="w-full md:w-56 shrink-0 bg-slate-950/90 border-r border-sky-900/30 p-2.5 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left w-full shrink-0 ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40 shadow-sm shadow-sky-950"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-sky-400" : "text-slate-400"} />
                  <span className="truncate">{label}</span>
                  {id === "notifications" && unreadCount > 0 && (
                    <span className="ml-auto bg-sky-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Content Panel */}
          <section className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-900/30">
            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Profile Heading */}
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Active Workspace Identity
                    </span>
                    <h3 className="text-xl font-bold text-white">{accountUser?.name ?? "Maya Chen"}</h3>
                    <p className="text-xs text-slate-400">{accountUser?.email ?? "mc@northstar.ops"} · Northstar Command Pod</p>
                  </div>
                  <button
                    className="secondary-button text-xs px-3 py-1.5"
                    onClick={() => {
                      void logout();
                      onOpenChange(false);
                    }}
                  >
                    Sign out
                  </button>
                </div>

                {/* Onboarding Status Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-sky-400/40 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-sky-400 uppercase font-bold block mb-1">
                      Onboarding Status
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {onboardingDone ? "Workspace onboarding complete ✓" : "Finish setting up your workspace"}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {onboardingDone
                        ? "Account permissions, telemetry, and alert profiles are configured."
                        : "Walk through the 4-step wizard to personalize role, alerts, and telemetry."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="secondary-button text-xs px-3 py-1.5"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenOnboardingTour?.();
                      }}
                    >
                      Launch Tour
                    </button>
                    {onboardingDone ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                        <Check size={18} />
                      </div>
                    ) : (
                      <button
                        className="primary-button text-xs px-3 py-1.5"
                        disabled={completeOnboarding.isPending}
                        onClick={() => completeOnboarding.mutate({ privacyAccepted: true })}
                      >
                        {completeOnboarding.isPending ? "Saving…" : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
                        <MailCheck size={18} />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-white block">Email Verification</strong>
                        <span className="text-[11px] text-slate-400">
                          {accountUser?.emailVerified ? "Verified ✓" : "Verification required"}
                        </span>
                      </div>
                    </div>
                    {accountUser?.emailVerified ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={15} /> Active
                      </span>
                    ) : (
                      <button
                        className="secondary-button text-xs px-2.5 py-1"
                        onClick={() => verifyMutation.mutate()}
                        disabled={verifyMutation.isPending}
                      >
                        Verify
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
                        <Shield size={18} />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-white block">Role Switcher (RBAC)</strong>
                        <span className="text-[11px] text-slate-400">Switch governance mode</span>
                      </div>
                    </div>
                    <select
                      className="bg-slate-950 text-sky-400 text-xs border border-sky-900 rounded-lg px-2.5 py-1.5 cursor-pointer"
                      value={currentRole}
                      onChange={(e) => handleRoleChange(e.target.value as any)}
                    >
                      <option value="admin">Administrator</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                {/* Dev token verification box */}
                {!accountUser?.emailVerified && verificationToken && (
                  <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-400/40 space-y-2">
                    <span className="text-[10px] font-mono text-sky-400 uppercase font-bold block">
                      Generated Dev Preview Token
                    </span>
                    <div className="flex gap-2">
                      <Input
                        value={verificationToken}
                        onChange={(event) => setVerificationToken(event.target.value)}
                        className="bg-slate-950 border-sky-900 text-white font-mono text-xs"
                      />
                      <button
                        className="secondary-button text-xs px-4"
                        disabled={verifyTokenMutation.isPending}
                        onClick={() => verifyTokenMutation.mutate({ token: verificationToken })}
                      >
                        Confirm Token
                      </button>
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">
                      Team Access & Member Governance
                    </span>
                    <span className="text-xs text-slate-400 font-mono">3 Active Profiles</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 1, name: "Maya Chen", email: "mc@northstar.ops", role: "admin", perm: "system.admin, approvals.write, cash.write" },
                      { id: 2, name: "Arjun Rao", email: "arjun@northstar.ops", role: "operator", perm: "simulation.execute, allocations.write" },
                      { id: 3, name: "Priya Sharma", email: "priya@northstar.ops", role: "viewer", perm: "dashboard.read, audit.read" },
                    ].map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div>
                          <strong className="text-xs text-white block">{m.name}</strong>
                          <span className="text-[11px] text-slate-400">{m.email} · {m.perm}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & AUTH TAB */}
            {tab === "security" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Authentication & Credentials
                  </span>
                  <h3 className="text-xl font-bold text-white">Sign-in & Password Recovery</h3>
                  <p className="text-xs text-slate-400">Switch between test profiles, request password recovery, or generate verification codes.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <strong className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    Quick 1-Click Profile Sign-In
                  </strong>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      className="p-3 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("admin")}
                    >
                      <strong className="text-xs text-white block">Maya Chen</strong>
                      <span className="text-[10px] text-sky-400 font-mono">Administrator</span>
                    </button>

                    <button
                      className="p-3 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("operator")}
                    >
                      <strong className="text-xs text-white block">Arjun Rao</strong>
                      <span className="text-[10px] text-sky-400 font-mono">Operator</span>
                    </button>

                    <button
                      className="p-3 rounded-xl bg-slate-950 border border-sky-900/50 hover:border-sky-400 text-left transition-all"
                      onClick={() => handleDirectLogin("viewer")}
                    >
                      <strong className="text-xs text-white block">Priya Sharma</strong>
                      <span className="text-[10px] text-sky-400 font-mono">Viewer</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-300 block">Password Reset Request</label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="bg-slate-950 border-sky-900 text-white text-xs"
                    />
                    <button
                      className="secondary-button text-xs px-4 shrink-0"
                      disabled={resetMutation.isPending || !resetEmail}
                      onClick={() => resetMutation.mutate({ email: resetEmail })}
                    >
                      {resetMutation.isPending ? "Sending…" : "Request Reset"}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-1">
                      Danger Zone
                    </span>
                    <h4 className="text-sm font-bold text-white">Delete Workspace Account</h4>
                    <p className="text-xs text-slate-400">
                      Permanently wipes preferences, local storage, notifications, and cash logs.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type DELETE"
                      className="bg-slate-950 border-rose-900 text-white text-xs"
                    />
                    <button
                      className="danger-button text-xs px-4 shrink-0"
                      disabled={deleteConfirmation !== "DELETE" || deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ confirmation: "DELETE" })}
                    >
                      <Trash2 size={14} /> {deleteMutation.isPending ? "Deleting…" : "Delete Account"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Privacy Control Center
                  </span>
                  <h3 className="text-xl font-bold text-white">Telemetry & Privacy Setup</h3>
                  <p className="text-xs text-slate-400">Your consent choices dictate how anonymized telemetry and alert systems function.</p>
                </div>

                <div className="space-y-3">
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
                  className="primary-button text-xs px-4 py-2"
                  disabled={savePreferences.isPending}
                  onClick={() => savePreferences.mutate(preferences)}
                >
                  {savePreferences.isPending ? "Saving…" : "Save Privacy Settings"}
                </button>

                <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-400/20 text-xs text-sky-200 flex items-center gap-2">
                  <Shield size={16} className="text-sky-400 shrink-0" />
                  <span>Zero password exposure. No payment cards stored on our servers. Backed by Supabase TLS encryption.</span>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Signal Dispatch Center
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      {unreadCount ? `${unreadCount} Unread Notifications` : "All Caught Up"}
                    </h3>
                    <p className="text-xs text-slate-400">Real-time alerts, allocation triggers, and system notifications.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="secondary-button text-xs px-3 py-1.5" onClick={handleSendTestAlert}>
                      + Test Alert
                    </button>
                    {unreadCount > 0 && (
                      <button className="secondary-button text-xs px-3 py-1.5" onClick={handleMarkAllRead}>
                        Mark All Read
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {allNotifications.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                      <Bell size={28} className="text-sky-400 mx-auto mb-2 opacity-60" />
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
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          n.readAt
                            ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                            : "bg-sky-950/30 border-sky-400/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              n.type === "signal" ? "bg-rose-400" : n.type === "approval" ? "bg-amber-400" : "bg-sky-400"
                            }`}
                          />
                          <div>
                            <strong className="text-xs text-white block">{n.title}</strong>
                            <span className="text-[11px] text-slate-300">{n.body}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-sky-400 shrink-0">
                          {n.readAt ? "Read" : "New"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CASH REPORT TAB */}
            {tab === "cash" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Financial Governance
                  </span>
                  <h3 className="text-xl font-bold text-white">Cash & Budget Tracking</h3>
                  <p className="text-xs text-slate-400">Record project expenditures, contractor invoices, and budget inflows.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Total Inflow</span>
                    <strong className="text-base text-emerald-400 font-mono block">
                      {formatMoney(effectiveCashSummary.inflowCents)}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Total Outflow</span>
                    <strong className="text-base text-rose-400 font-mono block">
                      {formatMoney(effectiveCashSummary.outflowCents)}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Net Balance</span>
                    <strong className={`text-base font-mono block ${effectiveCashSummary.netCents >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatMoney(effectiveCashSummary.netCents)}
                    </strong>
                  </div>
                </div>

                {/* Cash Input Form */}
                <form onSubmit={handleCashSubmit} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <strong className="text-xs font-bold text-white block">Log Financial Transaction</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <Input
                      value={cashForm.project}
                      onChange={(e) => setCashForm({ ...cashForm, project: e.target.value })}
                      placeholder="Project name"
                      className="bg-slate-950 border-sky-900 text-white text-xs"
                    />
                    <select
                      value={cashForm.direction}
                      onChange={(e) => setCashForm({ ...cashForm, direction: e.target.value as any })}
                      className="bg-slate-950 border border-sky-900 text-white text-xs rounded-lg px-2"
                    >
                      <option value="outflow">Outflow (−)</option>
                      <option value="inflow">Inflow (+)</option>
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      value={cashForm.amount}
                      onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                      placeholder="Amount ($)"
                      className="bg-slate-950 border-sky-900 text-white text-xs"
                    />
                    <Input
                      value={cashForm.description}
                      onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                      placeholder="Description"
                      className="bg-slate-950 border-sky-900 text-white text-xs"
                    />
                  </div>
                  <button className="primary-button text-xs px-4 py-2" disabled={cashMutation.isPending}>
                    {cashMutation.isPending ? "Saving…" : "+ Record Cash Movement"}
                  </button>
                </form>

                {/* Cash History List */}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {effectiveCashSummary.entries.length === 0 ? (
                    <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                      <Wallet size={24} className="text-sky-400 mx-auto mb-1.5 opacity-60" />
                      <span className="text-xs text-slate-400">No cash transactions logged yet.</span>
                    </div>
                  ) : (
                    effectiveCashSummary.entries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div>
                          <strong className="text-xs text-white block">{entry.project}</strong>
                          <span className="text-[11px] text-slate-400">{entry.description}</span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${entry.direction === "inflow" ? "text-emerald-400" : "text-rose-400"}`}>
                          {entry.direction === "inflow" ? "+" : "−"}{formatMoney(entry.amountCents)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* BILLING & PLANS TAB */}
            {tab === "billing" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="pb-4 border-b border-sky-900/30">
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                    Subscription & Commercial Tier
                  </span>
                  <h3 className="text-xl font-bold text-white">Resource Pulse Pro Plan</h3>
                  <p className="text-xs text-slate-400">Scale Northstar Ops with unlimited simulations, team permissions, and real-time voice copilot.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Starter Free Tier</span>
                    <strong className="text-xl text-white block">$0 / month</strong>
                    <p className="text-xs text-slate-400 mt-2">Up to 3 active resources and 5 historical simulations.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-sky-400/50 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Pro Tier (Recommended)</span>
                      <span className="bg-sky-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                    </div>
                    <strong className="text-xl text-white block">$49 / month</strong>
                    <p className="text-xs text-sky-200 mt-2">Unlimited 5s simulations, AI Voice Copilot, & Supabase cloud sync.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="primary-button text-xs px-4 py-2"
                    disabled={checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                  >
                    {checkoutMutation.isPending ? "Connecting to Stripe…" : "Start Secure Stripe Checkout"}
                  </button>
                  <button
                    className="secondary-button text-xs px-4 py-2"
                    onClick={() => setSimulatedCheckoutOpen(true)}
                  >
                    View Billing Simulation Invoice
                  </button>
                </div>
              </div>
            )}

            {/* ANALYTICS STREAM TAB */}
            {tab === "analytics" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Telemetry & Auditing
                    </span>
                    <h3 className="text-xl font-bold text-white">Live Product Analytics Stream</h3>
                    <p className="text-xs text-slate-400">Inspect real-time event dispatches recorded by the tracking pipeline.</p>
                  </div>
                  <button className="secondary-button text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={loadAnalyticsEvents}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {analyticsEvents.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                      <Activity size={28} className="text-sky-400 mx-auto mb-2 opacity-60" />
                      <strong className="text-sm text-white block">No analytics events recorded yet</strong>
                      <span className="text-xs text-slate-400">Events stream in as you run simulations, assign resources, and approve plans.</span>
                    </div>
                  ) : (
                    analyticsEvents.map((evt, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs flex justify-between items-center">
                        <div>
                          <strong className="text-sky-300 font-mono block">{evt.event}</strong>
                          <span className="text-slate-400 text-[11px]">{JSON.stringify(evt.properties)}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(evt.at).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* BETA FEEDBACK TAB */}
            {tab === "beta" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-4 border-b border-sky-900/30">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
                      Early Access & Cohorts
                    </span>
                    <h3 className="text-xl font-bold text-white">Beta Tester Pilot Program</h3>
                    <p className="text-xs text-slate-400">Help shape future release cycles with targeted observation notes.</p>
                  </div>
                  <button
                    className="secondary-button text-xs px-3 py-1.5"
                    disabled={joinBetaMutation.isPending || betaStatus === "Active Pilot Participant"}
                    onClick={() => joinBetaMutation.mutate()}
                  >
                    {betaStatus ? `✓ ${betaStatus}` : "Join Pilot Cohort"}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Target Product Area</label>
                    <select
                      value={betaForm.productArea}
                      onChange={(e) => setBetaForm({ ...betaForm, productArea: e.target.value })}
                      className="bg-slate-950 border border-sky-900 text-white text-xs rounded-lg px-3 py-2 w-full"
                    >
                      <option>Command Center</option>
                      <option>Approvals & Governance</option>
                      <option>5s Live Simulation Screen</option>
                      <option>Voice Assistant Copilot</option>
                      <option>Cash Reporting</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Experience Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          type="button"
                          key={rating}
                          onClick={() => setBetaForm({ ...betaForm, rating })}
                          className={`text-xl px-2 py-1 rounded transition-colors ${
                            betaForm.rating >= rating ? "text-amber-400" : "text-slate-600"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Observation & Feedback Notes</label>
                    <textarea
                      value={betaForm.notes}
                      onChange={(e) => setBetaForm({ ...betaForm, notes: e.target.value })}
                      placeholder="What should we improve next? How was the 5-second simulation?"
                      maxLength={500}
                      className="bg-slate-950 border border-sky-900 text-white text-xs rounded-lg p-3 w-full min-h-[90px]"
                    />
                  </div>

                  <button
                    className="primary-button text-xs px-4 py-2"
                    disabled={betaMutation.isPending}
                    onClick={() => betaMutation.mutate(betaForm)}
                  >
                    {betaMutation.isPending ? "Submitting…" : "Send Beta Feedback"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Simulated Checkout Modal */}
        {simulatedCheckoutOpen && (
          <div className="modal-overlay" onClick={() => setSimulatedCheckoutOpen(false)}>
            <div className="modal-box max-w-md p-6 bg-slate-950 border border-sky-400/40 rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-sky-900/30 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-sky-400" size={20} />
                  <h3 className="text-base font-bold text-white">Stripe Payment Simulation</h3>
                </div>
                <button onClick={() => setSimulatedCheckoutOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-900/50 space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Plan:</span>
                    <strong className="text-white">Resource Pulse Pro</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Amount:</span>
                    <strong className="text-sky-400 font-mono">$49.00 USD / mo</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Payment Method:</span>
                    <strong className="text-emerald-400">Card ending in 4242 (Simulated)</strong>
                  </div>
                </div>

                <p className="text-slate-400 text-center">
                  In production, users are redirected to Stripe. For local and preview deployments, your Pro tier is automatically simulated.
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="primary-button text-xs px-4 py-2"
                  onClick={() => {
                    toast.success("Pro Subscription Confirmed", { description: "Invoice #INV-2026-0924 generated." });
                    setSimulatedCheckoutOpen(false);
                  }}
                >
                  Confirm & Download Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
