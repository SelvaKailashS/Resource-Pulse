import React, { useState, useEffect, useMemo } from "react";
import {
  AutomationRule,
  AutomationLog,
  AutomationStats,
  UniversalEventType,
  EventSeverity,
  ConditionOperator,
} from "@shared/automationTypes";
import {
  fetchAutomationLogs,
  fetchAutomationRules,
  saveAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  retryAutomationLog,
  approveAutomationLog,
  rejectAutomationLog,
  scanDeadlinesAndTelemetry,
  sendTestAutomationEvent,
  fetchAutomationStats,
} from "@/lib/automationApi";
import {
  loadInitialResources,
  loadInitialProjects,
  loadInitialAssets,
  loadInitialInventory,
  loadSectorConfig,
} from "@/lib/orgStore";
import {
  Bell,
  Mail,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Search,
  Sliders,
  ChevronRight,
  Trash2,
  Power,
  RotateCcw,
  Sparkles,
  Inbox,
  Lock,
  Check,
  X,
  Eye,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const FRIENDLY_EVENT_TYPES: { label: string; value: string; category: string }[] = [
  { label: "Project Deadline Approaching (≤ 3 Days)", value: "deadline_approaching", category: "Deadlines" },
  { label: "Project Deadline Risk (Velocity Lags)", value: "deadline_risk", category: "Deadlines" },
  { label: "Project Milestone Overdue", value: "deadline_missed", category: "Deadlines" },
  { label: "Resource Workload Overloaded (> 100%)", value: "resource_overloaded", category: "Capacity" },
  { label: "Resource Underutilized (< 30%)", value: "resource_underutilized", category: "Capacity" },
  { label: "Staff Absence or Unavailability", value: "employee_absence", category: "Capacity" },
  { label: "Schedule or Shift Conflict", value: "schedule_conflict", category: "Scheduling" },
  { label: "Equipment / Machine Breakdown", value: "machine_failure", category: "Maintenance" },
  { label: "Equipment Maintenance Due", value: "maintenance_due", category: "Maintenance" },
  { label: "Inventory Low Stock Warning", value: "inventory_low", category: "Inventory" },
  { label: "Critical Material Stockout Threat", value: "inventory_critical", category: "Inventory" },
  { label: "Budget Variance / Ceiling Warning", value: "budget_exceeded", category: "Financial" },
  { label: "Energy / Facility Spike Anomaly", value: "energy_spike", category: "Operations" },
  { label: "Custom Operational Alert", value: "custom_event", category: "Custom" },
];

export function AutomationCenter() {
  const [activeTab, setActiveTab] = useState<"alerts" | "preferences" | "rules" | "history" | "approvals">("alerts");
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Preference switches (stored in localStorage)
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_email_alerts") !== "false";
  });
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_critical_alerts") !== "false";
  });
  const [deadlineAlertsEnabled, setDeadlineAlertsEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_deadline_alerts") !== "false";
  });
  const [resourceAlertsEnabled, setResourceAlertsEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_resource_alerts") !== "false";
  });
  const [inventoryAlertsEnabled, setInventoryAlertsEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_inventory_alerts") !== "false";
  });
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(() => {
    return localStorage.getItem("rp_pref_daily_summary") === "true";
  });

  // Filters for logs
  const [logFilterSeverity, setLogFilterSeverity] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedLogPayload, setSelectedLogPayload] = useState<AutomationLog | null>(null);

  // Builder form state
  const [builderName, setBuilderName] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderEventType, setBuilderEventType] = useState<UniversalEventType>("deadline_risk");
  const [builderLogic, setBuilderLogic] = useState<"AND" | "OR">("AND");
  const [builderConditions, setBuilderConditions] = useState<
    { field: string; operator: ConditionOperator; value: string }[]
  >([{ field: "severity", operator: "equals", value: "high" }]);
  const [builderActionEmail, setBuilderActionEmail] = useState(true);
  const [builderActionAlert, setBuilderActionAlert] = useState(true);
  const [builderActionApproval, setBuilderActionApproval] = useState(false);
  const [builderRecipientName, setBuilderRecipientName] = useState("Operations Lead");
  const [builderRecipientEmail, setBuilderRecipientEmail] = useState("ops-lead@company.com");

  const sectorConfig = useMemo(() => loadSectorConfig(), []);

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [newStats, newRules, newLogs] = await Promise.all([
        fetchAutomationStats(),
        fetchAutomationRules(),
        fetchAutomationLogs(),
      ]);
      setStats(newStats);
      setRules(newRules);
      setLogs(newLogs);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAllData();
  }, []);

  const handleTogglePreference = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    toast.success("Notification preference updated");
  };

  // Run deterministic scan on workspace data
  const handleScanDeadlines = async () => {
    setScanning(true);
    try {
      const projects = loadInitialProjects();
      const resources = loadInitialResources();
      const assets = loadInitialAssets();
      const inventory = loadInitialInventory();

      const result = await scanDeadlinesAndTelemetry({
        projects,
        resources,
        assets,
        inventory,
        sector: sectorConfig.primarySector,
        recipientEmail: builderRecipientEmail || "ops-lead@company.com",
      });

      if (result.triggeredCount > 0) {
        toast.success(`Scan Completed: ${result.triggeredCount} smart alert(s) evaluated`, {
          description: "Alerts processed and notifications dispatched to responsible leads.",
        });
      } else {
        toast.info("Scan Completed: All operational signals are nominal", {
          description: "Zero milestone risks or capacity violations detected.",
        });
      }

      await refreshAllData();
    } catch (err: any) {
      toast.error("Scanning failed", { description: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Toggle rule
  const handleToggleRule = async (ruleId: string) => {
    try {
      const updated = await toggleAutomationRule(ruleId);
      if (updated) {
        setRules(prev => prev.map(r => (r.id === ruleId ? updated : r)));
        toast.success(`Smart alert "${updated.name}" is now ${updated.enabled ? "Active" : "Paused"}`);
        void refreshAllData();
      }
    } catch (err: any) {
      toast.error("Could not update rule", { description: err.message });
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const ok = await deleteAutomationRule(ruleId);
      if (ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        toast.success("Alert rule removed");
        void refreshAllData();
      }
    } catch (err: any) {
      toast.error("Could not remove rule", { description: err.message });
    }
  };

  // Approve log
  const handleApproveLog = async (logId: string) => {
    try {
      const updated = await approveAutomationLog(logId, "Authorized Team Lead");
      if (updated) {
        toast.success("Action authorized and notification dispatched!");
        await refreshAllData();
      }
    } catch (err: any) {
      toast.error("Authorization error", { description: err.message });
    }
  };

  // Reject log
  const handleRejectLog = async (logId: string) => {
    try {
      const updated = await rejectAutomationLog(logId, "Authorized Team Lead", "Declined by operator");
      if (updated) {
        toast.info("Alert action declined.");
        await refreshAllData();
      }
    } catch (err: any) {
      toast.error("Rejection error", { description: err.message });
    }
  };

  // Create new rule from builder
  const handleSaveNewRule = async () => {
    if (!builderName.trim()) {
      toast.error("Please provide a name for this alert rule");
      return;
    }

    const actions = [];
    if (builderActionEmail) actions.push({ type: "make_webhook" as const });
    if (builderActionAlert) actions.push({ type: "dashboard_alert" as const });
    if (builderActionApproval) actions.push({ type: "request_approval" as const });

    const newRule: Partial<AutomationRule> = {
      name: builderName.trim(),
      description: builderDescription.trim() || undefined,
      enabled: true,
      sector: "*",
      trigger: { eventType: builderEventType },
      conditionLogic: builderLogic,
      conditions: builderConditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      actions,
      cooldownMinutes: 1440,
      recipient: {
        name: builderRecipientName || "Operations Lead",
        email: builderRecipientEmail || "ops-lead@company.com",
      },
      requiresApproval: builderActionApproval,
    };

    const created = await saveAutomationRule(newRule);
    if (created) {
      toast.success(`Smart alert "${created.name}" created!`);
      setIsBuilderOpen(false);
      setBuilderName("");
      setBuilderDescription("");
      void refreshAllData();
    } else {
      toast.error("Failed to save alert rule");
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilterSeverity !== "all" && log.severity !== logFilterSeverity) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const matchTitle = log.title?.toLowerCase().includes(q);
        const matchRes = log.resourceName?.toLowerCase().includes(q);
        const matchEmail = log.recipientEmail?.toLowerCase().includes(q);
        if (!matchTitle && !matchRes && !matchEmail) return false;
      }
      return true;
    });
  }, [logs, logFilterSeverity, logSearchQuery]);

  const pendingApprovalLogs = useMemo(() => {
    return logs.filter(l => l.status === "pending_approval");
  }, [logs]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-full">
      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-border/80 shadow-md flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Bell size={12} className="animate-pulse" /> Automated Notification Engine
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Sector: {sectorConfig.primarySector}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Smart Alerts & Automated Notifications
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Continuous background telemetry that detects deadline slips, capacity bottlenecks, and equipment degradation,
            automatically notifying authorized leads via email and dashboard alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border bg-emerald-950/20 text-emerald-400 border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Telemetry Engine Active</span>
          </div>

          <button
            onClick={handleScanDeadlines}
            disabled={scanning}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Scan workspace deadlines and capacity"
          >
            <RotateCcw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning Telemetry..." : "Scan Deadlines Now"}
          </button>

          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> Create Smart Alert
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Alert Rules</span>
            <Power size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {rules.filter(r => r.enabled).length}
          </div>
          <span className="text-[10px] text-muted-foreground">Autonomous monitors running</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Events Monitored Today</span>
            <Bell size={14} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.eventsToday ?? logs.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Telemetry evaluations</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Notifications Dispatched</span>
            <Mail size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.emailsSent ?? logs.filter(l => l.status === "delivered").length}
          </div>
          <span className="text-[10px] text-muted-foreground">Delivered to managers</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Critical Priority</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {logs.filter(l => l.severity === "critical").length}
          </div>
          <span className="text-[10px] text-muted-foreground">High-urgency escalations</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "alerts"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Bell size={14} /> Active Smart Alerts ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "preferences"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Sliders size={14} /> Alert Preferences
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "rules"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <ShieldCheck size={14} /> Alert Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Clock size={14} /> Notification History
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "approvals"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Lock size={14} /> Action Authorizations ({pendingApprovalLogs.length})
          </button>
        </div>

        <button
          onClick={refreshAllData}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-card transition-colors flex items-center gap-1.5"
          title="Refresh alerts"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TAB 1: ACTIVE ALERTS */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center bg-card/40 max-w-xl mx-auto my-6 space-y-3">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Zero Active Bottlenecks</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All team members, ongoing projects, and assets are currently within normal capacity thresholds.
              </p>
              <button
                onClick={handleScanDeadlines}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                Scan Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
                    log.severity === "critical"
                      ? "bg-rose-950/20 border-rose-500/30"
                      : log.severity === "high"
                      ? "bg-orange-950/20 border-orange-500/30"
                      : "bg-card/60 border-border/60"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          log.severity === "critical"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : log.severity === "high"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                        }`}
                      >
                        {log.severity}
                      </span>
                      <strong className="text-sm font-semibold text-foreground">{log.title}</strong>
                    </div>

                    <p className="text-xs text-muted-foreground">{log.eventPayload.description}</p>

                    {log.eventPayload.ai?.recommendation && (
                      <div className="p-2.5 rounded-lg bg-background/60 border border-border/40 text-[11px] space-y-0.5">
                        <span className="font-semibold text-indigo-400 flex items-center gap-1">
                          <Sparkles size={11} /> Recommended Action:
                        </span>
                        <p className="text-foreground">{log.eventPayload.ai.recommendation}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span>Resource: <strong className="text-foreground">{log.resourceName}</strong></span>
                      <span>•</span>
                      <span>Recipient: <strong className="text-foreground">{log.recipientEmail}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedLogPayload(log)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye size={13} /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALERT PREFERENCES (Section 14) */}
      {activeTab === "preferences" && (
        <div className="p-6 rounded-2xl border border-border/60 bg-card/60 space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-foreground">Notification & Alert Preferences</h3>
            <p className="text-xs text-muted-foreground">
              Select which operational events automatically notify your team leads and project managers.
            </p>
          </div>

          <div className="divide-y divide-border/40 space-y-4 pt-1">
            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Email Notifications</strong>
                <span className="text-[11px] text-muted-foreground">
                  Send email notifications directly to assigned resource owners and project leads.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_email_alerts",
                    !emailAlertsEnabled,
                    setEmailAlertsEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  emailAlertsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    emailAlertsEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Critical Failure & Degradation Alerts</strong>
                <span className="text-[11px] text-muted-foreground">
                  Immediate alerts when machinery, servers, or vehicles fail or enter critical health states.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_critical_alerts",
                    !criticalAlertsEnabled,
                    setCriticalAlertsEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  criticalAlertsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    criticalAlertsEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Project Deadline Risk Warnings</strong>
                <span className="text-[11px] text-muted-foreground">
                  Alert when project progress is below 80% with 3 days or fewer remaining.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_deadline_alerts",
                    !deadlineAlertsEnabled,
                    setDeadlineAlertsEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  deadlineAlertsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    deadlineAlertsEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Resource Overload Alerts</strong>
                <span className="text-[11px] text-muted-foreground">
                  Notify managers when employee workload utilization crosses 100% capacity.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_resource_alerts",
                    !resourceAlertsEnabled,
                    setResourceAlertsEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  resourceAlertsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    resourceAlertsEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Inventory Stockout Warnings</strong>
                <span className="text-[11px] text-muted-foreground">
                  Alert procurement leads when materials drop below minimum reorder thresholds.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_inventory_alerts",
                    !inventoryAlertsEnabled,
                    setInventoryAlertsEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  inventoryAlertsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    inventoryAlertsEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <strong className="text-xs text-foreground block">Daily Operational Summary Digest</strong>
                <span className="text-[11px] text-muted-foreground">
                  Send a consolidated morning summary of team utilization, milestone progress, and risks.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePreference(
                    "rp_pref_daily_summary",
                    !dailySummaryEnabled,
                    setDailySummaryEnabled
                  )
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  dailySummaryEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 ${
                    dailySummaryEnabled ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALERT RULES */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Configured Smart Alert Rules</h3>
              <p className="text-xs text-muted-foreground">
                Automatic trigger definitions. The system monitors operations and executes notifications autonomously.
              </p>
            </div>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Create Smart Alert
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-semibold text-foreground">{rule.name}</strong>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        rule.enabled
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Paused"}
                    </span>
                    {rule.requiresApproval && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Lock size={10} /> Requires Manager Sign-off
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span className="bg-background px-2 py-0.5 rounded border border-border/50">
                      WHEN {rule.trigger.eventType.replace(/_/g, " ")}
                    </span>
                    <span>
                      → Recipient: <strong className="text-indigo-400">{rule.recipient?.email || "ops@company.com"}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      rule.enabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Power size={13} /> {rule.enabled ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-rose-950/30 text-muted-foreground hover:text-rose-400 border border-border/50 transition-colors cursor-pointer"
                    title="Remove rule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATION HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64"
                />
              </div>

              <select
                value={logFilterSeverity}
                onChange={e => setLogFilterSeverity(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Informational</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Showing {filteredLogs.length} events
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-background/80 text-muted-foreground border-b border-border/60 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Alert Title</th>
                    <th className="py-3 px-4">Target Resource</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No notification history records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <strong className="text-foreground block truncate">{log.title}</strong>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-foreground">{log.resourceName}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            [{log.resourceType}]
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              log.severity === "critical"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : log.severity === "high"
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-muted-foreground">
                          {log.recipientEmail || "ops@company.com"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status === "delivered" || log.status === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                              <CheckCircle2 size={12} /> Delivered
                            </span>
                          ) : log.status === "suppressed_cooldown" ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-semibold"
                              title="Duplicate notification suppressed to avoid spam"
                            >
                              <ShieldCheck size={12} /> Digest Protected
                            </span>
                          ) : log.status === "pending_approval" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-semibold">
                              <Lock size={12} /> Pending Sign-off
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                              <AlertCircle size={12} /> Retry Queued
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLogPayload(log)}
                            className="px-2 py-1 rounded bg-secondary hover:bg-accent text-[11px] font-medium text-foreground transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PENDING APPROVALS */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Action Authorization Queue</h3>
            <p className="text-xs text-muted-foreground">
              High-impact operational reallocations and critical financial adjustments awaiting operator approval.
            </p>
          </div>

          {pendingApprovalLogs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/60 rounded-2xl bg-card/20 space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <strong className="text-sm text-foreground block">All Actions Authorized</strong>
              <p className="text-xs text-muted-foreground">
                No high-consequence operations currently require human sign-off.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingApprovalLogs.map(log => (
                <div
                  key={log.id}
                  className="p-5 rounded-xl border border-sky-500/30 bg-sky-950/20 shadow-md flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500 text-slate-950 uppercase">
                        Requires Authorization
                      </span>
                      <strong className="text-sm text-foreground">{log.title}</strong>
                    </div>
                    <p className="text-xs text-sky-200">{log.eventPayload.description}</p>
                    {log.eventPayload.ai && (
                      <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 text-[11px] mt-2 space-y-1">
                        <div>
                          <strong>AI Recommendation:</strong> {log.eventPayload.ai.recommendation}
                        </div>
                        <div className="text-muted-foreground">
                          <strong>Confidence:</strong> {Math.round(log.eventPayload.ai.confidence * 100)}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveLog(log.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} /> Authorize & Notify
                    </button>
                    <button
                      onClick={() => handleRejectLog(log.id)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all cursor-pointer"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE SMART ALERT BUILDER MODAL */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bell size={18} className="text-indigo-400" /> Create Smart Alert
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure automatic notification rules to protect project deadlines and resource health.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Alert Name</label>
              <input
                type="text"
                placeholder="e.g. Critical Milestone Deadline Alert"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* WHEN Trigger */}
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/10 space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                WHEN (Select Event Condition)
              </span>
              <select
                value={builderEventType}
                onChange={e => setBuilderEventType(e.target.value as UniversalEventType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none font-medium text-foreground"
              >
                {FRIENDLY_EVENT_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    [{opt.category}] {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* IF Conditions */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  IF Condition
                </span>
              </div>

              {builderConditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Field (e.g. data.daysRemaining or severity)"
                    value={cond.field}
                    onChange={e => {
                      const updated = [...builderConditions];
                      updated[idx].field = e.target.value;
                      setBuilderConditions(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                  <select
                    value={cond.operator}
                    onChange={e => {
                      const updated = [...builderConditions];
                      updated[idx].operator = e.target.value as ConditionOperator;
                      setBuilderConditions(updated);
                    }}
                    className="w-32 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="less_than">less than (&lt;)</option>
                    <option value="less_than_or_equal">&lt;=</option>
                    <option value="greater_than">greater than (&gt;)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value (e.g. 3 or high)"
                    value={cond.value}
                    onChange={e => {
                      const updated = [...builderConditions];
                      updated[idx].value = e.target.value;
                      setBuilderConditions(updated);
                    }}
                    className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* THEN Actions */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                THEN (Execute Notification)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderActionEmail}
                    onChange={e => setBuilderActionEmail(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Send Email Notification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderActionAlert}
                    onChange={e => setBuilderActionAlert(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Create Dashboard Alert</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderActionApproval}
                    onChange={e => setBuilderActionApproval(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Require Manager Sign-off</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                value={builderRecipientEmail}
                onChange={e => setBuilderRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                placeholder="lead@company.com"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewRule}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md"
              >
                Save Smart Alert
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW EVENT DETAILS MODAL */}
      <Dialog open={Boolean(selectedLogPayload)} onOpenChange={open => !open && setSelectedLogPayload(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bell size={18} className="text-indigo-400" /> Alert Details & Telemetry
            </DialogTitle>
          </DialogHeader>

          {selectedLogPayload && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-foreground">{selectedLogPayload.title}</strong>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground uppercase">
                    {selectedLogPayload.severity}
                  </span>
                </div>
                <p className="text-muted-foreground">{selectedLogPayload.eventPayload.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                  <div>
                    <strong>Resource:</strong> {selectedLogPayload.resourceName} ({selectedLogPayload.resourceType})
                  </div>
                  <div>
                    <strong>Recipient:</strong> {selectedLogPayload.recipientEmail}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(selectedLogPayload.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedLogPayload.status}
                  </div>
                </div>
              </div>

              {selectedLogPayload.eventPayload.ai && (
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Sparkles size={14} /> AI Decision & Root Cause Breakdown
                  </div>
                  <p className="text-foreground">
                    <strong>Analysis:</strong> {selectedLogPayload.eventPayload.ai.analysis}
                  </p>
                  <p className="text-indigo-200">
                    <strong>Recommendation:</strong> {selectedLogPayload.eventPayload.ai.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
