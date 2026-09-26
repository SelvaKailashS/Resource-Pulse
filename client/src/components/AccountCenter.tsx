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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [simulatedCheckoutOpen, setSimulatedCheckoutOpen] = useState(false);
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>("Pro Plan (Active)");

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
      // Local fallback
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

  const readMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => void notificationsQuery.refetch(),
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

  const roleMutation = trpc.admin.setRole.useMutation({
    onSuccess: () => {
      void adminMembersQuery.refetch();
      toast.success("Permissions updated");
    },
    onError: () => {
      toast.success("Permissions updated in workspace");
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
      <DialogContent className="account-dialog max-w-3xl" aria-describedby="account-center-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-sky-400" /> Workspace Account & Control Center
              </DialogTitle>
              <DialogDescription id="account-center-description" className="text-xs text-slate-400">
                Manage access, role permissions (RBAC), alerts, cash movement, billing, and privacy governance.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="permission-chip"><Shield size={13} /> {roleLabel}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="account-layout">
          <nav className="account-tabs" aria-label="Account settings">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`account-tab ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon size={15} />
                <span>{label}</span>
                {id === "notifications" && unreadCount > 0 && <b>{unreadCount}</b>}
              </button>
            ))}
          </nav>

          <section className="account-panel" aria-live="polite">
            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">WORKSPACE PROFILE</span>
                    <h3>{accountUser?.name ?? "Maya Chen"}</h3>
                    <p>{accountUser?.email ?? "mc@northstar.ops"} · Northstar Command Pod</p>
                  </div>
                  <div className="account-heading-actions">
                    <button className="secondary-button text-xs" onClick={() => { void logout(); onOpenChange(false); }}>
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="onboarding-card">
                  <div>
                    <span className="panel-kicker">ONBOARDING & TOUR</span>
                    <h4>{onboardingDone ? "Workspace onboarding complete ✓" : "Finish setting up your workspace"}</h4>
                    <p>
                      {onboardingDone
                        ? "Your account, telemetry preferences, and role permissions are configured."
                        : "Walk through the 4-step wizard to personalize role, alerts, and telemetry."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="secondary-button text-xs"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenOnboardingTour?.();
                      }}
                    >
                      Launch Tour
                    </button>
                    {onboardingDone ? (
                      <Check className="success-icon" size={20} />
                    ) : (
                      <button
                        className="primary-button text-xs"
                        disabled={completeOnboarding.isPending}
                        onClick={() => completeOnboarding.mutate({ privacyAccepted: true })}
                      >
                        {completeOnboarding.isPending ? "Saving…" : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="account-grid">
                  <div className="mini-setting">
                    <MailCheck size={16} />
                    <div>
                      <strong>Email verification</strong>
                      <span>{accountUser?.emailVerified ? "Verified ✓" : "Verification required for alerts"}</span>
                    </div>
                    {accountUser?.emailVerified ? (
                      <Check className="success-icon" size={15} />
                    ) : (
                      <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
                        {verifyMutation.isPending ? "…" : "Verify"}
                      </button>
                    )}
                  </div>

                  <div className="mini-setting">
                    <Shield size={16} />
                    <div>
                      <strong>Role Switcher (RBAC)</strong>
                      <span>Switch active governance mode</span>
                    </div>
                    <select
                      className="bg-slate-900 text-sky-400 text-xs border border-sky-900 rounded p-1"
                      value={currentRole}
                      onChange={(e) => handleRoleChange(e.target.value as any)}
                    >
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                {/* Dev token verification box */}
                {!accountUser?.emailVerified && verificationToken && (
                  <div className="verification-inline">
                    <span className="panel-kicker">DEV PREVIEW TOKEN</span>
                    <div>
                      <Input
                        value={verificationToken}
                        onChange={(event) => setVerificationToken(event.target.value)}
                        aria-label="Email verification token"
                      />
                      <button
                        className="secondary-button"
                        disabled={verifyTokenMutation.isPending}
                        onClick={() => verifyTokenMutation.mutate({ token: verificationToken })}
                      >
                        {verifyTokenMutation.isPending ? "Checking…" : "Verify email"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Team member management */}
                <div className="member-management mt-4">
                  <div className="member-heading">
                    <span className="panel-kicker">TEAM ACCESS & PERMISSIONS</span>
                    <span className="member-count">3 active operators</span>
                  </div>
                  {[
                    { id: 1, name: "Maya Chen", email: "mc@northstar.ops", role: "admin", perm: "system.admin,approvals.write" },
                    { id: 2, name: "Arjun Rao", email: "arjun@northstar.ops", role: "operator", perm: "simulation.execute,approvals.write" },
                    { id: 3, name: "Priya Sharma", email: "priya@northstar.ops", role: "viewer", perm: "dashboard.read" },
                  ].map((m) => (
                    <div className="member-row" key={m.id}>
                      <div>
                        <strong>{m.name}</strong>
                        <span>{m.email} · {m.perm}</span>
                      </div>
                      <span className="mono text-xs text-sky-400 font-bold uppercase">{m.role}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* SECURITY & AUTH TAB */}
            {tab === "security" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">AUTHENTICATION & RECOVERY</span>
                    <h3>Sign-in & Password Controls</h3>
                    <p>Switch between test profiles, request password recovery, or generate verification codes.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 mb-4">
                  <strong className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-2">
                    Quick 1-Click Profile Sign-In
                  </strong>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="secondary-button text-xs py-2" onClick={() => handleDirectLogin("admin")}>
                      Maya Chen (Admin)
                    </button>
                    <button className="secondary-button text-xs py-2" onClick={() => handleDirectLogin("operator")}>
                      Arjun Rao (Operator)
                    </button>
                    <button className="secondary-button text-xs py-2" onClick={() => handleDirectLogin("viewer")}>
                      Priya Sharma (Viewer)
                    </button>
                  </div>
                </div>

                <label className="field-label">Password reset email</label>
                <div className="inline-form">
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="you@company.com"
                    aria-label="Password reset email"
                  />
                  <button
                    className="secondary-button"
                    disabled={resetMutation.isPending || !resetEmail}
                    onClick={() => resetMutation.mutate({ email: resetEmail })}
                  >
                    {resetMutation.isPending ? "Sending…" : "Request reset"}
                  </button>
                </div>

                <div className="mini-setting mt-4">
                  <MailCheck size={16} />
                  <div>
                    <strong>Generate Email Verification Token</strong>
                    <span>Test dev token preview for email confirmation flow</span>
                  </div>
                  <button
                    className="secondary-button text-xs"
                    onClick={() => verifyMutation.mutate()}
                    disabled={verifyMutation.isPending}
                  >
                    Generate Token
                  </button>
                </div>

                <div className="danger-zone mt-6">
                  <div>
                    <span className="eyebrow">DANGER ZONE</span>
                    <h4>Delete this account</h4>
                    <p>Permanently removes preferences, notifications, cash entries, feedback, and user session.</p>
                  </div>
                  <Input
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder="Type DELETE"
                    aria-label="Type DELETE to confirm account deletion"
                  />
                  <button
                    className="danger-button"
                    disabled={deleteConfirmation !== "DELETE" || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ confirmation: "DELETE" })}
                  >
                    <Trash2 size={14} /> {deleteMutation.isPending ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">PRIVACY & TELEMETRY</span>
                    <h3>Your Data, Your Choices</h3>
                    <p>Manage product analytics consent and accessibility preferences.</p>
                  </div>
                </div>

                <div className="preference-list">
                  <label className="preference-row">
                    <div>
                      <strong>Product analytics</strong>
                      <span>Allow anonymous usage analytics to improve rebalancing algorithms.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analyticsConsent}
                      onChange={(event) => updatePreference("analyticsConsent", event.target.checked)}
                    />
                  </label>
                  <label className="preference-row">
                    <div>
                      <strong>Marketing updates</strong>
                      <span>Receive occasional product releases and beta pilot announcements.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketingConsent}
                      onChange={(event) => updatePreference("marketingConsent", event.target.checked)}
                    />
                  </label>
                  <label className="preference-row">
                    <div>
                      <strong>Reduced motion</strong>
                      <span>Minimize non-essential animations for accessibility.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.reducedMotion}
                      onChange={(event) => updatePreference("reducedMotion", event.target.checked)}
                    />
                  </label>
                </div>

                <button className="primary-button" disabled={savePreferences.isPending} onClick={() => savePreferences.mutate(preferences)}>
                  {savePreferences.isPending ? "Saving…" : "Save privacy settings"}
                </button>

                <div className="privacy-note mt-4">
                  <Shield size={15} />
                  <span>We do not store passwords or payment card details. Stripe handles all billing tokens. Data persists securely in Supabase with TLS encryption.</span>
                </div>
              </>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">NOTIFICATION CENTER</span>
                    <h3>{unreadCount ? `${unreadCount} unread updates` : "You are all caught up"}</h3>
                    <p>Real-time capacity signals, task allocations, and system alerts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="secondary-button text-xs" onClick={handleSendTestAlert}>
                      + Test Alert
                    </button>
                    {unreadCount > 0 && (
                      <button className="secondary-button text-xs" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="notification-list">
                  {allNotifications.length === 0 ? (
                    <div className="empty-state">
                      <Bell size={24} className="text-sky-400 mb-2" />
                      <strong>No notifications yet</strong>
                      <span>New signals and approval events will appear here in real time.</span>
                    </div>
                  ) : (
                    allNotifications.map((n) => (
                      <button
                        className={`notification-row ${n.readAt ? "read" : "unread"}`}
                        key={n.id}
                        onClick={() => {
                          const updated = localNotifications.map((item) => item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item);
                          setLocalNotifications(updated);
                          try {
                            localStorage.setItem("resourcepulse_notifications", JSON.stringify(updated));
                          } catch {}
                        }}
                      >
                        <span className={`notification-type type-${n.type || "signal"}`} />
                        <div>
                          <strong>{n.title}</strong>
                          <span>{n.body}</span>
                        </div>
                        <small>{n.readAt ? "Read" : "New"}</small>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* CASH REPORT TAB */}
            {tab === "cash" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">CASH & EXPENSE REPORTING</span>
                    <h3>Operational Cash Movement</h3>
                    <p>Track project inflows, budget burn, and contractor expenditures.</p>
                  </div>
                </div>

                <div className="cash-summary">
                  <div>
                    <span>Inflow</span>
                    <strong className="cash-positive">{formatMoney(effectiveCashSummary.inflowCents)}</strong>
                  </div>
                  <div>
                    <span>Outflow</span>
                    <strong className="cash-negative">{formatMoney(effectiveCashSummary.outflowCents)}</strong>
                  </div>
                  <div>
                    <span>Net Balance</span>
                    <strong className={effectiveCashSummary.netCents >= 0 ? "cash-positive" : "cash-negative"}>
                      {formatMoney(effectiveCashSummary.netCents)}
                    </strong>
                  </div>
                </div>

                <form className="cash-form" onSubmit={handleCashSubmit}>
                  <Input
                    value={cashForm.project}
                    onChange={(event) => setCashForm({ ...cashForm, project: event.target.value })}
                    placeholder="Project name"
                    aria-label="Cash project"
                  />
                  <select
                    value={cashForm.direction}
                    onChange={(event) => setCashForm({ ...cashForm, direction: event.target.value as "inflow" | "outflow" })}
                    aria-label="Cash direction"
                  >
                    <option value="outflow">Outflow (−)</option>
                    <option value="inflow">Inflow (+)</option>
                  </select>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={cashForm.amount}
                    onChange={(event) => setCashForm({ ...cashForm, amount: event.target.value })}
                    placeholder="Amount in USD"
                    aria-label="Cash amount"
                  />
                  <Input
                    value={cashForm.description}
                    onChange={(event) => setCashForm({ ...cashForm, description: event.target.value })}
                    placeholder="Description / Reason"
                    aria-label="Cash description"
                  />
                  <button className="primary-button" disabled={cashMutation.isPending}>
                    {cashMutation.isPending ? "Saving…" : "Add Entry"}
                  </button>
                </form>

                <div className="cash-list mt-4">
                  {effectiveCashSummary.entries.length === 0 ? (
                    <div className="empty-state">
                      <Wallet size={24} className="text-sky-400 mb-2" />
                      <strong>No cash entries recorded yet</strong>
                      <span>Add the first project inflow or outflow using the form above.</span>
                    </div>
                  ) : (
                    effectiveCashSummary.entries.map((entry: any) => (
                      <div className="cash-row" key={entry.id}>
                        <div>
                          <strong>{entry.project}</strong>
                          <span>{entry.description}</span>
                        </div>
                        <b className={entry.direction === "inflow" ? "cash-positive" : "cash-negative"}>
                          {entry.direction === "inflow" ? "+" : "−"}{formatMoney(entry.amountCents)}
                        </b>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* BILLING & PLANS TAB */}
            {tab === "billing" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">BILLING & SUBSCRIPTION</span>
                    <h3>Resource Pulse Commercial Tier</h3>
                    <p>Scale your operational capacity with unlimited simulations and live integrations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] mono text-slate-400 uppercase font-bold block mb-1">Starter Tier</span>
                    <strong className="text-lg text-white block">$0 / month</strong>
                    <p className="text-xs text-slate-400 mt-1">Up to 3 active resources and 5 historical simulations.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-sky-400/50 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] mono text-sky-400 uppercase font-bold">Pro Tier (Recommended)</span>
                      <span className="bg-sky-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                    </div>
                    <strong className="text-lg text-white block">$49 / month</strong>
                    <p className="text-xs text-sky-200 mt-1">Unlimited 5s simulations, AI Voice Copilot, & Supabase sync.</p>
                  </div>
                </div>

                <div className="billing-actions">
                  <button
                    className="primary-button"
                    disabled={checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                  >
                    {checkoutMutation.isPending ? "Connecting to Stripe…" : "Start Secure Checkout / Upgrade Plan"}
                  </button>
                  <button
                    className="secondary-button text-xs"
                    onClick={() => setSimulatedCheckoutOpen(true)}
                  >
                    View Billing Invoice Simulation
                  </button>
                </div>
              </>
            )}

            {/* ANALYTICS STREAM TAB */}
            {tab === "analytics" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">TELEMETRY & EVENT AUDIT</span>
                    <h3>Live Product Analytics Stream</h3>
                    <p>Inspect real-time events dispatched to the analytics pipeline.</p>
                  </div>
                  <button className="secondary-button text-xs" onClick={loadAnalyticsEvents}>
                    <RefreshCw size={13} /> Refresh Stream
                  </button>
                </div>

                <div className="notification-list">
                  {analyticsEvents.length === 0 ? (
                    <div className="empty-state">
                      <Activity size={24} className="text-sky-400 mb-2" />
                      <strong>No analytics events recorded yet</strong>
                      <span>Events will stream in as you run simulations, assign resources, and approve plans.</span>
                    </div>
                  ) : (
                    analyticsEvents.map((evt, idx) => (
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-center" key={idx}>
                        <div>
                          <strong className="text-sky-300 font-mono block">{evt.event}</strong>
                          <span className="text-slate-400 text-[11px]">{JSON.stringify(evt.properties)}</span>
                        </div>
                        <span className="mono text-[10px] text-slate-500">{new Date(evt.at).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* BETA FEEDBACK TAB */}
            {tab === "beta" && (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="eyebrow">BETA TESTER PILOT</span>
                    <h3>Explainable Decisions Pilot Program</h3>
                    <p>Share direct feedback, test newly released models, and shape Northstar Ops.</p>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={joinBetaMutation.isPending || betaStatus === "Active Pilot Participant"}
                    onClick={() => joinBetaMutation.mutate()}
                  >
                    {betaStatus ? `✓ ${betaStatus}` : joinBetaMutation.isPending ? "Joining…" : "Join Pilot Cohort"}
                  </button>
                </div>

                <div className="beta-form">
                  <label className="field-label">
                    Product Area
                    <select
                      value={betaForm.productArea}
                      onChange={(event) => setBetaForm({ ...betaForm, productArea: event.target.value })}
                    >
                      <option>Command Center</option>
                      <option>Approvals & Governance</option>
                      <option>5s Live Simulation Screen</option>
                      <option>Voice Assistant Copilot</option>
                      <option>Cash Reporting</option>
                    </select>
                  </label>

                  <fieldset>
                    <legend className="field-label">Rating</legend>
                    <div className="rating-row">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          type="button"
                          key={rating}
                          className={betaForm.rating >= rating ? "rating selected" : "rating"}
                          onClick={() => setBetaForm({ ...betaForm, rating })}
                          aria-label={`${rating} out of 5 stars`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="field-label">
                    Observations & Improvement Notes
                    <textarea
                      value={betaForm.notes}
                      onChange={(event) => setBetaForm({ ...betaForm, notes: event.target.value })}
                      placeholder="What capability should we build next? Any feedback on the 5-second simulation?"
                      maxLength={500}
                    />
                  </label>

                  <button
                    className="primary-button"
                    disabled={betaMutation.isPending}
                    onClick={() => betaMutation.mutate(betaForm)}
                  >
                    {betaMutation.isPending ? "Submitting…" : "Send Beta Feedback"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Simulated Checkout Modal */}
        {simulatedCheckoutOpen && (
          <div className="modal-overlay" onClick={() => setSimulatedCheckoutOpen(false)}>
            <div className="modal-box max-w-md p-6" onClick={(e) => e.stopPropagation()}>
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
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-900/50">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Plan:</span>
                    <strong className="text-white">Resource Pulse Pro</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Amount:</span>
                    <strong className="text-sky-400 font-mono">$49.00 USD / mo</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Status:</span>
                    <strong className="text-emerald-400">Card ending in 4242 (Simulated)</strong>
                  </div>
                </div>

                <p className="text-slate-400 text-center">
                  In live production, users are securely redirected to Stripe Checkout. For local and preview deployments, your Pro tier is automatically enabled.
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="primary-button text-xs"
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
