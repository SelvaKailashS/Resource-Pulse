import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { setAnalyticsConsent } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Check, CreditCard, LockKeyhole, MailCheck, Shield, Trash2, UserRound, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const tabs = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "security", label: "Security", icon: LockKeyhole },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "cash", label: "Cash report", icon: Wallet },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "beta", label: "Beta feedback", icon: MailCheck },
] as const;

type Tab = (typeof tabs)[number]["id"];

const defaultPreferences = { emailAlerts: true, inAppAlerts: true, analyticsConsent: false, marketingConsent: false, reducedMotion: false };
type AccountUser = { name?: string | null; email?: string | null; role?: string | null; emailVerified?: number; onboardingCompleted?: number; permissionSet?: string | null };

export function AccountCenter({ open, onOpenChange, isAuthenticated, user, logout }: { open: boolean; onOpenChange: (open: boolean) => void; isAuthenticated: boolean; user: AccountUser | null; logout: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [resetEmail, setResetEmail] = useState(user?.email ?? "");
  const [cashForm, setCashForm] = useState({ project: "", direction: "outflow" as "inflow" | "outflow", amount: "", description: "" });
  const [betaForm, setBetaForm] = useState({ productArea: "Command center", rating: 5, notes: "" });

  const profileQuery = trpc.account.profile.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const cashQuery = trpc.cash.summary.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const billingQuery = trpc.billing.status.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const betaStatusQuery = trpc.beta.status.useQuery(undefined, { enabled: open && isAuthenticated, retry: false });
  const adminMembersQuery = trpc.admin.members.useQuery(undefined, { enabled: open && isAuthenticated && (user?.role === "admin" || profileQuery.data?.user?.role === "admin"), retry: false });
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
    onSuccess: () => { void profileQuery.refetch(); void utils.account.profile.invalidate(); toast.success("Workspace ready", { description: "Your onboarding and privacy choices are saved." }); },
    onError: (error) => toast.error("Could not complete onboarding", { description: error.message }),
  });
  const savePreferences = trpc.account.updatePreferences.useMutation({
    onSuccess: () => { setAnalyticsConsent(preferences.analyticsConsent); void profileQuery.refetch(); toast.success("Privacy settings saved"); },
    onError: (error) => toast.error("Could not save settings", { description: error.message }),
  });
  const verifyMutation = trpc.account.requestVerification.useMutation({
    onSuccess: (result) => { if (result.previewToken) setVerificationToken(result.previewToken); toast.success("Verification requested", { description: result.previewToken ? "Development preview token generated below." : "A verification email is queued for this account." }); },
    onError: (error) => toast.error("Could not request verification", { description: error.message }),
  });
  const verifyTokenMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (result) => { if (result.verified) { void profileQuery.refetch(); toast.success("Email verified"); setVerificationToken(""); } else toast.error("Verification token is invalid or expired"); },
    onError: (error) => toast.error("Could not verify email", { description: error.message }),
  });
  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (result) => toast.success("Reset request received", { description: result.message }),
    onError: (error) => toast.error("Could not request reset", { description: error.message }),
  });
  const deleteMutation = trpc.account.delete.useMutation({
    onSuccess: async () => { toast.success("Account deleted"); await logout(); onOpenChange(false); },
    onError: (error) => toast.error("Account deletion failed", { description: error.message }),
  });
  const readMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => void notificationsQuery.refetch(),
  });
  const checkoutMutation = trpc.billing.startCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.open(url, "_blank", "noopener,noreferrer"); else toast.error("Checkout link unavailable"); },
    onError: (error) => toast.error("Billing is not ready", { description: error.message }),
  });
  const cashMutation = trpc.cash.add.useMutation({
    onSuccess: () => { setCashForm({ project: "", direction: "outflow", amount: "", description: "" }); void cashQuery.refetch(); toast.success("Cash entry saved"); },
    onError: (error) => toast.error("Could not save cash entry", { description: error.message }),
  });
  const betaMutation = trpc.beta.submitFeedback.useMutation({
    onSuccess: () => { setBetaForm((current) => ({ ...current, notes: "" })); toast.success("Feedback submitted", { description: "Thanks for helping shape Resource Pulse." }); },
    onError: (error) => toast.error("Could not submit feedback", { description: error.message }),
  });
  const joinBetaMutation = trpc.beta.join.useMutation({
    onSuccess: () => { void betaStatusQuery.refetch(); toast.success("Beta request submitted", { description: "We’ll notify you when the pilot cohort opens." }); },
    onError: (error) => toast.error("Could not join beta", { description: error.message }),
  });
  const roleMutation = trpc.admin.setRole.useMutation({
    onSuccess: () => { void adminMembersQuery.refetch(); toast.success("Permissions updated"); },
    onError: (error) => toast.error("Could not update permissions", { description: error.message }),
  });

  const accountUser = profileQuery.data?.user ?? user;
  const roleLabel = accountUser?.role === "admin" ? "Administrator" : accountUser?.role === "operator" ? "Operator" : accountUser?.role === "viewer" ? "Viewer" : "Member";
  const unreadCount = notificationsQuery.data?.filter((notification) => !notification.readAt).length ?? 0;
  const cashSummary = cashQuery.data ?? { inflowCents: 0, outflowCents: 0, netCents: 0, entries: [] };
  const formatMoney = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const onboardingDone = Boolean(accountUser?.onboardingCompleted);
  const profileLoading = isAuthenticated && profileQuery.isLoading;
  const profileError = isAuthenticated && Boolean(profileQuery.error);
  const hasNoData = (cashQuery.data?.entries.length ?? 0) === 0;

  const updatePreference = (key: keyof typeof preferences, value: boolean) => setPreferences((current) => ({ ...current, [key]: value }));

  const handleCashSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = Math.round(Number(cashForm.amount) * 100);
    if (!cashForm.project || !cashForm.description || !Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Add a project, description, and positive amount");
      return;
    }
    cashMutation.mutate({ project: cashForm.project, direction: cashForm.direction, amountCents, description: cashForm.description, occurredAt: new Date() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="account-dialog" aria-describedby="account-center-description">
        <DialogHeader>
          <DialogTitle>Workspace account center</DialogTitle>
          <DialogDescription id="account-center-description">Manage access, privacy, alerts, billing, and operational reporting in one place.</DialogDescription>
        </DialogHeader>
        {!isAuthenticated ? (
          <div className="account-auth-gate">
            <div className="account-auth-icon"><LockKeyhole size={20} /></div>
            <h3>Sign in to manage your workspace</h3>
            <p>Resource Pulse uses secure Manus OAuth. No password is stored in this app.</p>
            <Button className="primary-button" onClick={() => startLogin()}>Sign in / Log in</Button>
            <div className="reset-gate"><Input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="Email for password reset" aria-label="Email for password reset" /><button className="secondary-button" disabled={resetMutation.isPending || !resetEmail} onClick={() => resetMutation.mutate({ email: resetEmail })}>{resetMutation.isPending ? "Sending…" : "Forgot password?"}</button></div>
            <span className="account-help">New here? Your first sign-in starts onboarding automatically.</span>
          </div>
        ) : (
          <div className="account-layout">
            <nav className="account-tabs" aria-label="Account settings">
              {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`account-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}><Icon size={15} /><span>{label}</span>{id === "notifications" && unreadCount > 0 && <b>{unreadCount}</b>}</button>)}
            </nav>
            <section className="account-panel" aria-live="polite">
              {profileLoading && <div className="account-status loading"><span className="spin-dot" /> Loading account settings…</div>}
              {profileError && <div className="account-status error"><strong>Could not load your settings.</strong><button onClick={() => void profileQuery.refetch()}>Try again</button></div>}
              {!profileLoading && !profileError && tab === "overview" && <>
                <div className="account-section-heading"><div><span className="eyebrow">WELCOME TO RESOURCE PULSE</span><h3>{accountUser?.name ?? "Your workspace"}</h3><p>{accountUser?.email ?? "Secure OAuth account"}</p></div><div className="account-heading-actions"><span className="permission-chip"><Shield size={13} /> {roleLabel}</span><button className="secondary-button" onClick={() => { void logout(); onOpenChange(false); }}>Sign out</button></div></div>
                <div className="onboarding-card"><div><span className="panel-kicker">ONBOARDING</span><h4>{onboardingDone ? "Workspace onboarding complete" : "Finish setting up your workspace"}</h4><p>{onboardingDone ? "Your account, privacy choices, and workspace access are configured." : "Choose how Resource Pulse should handle alerts and analytics before you start."}</p></div>{onboardingDone ? <Check className="success-icon" size={20} /> : <button className="primary-button" disabled={completeOnboarding.isPending} onClick={() => completeOnboarding.mutate({ privacyAccepted: preferences.analyticsConsent || true })}>{completeOnboarding.isPending ? "Saving…" : "Complete onboarding"}</button>}</div>
                <div className="account-grid"><div className="mini-setting"><MailCheck size={16} /><div><strong>Email verification</strong><span>{accountUser?.emailVerified ? "Verified" : "Verification required for email alerts"}</span></div>{accountUser?.emailVerified ? <Check className="success-icon" size={15} /> : <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>{verifyMutation.isPending ? "…" : "Send"}</button>}</div><div className="mini-setting"><Shield size={16} /><div><strong>Permissions</strong><span>{roleLabel} · {accountUser?.permissionSet ?? "dashboard.read"}</span></div></div></div>
                {!accountUser?.emailVerified && verificationToken && <div className="verification-inline"><span className="panel-kicker">DEV PREVIEW TOKEN</span><div><Input value={verificationToken} onChange={(event) => setVerificationToken(event.target.value)} aria-label="Email verification token" /><button className="secondary-button" disabled={verifyTokenMutation.isPending} onClick={() => verifyTokenMutation.mutate({ token: verificationToken })}>{verifyTokenMutation.isPending ? "Checking…" : "Verify email"}</button></div></div>}
                {accountUser?.role === "admin" && <div className="member-management"><div className="member-heading"><span className="panel-kicker">WORKSPACE PERMISSIONS</span><span className="member-count">{adminMembersQuery.data?.length ?? 0} members</span></div>{adminMembersQuery.data?.length ? adminMembersQuery.data.map((member) => <div className="member-row" key={member.id}><div><strong>{member.name ?? member.email ?? `Member ${member.id}`}</strong><span>{member.email ?? "No email"} · {member.permissionSet ?? "dashboard.read"}</span></div><select aria-label={`Role for ${member.name ?? member.email ?? member.id}`} value={member.role} onChange={(event) => roleMutation.mutate({ userId: member.id, role: event.target.value as "user" | "viewer" | "operator" | "admin", permissionSet: member.permissionSet ?? "dashboard.read" })}><option value="viewer">Viewer</option><option value="user">Member</option><option value="operator">Operator</option><option value="admin">Admin</option></select></div>) : <div className="empty-state">Loading workspace members…</div>}</div>}
              </>}
              {!profileLoading && !profileError && tab === "security" && <>
                <div className="account-section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h3>Sign-in and recovery</h3><p>OAuth handles primary sign-in. Recovery controls are ready for password-enabled deployments.</p></div></div>
                <div className="security-callout"><LockKeyhole size={17} /><div><strong>Secure OAuth sign-in is active</strong><span>There is no local password to expose or store for your current login method.</span></div></div>
                <label className="field-label">Password reset email</label><div className="inline-form"><Input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@company.com" aria-label="Password reset email" /><button className="secondary-button" disabled={resetMutation.isPending || !resetEmail} onClick={() => resetMutation.mutate({ email: resetEmail })}>{resetMutation.isPending ? "Sending…" : "Request reset"}</button></div>
                <div className="danger-zone"><div><span className="eyebrow">DANGER ZONE</span><h4>Delete this account</h4><p>This permanently removes your preferences, notifications, cash entries, feedback, and account record.</p></div><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={'Type DELETE'} aria-label="Type DELETE to confirm account deletion" /><button className="danger-button" disabled={deleteConfirmation !== "DELETE" || deleteMutation.isPending} onClick={() => deleteMutation.mutate({ confirmation: "DELETE" })}><Trash2 size={14} /> {deleteMutation.isPending ? "Deleting…" : "Delete account"}</button></div>
              </>}
              {!profileLoading && !profileError && tab === "privacy" && <>
                <div className="account-section-heading"><div><span className="eyebrow">PRIVACY CONTROL CENTER</span><h3>Your data, your choices</h3><p>Consent is stored with your account and can be changed at any time.</p></div></div>
                <div className="preference-list"><label className="preference-row"><div><strong>Product analytics</strong><span>Allow anonymous usage analytics to improve flows.</span></div><input type="checkbox" checked={preferences.analyticsConsent} onChange={(event) => updatePreference("analyticsConsent", event.target.checked)} /></label><label className="preference-row"><div><strong>Marketing updates</strong><span>Receive occasional product and beta announcements.</span></div><input type="checkbox" checked={preferences.marketingConsent} onChange={(event) => updatePreference("marketingConsent", event.target.checked)} /></label><label className="preference-row"><div><strong>Reduced motion</strong><span>Minimize non-essential animation for accessibility.</span></div><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => updatePreference("reducedMotion", event.target.checked)} /></label></div>
                <button className="primary-button" disabled={savePreferences.isPending} onClick={() => savePreferences.mutate(preferences)}>{savePreferences.isPending ? "Saving…" : "Save privacy settings"}</button>
                <div className="privacy-note"><Shield size={15} /><span>We do not store passwords or payment card details. Stripe owns payment information; Resource Pulse stores only references needed for account linking.</span></div>
              </>}
              {!profileLoading && !profileError && tab === "notifications" && <>
                <div className="account-section-heading"><div><span className="eyebrow">NOTIFICATION CENTER</span><h3>{unreadCount ? `${unreadCount} unread updates` : "You are all caught up"}</h3><p>In-app approval, signal, system, and billing notifications.</p></div></div>
                <div className="preference-list"><label className="preference-row"><div><strong>In-app alerts</strong><span>Show notifications inside Resource Pulse.</span></div><input type="checkbox" checked={preferences.inAppAlerts} onChange={(event) => updatePreference("inAppAlerts", event.target.checked)} /></label><label className="preference-row"><div><strong>Email alerts</strong><span>Send important signals and approval updates by email.</span></div><input type="checkbox" checked={preferences.emailAlerts} onChange={(event) => updatePreference("emailAlerts", event.target.checked)} /></label></div><button className="secondary-button" disabled={savePreferences.isPending} onClick={() => savePreferences.mutate(preferences)}>Save alert preferences</button>
                <div className="notification-list">{notificationsQuery.isLoading ? <div className="empty-state">Loading notifications…</div> : notificationsQuery.data?.length ? notificationsQuery.data.map((notification) => <button className={`notification-row ${notification.readAt ? "read" : "unread"}`} key={notification.id} onClick={() => !notification.readAt && readMutation.mutate({ id: notification.id })}><span className={`notification-type type-${notification.type}`} /><div><strong>{notification.title}</strong><span>{notification.body}</span></div><small>{notification.readAt ? "Read" : "New"}</small></button>) : <div className="empty-state"><Bell size={18} /><strong>No notifications yet</strong><span>New signals and approvals will appear here.</span></div>}</div>
              </>}
              {!profileLoading && !profileError && tab === "cash" && <>
                <div className="account-section-heading"><div><span className="eyebrow">CASH REPORTING</span><h3>Operational cash movement</h3><p>Track project inflows and outflows; amounts are stored as integer cents.</p></div></div>
                <div className="cash-summary"><div><span>Inflow</span><strong className="cash-positive">{formatMoney(cashSummary.inflowCents)}</strong></div><div><span>Outflow</span><strong className="cash-negative">{formatMoney(cashSummary.outflowCents)}</strong></div><div><span>Net</span><strong>{formatMoney(cashSummary.netCents)}</strong></div></div>
                <form className="cash-form" onSubmit={handleCashSubmit}><Input value={cashForm.project} onChange={(event) => setCashForm({ ...cashForm, project: event.target.value })} placeholder="Project" aria-label="Cash project" /><select value={cashForm.direction} onChange={(event) => setCashForm({ ...cashForm, direction: event.target.value as "inflow" | "outflow" })} aria-label="Cash direction"><option value="outflow">Outflow</option><option value="inflow">Inflow</option></select><Input type="number" min="0.01" step="0.01" value={cashForm.amount} onChange={(event) => setCashForm({ ...cashForm, amount: event.target.value })} placeholder="Amount" aria-label="Cash amount" /><Input value={cashForm.description} onChange={(event) => setCashForm({ ...cashForm, description: event.target.value })} placeholder="Description" aria-label="Cash description" /><button className="primary-button" disabled={cashMutation.isPending}>{cashMutation.isPending ? "Saving…" : "Add entry"}</button></form>
                <div className="cash-list">{hasNoData ? <div className="empty-state"><Wallet size={18} /><strong>No cash entries yet</strong><span>Add the first project inflow or outflow above.</span></div> : cashSummary.entries.map((entry) => <div className="cash-row" key={entry.id}><div><strong>{entry.project}</strong><span>{entry.description}</span></div><b className={entry.direction === "inflow" ? "cash-positive" : "cash-negative"}>{entry.direction === "inflow" ? "+" : "−"}{formatMoney(entry.amountCents)}</b></div>)}</div>
              </>}
              {!profileLoading && !profileError && tab === "billing" && <>
                <div className="account-section-heading"><div><span className="eyebrow">BILLING & PLAN</span><h3>Scale your operations</h3><p>Stripe Checkout keeps card data out of Resource Pulse.</p></div></div>
                <div className="plan-card"><div><span className="panel-kicker">RESOURCE PULSE PRO</span><h4>Team forecasting and approvals</h4><p>Unlock expanded history, more workspaces, and priority integrations.</p></div><span className="plan-status">{billingQuery.data?.stripeSubscriptionId ? "Active" : "Available"}</span></div>
                <div className="billing-actions"><button className="primary-button" disabled={checkoutMutation.isPending || !billingQuery.data?.configured} onClick={() => checkoutMutation.mutate()}>{checkoutMutation.isPending ? "Opening checkout…" : billingQuery.data?.configured ? "Start secure checkout" : "Payment setup required"}</button><span>{billingQuery.data?.configured ? "You will be redirected to Stripe in a new tab." : "Configure Stripe price and secret keys in Settings → Payment to enable checkout."}</span></div>
              </>}
              {!profileLoading && !profileError && tab === "beta" && <>
                <div className="account-section-heading"><div><span className="eyebrow">BETA PROGRAM</span><h3>Help us make decisions explainable</h3><p>Share a quick rating and note after trying a workflow.</p></div><button className="secondary-button" disabled={joinBetaMutation.isPending || Boolean(betaStatusQuery.data)} onClick={() => joinBetaMutation.mutate()}>{betaStatusQuery.data ? `Beta ${betaStatusQuery.data.status}` : joinBetaMutation.isPending ? "Joining…" : "Join beta"}</button></div>
                <div className="beta-form"><label className="field-label">Product area<select value={betaForm.productArea} onChange={(event) => setBetaForm({ ...betaForm, productArea: event.target.value })}><option>Command center</option><option>Approvals</option><option>Cash reporting</option><option>Notifications</option></select></label><fieldset><legend className="field-label">Rating</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={betaForm.rating >= rating ? "rating selected" : "rating"} onClick={() => setBetaForm({ ...betaForm, rating })} aria-label={`${rating} out of 5`}>★</button>)}</div></fieldset><label className="field-label">Notes<textarea value={betaForm.notes} onChange={(event) => setBetaForm({ ...betaForm, notes: event.target.value })} placeholder="What should we improve next?" maxLength={500} /></label><button className="primary-button" disabled={betaMutation.isPending} onClick={() => betaMutation.mutate(betaForm)}>{betaMutation.isPending ? "Submitting…" : "Send beta feedback"}</button></div>
              </>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
