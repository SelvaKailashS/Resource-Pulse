import { useState } from "react";
import { Check, Shield, Bell, Sparkles, UserRound, ArrowRight, ArrowLeft, Lock, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setAnalyticsConsent, track } from "@/lib/analytics";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: string | null;
  currentUserName?: string | null;
  onComplete: (data: { role: string; analyticsConsent: boolean; emailAlerts: boolean; reducedMotion: boolean }) => void;
}

export function OnboardingModal({ open, onOpenChange, currentUserRole = "admin", currentUserName = "Maya Chen", onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(currentUserName || "Maya Chen");
  const [role, setRole] = useState<"admin" | "operator" | "viewer">((currentUserRole as any) || "admin");
  const [analyticsConsent, setAnalytics] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = () => {
    setIsSubmitting(true);
    setAnalyticsConsent(analyticsConsent);
    track("onboarding_completed", { role, analyticsConsent });

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete({ role, analyticsConsent, emailAlerts, reducedMotion });
      toast.success("Workspace Onboarding Complete!", {
        description: `Configured as ${role.toUpperCase()} with privacy preferences saved.`,
      });
      onOpenChange(false);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-950 border border-sky-900/50 text-white shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono mb-1 uppercase tracking-wider">
            <Sparkles size={14} /> Step {step} of 4 · Workspace Setup
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            {step === 1 && "Welcome to Resource Pulse"}
            {step === 2 && "Choose Your Operational Role (RBAC)"}
            {step === 3 && "Privacy & Telemetry Controls"}
            {step === 4 && "Review & Launch Workspace"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {step === 1 && "Configure your personal profile and Northstar Ops workspace parameters."}
            {step === 2 && "Role permissions dictate your governance and execution capabilities."}
            {step === 3 && "Full transparency over telemetry, analytics, and alert preferences."}
            {step === 4 && "Confirm your workspace configuration before entering live operations."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-6 border border-sky-950">
          <div
            className="bg-gradient-to-r from-sky-500 to-blue-600 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step 1: Welcome & Profile */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-900/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <strong className="text-sm font-bold text-white block">Northstar Ops Engine</strong>
                <p className="text-xs text-slate-300">
                  Real-time resource rebalancing with 5-second cascading impact simulation.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Your Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya Chen"
                className="bg-slate-900 border-sky-900/50 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Organization / Pod</label>
              <Input
                defaultValue="Northstar Operations Command"
                disabled
                className="bg-slate-900/50 border-slate-800 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* Step 2: Role Selection (RBAC) */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            {[
              {
                id: "admin",
                title: "Administrator",
                desc: "Full governance, approval authority, member management, and financial reporting.",
                tags: "system.admin, approvals.write, cash.write",
              },
              {
                id: "operator",
                title: "Operations Lead / Operator",
                desc: "Run 5s simulations, allocate staff, and trigger explainable recovery plans.",
                tags: "simulation.execute, allocations.write",
              },
              {
                id: "viewer",
                title: "Executive Viewer",
                desc: "Read-only access to capacity health, dependency trees, and risk horizons.",
                tags: "dashboard.read, audit.read",
              },
            ].map((r) => (
              <div
                key={r.id}
                onClick={() => setRole(r.id as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  role === r.id
                    ? "bg-sky-950/60 border-sky-400 shadow-md shadow-sky-950"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className={role === r.id ? "text-sky-400" : "text-slate-400"} />
                    <strong className="text-sm font-semibold text-white">{r.title}</strong>
                  </div>
                  {role === r.id && <Check size={16} className="text-sky-400" />}
                </div>
                <p className="text-xs text-slate-400 pl-6">{r.desc}</p>
                <span className="mono text-[10px] text-sky-400/80 block mt-2 pl-6">{r.tags}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Privacy & Telemetry */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-sm font-semibold text-white block">Anonymous Product Analytics</strong>
                <p className="text-xs text-slate-400">Opt-in telemetry helps us optimize simulation latency.</p>
              </div>
              <input
                type="checkbox"
                checked={analyticsConsent}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-sm font-semibold text-white block">Operational Alert Notifications</strong>
                <p className="text-xs text-slate-400">Receive in-app pings when resource capacity drops under 80%.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-sm font-semibold text-white block">Reduced Motion</strong>
                <p className="text-xs text-slate-400">Minimize animations and transition effects for accessibility.</p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review & Launch */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/70 to-slate-900 border border-sky-400/40">
              <strong className="text-sm font-bold text-white block mb-2">Workspace Configuration Summary</strong>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">User Identity:</span>
                  <span className="font-semibold text-white">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="font-semibold text-sky-400 uppercase font-mono">{role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Analytics Consent:</span>
                  <span className="font-semibold">{analyticsConsent ? "Enabled (Opted In)" : "Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alerts:</span>
                  <span className="font-semibold">{emailAlerts ? "In-App & Signals" : "Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Persistence:</span>
                  <span className="font-semibold text-emerald-400">Supabase + LocalStorage ✓</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              You can adjust these settings anytime from your Account Center in the bottom sidebar.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              className="secondary-button text-xs flex items-center gap-1.5"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              className="primary-button text-xs flex items-center gap-1.5"
              onClick={() => setStep((s) => s + 1)}
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              className="primary-button text-xs flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500"
              onClick={handleFinish}
            >
              {isSubmitting ? "Launching..." : "Complete Setup & Launch"} <Sparkles size={14} />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
