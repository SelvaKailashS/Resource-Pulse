import React, { useState, useEffect, useMemo } from "react";
import {
  AutomationEvent,
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
  Zap,
  Mail,
  Send,
  Activity,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  Check,
  Server,
  ArrowRight,
  Play,
  Sliders,
  ChevronRight,
  FileJson,
  Trash2,
  Power,
  RotateCcw,
  Sparkles,
  Layers,
  Inbox,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const EVENT_TYPE_OPTIONS: { label: string; value: string; category: string }[] = [
  // Deadlines & Projects
  { label: "Deadline Risk (Progress < Target)", value: "deadline_risk", category: "Deadlines" },
  { label: "Deadline Approaching (<= 3 Days)", value: "deadline_approaching", category: "Deadlines" },
  { label: "Deadline Missed / Overdue", value: "deadline_missed", category: "Deadlines" },
  { label: "Project Delayed", value: "project_delayed", category: "Deadlines" },
  { label: "Task Overdue", value: "task_overdue", category: "Deadlines" },

  // Resources & Workload
  { label: "Resource Overloaded (> 100%)", value: "resource_overloaded", category: "Workload" },
  { label: "Resource Underutilized (< 30%)", value: "resource_underutilized", category: "Workload" },
  { label: "Resource Unavailable / On Leave", value: "resource_unavailable", category: "Workload" },
  { label: "Staff Absence", value: "employee_absence", category: "Workload" },
  { label: "Schedule / Double-Booking Conflict", value: "schedule_conflict", category: "Workload" },

  // Machinery & Physical Assets
  { label: "Machine / Equipment Failure", value: "machine_failure", category: "Assets" },
  { label: "Equipment Degradation", value: "equipment_failure", category: "Assets" },
  { label: "Vehicle / Fleet Issue", value: "vehicle_failure", category: "Assets" },
  { label: "Maintenance Due", value: "maintenance_due", category: "Assets" },
  { label: "Maintenance Overdue", value: "maintenance_overdue", category: "Assets" },

  // Materials & Inventory
  { label: "Inventory Low Stock", value: "inventory_low", category: "Inventory" },
  { label: "Critical Stockout Threat", value: "inventory_critical", category: "Inventory" },
  { label: "Shipment / Delivery Delayed", value: "shipment_delayed", category: "Inventory" },

  // Governance & Finance
  { label: "Budget Threshold Warning", value: "budget_threshold", category: "Finance" },
  { label: "Budget Ceiling Exceeded", value: "budget_exceeded", category: "Finance" },
  { label: "Energy / Utility Spike Anomaly", value: "energy_spike", category: "Operations" },
  { label: "AI Forecast Anomaly", value: "ai_anomaly", category: "Intelligence" },
  { label: "Security & Access Alert", value: "security_alert", category: "Governance" },
  { label: "Custom Event", value: "custom_event", category: "Custom" },
];

export function AutomationCenter() {
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "logs" | "approvals" | "test">("overview");
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Filters for logs
  const [logFilterSeverity, setLogFilterSeverity] = useState<string>("all");
  const [logFilterStatus, setLogFilterStatus] = useState<string>("all");
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
  const [builderActionWebhook, setBuilderActionWebhook] = useState(true);
  const [builderActionAlert, setBuilderActionAlert] = useState(true);
  const [builderActionAI, setBuilderActionAI] = useState(true);
  const [builderActionApproval, setBuilderActionApproval] = useState(false);
  const [builderCooldownMinutes, setBuilderCooldownMinutes] = useState(1440);
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
        toast.success(`Scan Completed: ${result.triggeredCount} automation event(s) triggered`, {
          description: `Dispatched to Make.com Webhook with duplicate protection.`,
        });
      } else {
        toast.info("Scan Completed: All deadlines & resources are nominal", {
          description: "Zero threshold violations or overdue risks detected.",
        });
      }

      await refreshAllData();
    } catch (err: any) {
      toast.error("Scanning failed", { description: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Quick test triggers
  const handleTriggerTest = async (testType: "deadline" | "machine" | "inventory") => {
    try {
      toast.loading("Sending test event to Make.com...", { id: "test-toast" });
      const res = await sendTestAutomationEvent(testType, {
        sector: sectorConfig.primarySector,
        recipientEmail: builderRecipientEmail || "ops-lead@company.com",
      });

      if (res.success) {
        toast.success(`Test ${testType.toUpperCase()} event verified!`, {
          id: "test-toast",
          description: res.message || "Dispatched to Make.com scenario.",
        });
      } else {
        toast.error("Test event failed", {
          id: "test-toast",
          description: res.error || "Could not dispatch event.",
        });
      }
      await refreshAllData();
    } catch (err: any) {
      toast.error("Test trigger error", { id: "test-toast", description: err.message });
    }
  };

  // Toggle rule
  const handleToggleRule = async (ruleId: string) => {
    try {
      const updated = await toggleAutomationRule(ruleId);
      if (updated) {
        setRules(prev => prev.map(r => (r.id === ruleId ? updated : r)));
        toast.success(`Rule "${updated.name}" is now ${updated.enabled ? "Active" : "Paused"}`);
        void refreshAllData();
      }
    } catch (err: any) {
      toast.error("Could not toggle rule", { description: err.message });
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const ok = await deleteAutomationRule(ruleId);
      if (ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        toast.success("Automation rule deleted");
        void refreshAllData();
      }
    } catch (err: any) {
      toast.error("Could not delete rule", { description: err.message });
    }
  };

  // Retry log
  const handleRetryLog = async (logId: string) => {
    try {
      toast.loading("Retrying dispatch...", { id: `retry-${logId}` });
      const updated = await retryAutomationLog(logId);
      if (updated && updated.status === "delivered") {
        toast.success("Dispatch delivered to Make.com!", { id: `retry-${logId}` });
      } else {
        toast.error(`Retry attempt failed: ${updated?.errorMessage || "Unknown error"}`, {
          id: `retry-${logId}`,
        });
      }
      await refreshAllData();
    } catch (err: any) {
      toast.error("Retry failed", { id: `retry-${logId}`, description: err.message });
    }
  };

  // Approve log
  const handleApproveLog = async (logId: string) => {
    try {
      const updated = await approveAutomationLog(logId, "Authorized Team Lead");
      if (updated) {
        toast.success("Action authorized and dispatched to Make.com!");
        await refreshAllData();
      }
    } catch (err: any) {
      toast.error("Approval error", { description: err.message });
    }
  };

  // Reject log
  const handleRejectLog = async (logId: string) => {
    try {
      const updated = await rejectAutomationLog(logId, "Authorized Team Lead", "Declined by operator");
      if (updated) {
        toast.info("Automation action rejected.");
        await refreshAllData();
      }
    } catch (err: any) {
      toast.error("Rejection error", { description: err.message });
    }
  };

  // Create new rule from builder
  const handleSaveNewRule = async () => {
    if (!builderName.trim()) {
      toast.error("Please provide a name for this automation rule");
      return;
    }

    const actions = [];
    if (builderActionWebhook) actions.push({ type: "make_webhook" as const });
    if (builderActionAlert) actions.push({ type: "dashboard_alert" as const });
    if (builderActionAI) actions.push({ type: "ai_analyze" as const });
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
      cooldownMinutes: Number(builderCooldownMinutes) || 1440,
      recipient: {
        name: builderRecipientName || "Operations Lead",
        email: builderRecipientEmail || "ops-lead@company.com",
      },
      requiresApproval: builderActionApproval,
    };

    const created = await saveAutomationRule(newRule);
    if (created) {
      toast.success(`Created automation: "${created.name}"`);
      setIsBuilderOpen(false);
      // Reset form
      setBuilderName("");
      setBuilderDescription("");
      void refreshAllData();
    } else {
      toast.error("Failed to save automation rule");
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilterSeverity !== "all" && log.severity !== logFilterSeverity) return false;
      if (logFilterStatus !== "all" && log.status !== logFilterStatus) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const matchTitle = log.title?.toLowerCase().includes(q);
        const matchRes = log.resourceName?.toLowerCase().includes(q);
        const matchEmail = log.recipientEmail?.toLowerCase().includes(q);
        if (!matchTitle && !matchRes && !matchEmail) return false;
      }
      return true;
    });
  }, [logs, logFilterSeverity, logFilterStatus, logSearchQuery]);

  const pendingApprovalLogs = useMemo(() => {
    return logs.filter(l => l.status === "pending_approval");
  }, [logs]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Zap size={12} className="animate-pulse" /> Universal Event & Make.com Engine
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Sector: {sectorConfig.primarySector}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Automation Center
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Deterministic rule validation, deduplication cooldowns, and server-side Make.com webhook dispatching.
            Triggers emails, approvals, and AI triage whenever deadlines or operational thresholds change.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Webhook Connection Indicator */}
          <div
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border ${
              stats?.webhookConfigured
                ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
                : "bg-amber-950/30 text-amber-400 border-amber-500/30"
            }`}
            title={
              stats?.webhookConfigured
                ? `Make Webhook: ${stats.webhookEndpointMasked}`
                : "Configure MAKE_WEBHOOK_URL in server .env for live external delivery"
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                stats?.webhookConfigured ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span>
              {stats?.webhookConfigured
                ? `Make: ${stats.webhookEndpointMasked}`
                : "Make: Simulated (Set in .env)"}
            </span>
          </div>

          <button
            onClick={handleScanDeadlines}
            disabled={scanning}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Scan workspace projects, resources, and assets for threshold conditions"
          >
            <RotateCcw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning Telemetry..." : "Scan Deadlines Now"}
          </button>

          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> Create Automation
          </button>
        </div>
      </div>

      {/* KPI Stats Cards (Section 20) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Rules</span>
            <Power size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.activeAutomations ?? rules.filter(r => r.enabled).length}
          </div>
          <span className="text-[10px] text-muted-foreground">Universal triggers ready</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Events Today</span>
            <Activity size={14} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.eventsToday ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Telemetry evaluations</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Emails Sent</span>
            <Mail size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.emailsSent ?? logs.filter(l => l.status === "delivered").length}
          </div>
          <span className="text-[10px] text-muted-foreground">Dispatched to Make.com</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Critical Alerts</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {stats?.criticalAlerts ?? logs.filter(l => l.severity === "critical").length}
          </div>
          <span className="text-[10px] text-muted-foreground">Urgent escalations</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pending Approvals</span>
            <Lock size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {pendingApprovalLogs.length}
          </div>
          <span className="text-[10px] text-muted-foreground">High-impact actions</span>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Failed / Retrying</span>
            <RotateCcw size={14} className="text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats?.failedAutomations ?? logs.filter(l => l.status === "failed" || l.status === "pending_retry").length}
          </div>
          <span className="text-[10px] text-muted-foreground">Queued with retries</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Activity size={14} /> Architecture & Live Flow
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "rules"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Sliders size={14} /> Automation Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <FileJson size={14} /> Event Audit Trail ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "approvals"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <ShieldCheck size={14} /> Pending Approvals ({pendingApprovalLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "test"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <Send size={14} /> Test Mode Lab
          </button>
        </div>

        <button
          onClick={refreshAllData}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-card transition-colors flex items-center gap-1.5"
          title="Refresh logs and status"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TAB 1: OVERVIEW & FLOW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Universal Architecture Flow Visual (Section 1) */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Universal Automation Architecture</h3>
                <p className="text-xs text-muted-foreground">
                  Section 1 & 8 Security Pipeline: Frontend communicates strictly via server backend. Webhook secret is never exposed.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-secondary text-foreground">
                POST /api/automation/events
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Step 1 • Intake</div>
                  <strong className="text-xs text-foreground block">Verified Telemetry</strong>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Projects, people, machinery, materials, and schedule data intake.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  Deterministic Rules
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">Step 2 • Validation</div>
                  <strong className="text-xs text-foreground block">ResourcePulse Engine</strong>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Validates schema, checks recipient email, and matches rule conditions.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  Auth & Isolation
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Step 3 • Protection</div>
                  <strong className="text-xs text-foreground block">Cooldown & Deduplication</strong>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Prevents repeated spam emails. Configurable windows (e.g. 24h for deadlines).
                  </p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  Zero Spam Guarantee
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Step 4 • Dispatch</div>
                  <strong className="text-xs text-foreground block">Make.com Webhook</strong>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Secure server-side POST with retry queue (1m, 5m, 15m) on network failures.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  Timeout Protected (8s)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/80 border border-border/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Step 5 • Delivery</div>
                  <strong className="text-xs text-foreground block">Email & Scenario Action</strong>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Make router sends branded email to manager with AI analysis & recommendations.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  Audit Log Recorded
                </div>
              </div>
            </div>
          </div>

          {/* Quick Trigger Bar */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <strong className="text-xs text-foreground block">Quick Industry Presets & Diagnostics</strong>
              <p className="text-[11px] text-muted-foreground">
                Trigger verified scenario alerts immediately to test your Make.com Webhook routing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleTriggerTest("deadline")}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-xs font-medium text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock size={13} className="text-sky-400" /> Test Project Deadline Risk (IT)
              </button>
              <button
                onClick={() => handleTriggerTest("machine")}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-xs font-medium text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle size={13} className="text-rose-400" /> Test Machine Failure (Mfg)
              </button>
              <button
                onClick={() => handleTriggerTest("inventory")}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-xs font-medium text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Inbox size={13} className="text-amber-400" /> Test Inventory Shortage (Const)
              </button>
            </div>
          </div>

          {/* Recent Dispatches Stream */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Recent Automation Dispatches
              </h3>
              <button
                onClick={() => setActiveTab("logs")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View all logs <ChevronRight size={13} />
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No automation events recorded yet. Run "Scan Deadlines Now" or trigger a test event to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-background/60 border border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          log.status === "delivered" || log.status === "approved"
                            ? "bg-emerald-400"
                            : log.status === "suppressed_cooldown"
                            ? "bg-purple-400"
                            : log.status === "pending_approval"
                            ? "bg-sky-400"
                            : "bg-rose-400"
                        }`}
                      />
                      <div>
                        <strong className="text-foreground font-medium block">{log.title}</strong>
                        <span className="text-[11px] text-muted-foreground">
                          {log.resourceName} ({log.resourceType}) • Recipient: {log.recipientEmail}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        onClick={() => setSelectedLogPayload(log)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                        title="View payload"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RULES & BUILDER */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Configured Automation Rules</h3>
              <p className="text-xs text-muted-foreground">
                Universal condition matching engine. Supports multi-sector triggers, cooldowns, and approval gates.
              </p>
            </div>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Create Automation
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
                        <Lock size={10} /> Requires Approval
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono bg-background px-2 py-0.5 rounded border border-border/50">
                      WHEN {rule.trigger.eventType}
                    </span>
                    <span className="font-mono bg-background px-2 py-0.5 rounded border border-border/50">
                      COOLDOWN: {rule.cooldownMinutes}m
                    </span>
                    <span className="text-foreground">
                      → Recipient: <strong className="font-mono text-indigo-400">{rule.recipient?.email || "ops@company.com"}</strong>
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
                    <Power size={13} /> {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-rose-950/30 text-muted-foreground hover:text-rose-400 border border-border/50 transition-colors cursor-pointer"
                    title="Delete rule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL & LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar (Section 16) */}
          <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs by resource, title, or email..."
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
                <option value="low">🔵 Low / Info</option>
              </select>

              <select
                value={logFilterStatus}
                onChange={e => setLogFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered to Make</option>
                <option value="suppressed_cooldown">Suppressed (Cooldown)</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="failed">Failed / Retrying</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Showing {filteredLogs.length} of {logs.length} events
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-background/80 text-muted-foreground border-b border-border/60 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event Type & Title</th>
                    <th className="py-3 px-4">Resource Target</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No automation logs found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <strong className="text-foreground block truncate">{log.title}</strong>
                          <span className="font-mono text-[10px] text-indigo-400">{log.eventType}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-foreground">{log.resourceName}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">
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
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
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
                              title="Suppressed by cooldown window to prevent repeated emails"
                            >
                              <ShieldCheck size={12} /> Cooldown Window
                            </span>
                          ) : log.status === "pending_approval" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-semibold">
                              <Lock size={12} /> Pending Approval
                            </span>
                          ) : log.status === "pending_retry" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                              <RotateCcw size={12} className="animate-spin" /> Retrying (Att {log.attempts})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                              <AlertCircle size={12} /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {log.status === "failed" && (
                              <button
                                onClick={() => handleRetryLog(log.id)}
                                className="px-2 py-1 rounded bg-secondary hover:bg-accent text-[11px] font-medium text-foreground transition-all flex items-center gap-1 cursor-pointer"
                                title="Retry dispatching to Make"
                              >
                                <RotateCcw size={11} /> Retry
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLogPayload(log)}
                              className="px-2 py-1 rounded bg-secondary hover:bg-accent text-[11px] font-medium text-foreground transition-all flex items-center gap-1 cursor-pointer"
                              title="Inspect full JSON payload"
                            >
                              <Eye size={11} /> Payload
                            </button>
                          </div>
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

      {/* TAB 4: PENDING APPROVALS */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Decision Governance & Approval Queue</h3>
            <p className="text-xs text-muted-foreground">
              Section 18 Safety Principle: High-impact reallocations or critical financial actions require human authorization before dispatch.
            </p>
          </div>

          {pendingApprovalLogs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/60 rounded-2xl bg-card/20 space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <strong className="text-sm text-foreground block">Approval Queue Clear</strong>
              <p className="text-xs text-muted-foreground">
                All automation events are either approved or governed by standard deterministic thresholds.
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
                          <strong>Confidence:</strong> {Math.round(log.eventPayload.ai.confidence * 100)}% •{" "}
                          <strong>Impact:</strong> {log.eventPayload.ai.impact}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveLog(log.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} /> Approve & Dispatch
                    </button>
                    <button
                      onClick={() => handleRejectLog(log.id)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all cursor-pointer"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TEST LAB (Section 25) */}
      {activeTab === "test" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Automation Test Lab</h3>
              <p className="text-xs text-muted-foreground">
                Section 25 Requirement: Send isolated test payloads explicitly marked with{" "}
                <code className="bg-background px-1.5 py-0.5 rounded text-indigo-400">testEvent: true</code> so they never corrupt production analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Clock size={16} className="text-sky-400" />
                  <span>IT / Software: Deadline Risk</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulates project at 62% progress with 3 days remaining. Verifies deadline risk warning email dispatch.
                </p>
                <button
                  onClick={() => handleTriggerTest("deadline")}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} /> Send Test Deadline Alert
                </button>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <AlertTriangle size={16} className="text-rose-400" />
                  <span>Manufacturing: Machine Failure</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulates thermal bearing failure on Assembly Cell M-204 (104°C). Verifies critical maintenance dispatch.
                </p>
                <button
                  onClick={() => handleTriggerTest("machine")}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} /> Send Test Asset Failure
                </button>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Inbox size={16} className="text-amber-400" />
                  <span>Construction / Retail: Stockout</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulates material stock level dropping below reorder threshold (2 days remaining). Verifies procurement alert.
                </p>
                <button
                  onClick={() => handleTriggerTest("inventory")}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} /> Send Test Inventory Shortage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE AUTOMATION BUILDER MODAL (Section 5) */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Zap size={18} className="text-indigo-400" /> Create Universal Automation Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure deterministic triggers, conditions, cooldowns, and Make.com notification actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Project Deadline Risk Email"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Dispatches notification when milestone is trending behind velocity"
                value={builderDescription}
                onChange={e => setBuilderDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* WHEN Trigger */}
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/10 space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                WHEN (Select Event Trigger)
              </span>
              <select
                value={builderEventType}
                onChange={e => setBuilderEventType(e.target.value as UniversalEventType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none font-medium text-foreground"
              >
                {EVENT_TYPE_OPTIONS.map(opt => (
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
                  IF Conditions
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-muted-foreground mr-1">Logic:</span>
                  <button
                    type="button"
                    onClick={() => setBuilderLogic("AND")}
                    className={`px-2 py-0.5 rounded font-mono font-bold ${
                      builderLogic === "AND" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderLogic("OR")}
                    className={`px-2 py-0.5 rounded font-mono font-bold ${
                      builderLogic === "OR" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>

              {builderConditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Field (e.g. severity or data.daysRemaining)"
                    value={cond.field}
                    onChange={e => {
                      const updated = [...builderConditions];
                      updated[idx].field = e.target.value;
                      setBuilderConditions(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none font-mono"
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
                    <option value="greater_than_or_equal">&gt;=</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value (e.g. high or 3)"
                    value={cond.value}
                    onChange={e => {
                      const updated = [...builderConditions];
                      updated[idx].value = e.target.value;
                      setBuilderConditions(updated);
                    }}
                    className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                  {builderConditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBuilderConditions(builderConditions.filter((_, i) => i !== idx))}
                      className="p-1.5 text-muted-foreground hover:text-rose-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setBuilderConditions([
                    ...builderConditions,
                    { field: "data.progress", operator: "less_than", value: "80" },
                  ])
                }
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Condition
              </button>
            </div>

            {/* THEN Actions */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                THEN (Execute Actions)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderActionWebhook}
                    onChange={e => setBuilderActionWebhook(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Send Make.com Webhook (Email)</span>
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
                    checked={builderActionAI}
                    onChange={e => setBuilderActionAI(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Ask AI for Root Cause & Action</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderActionApproval}
                    onChange={e => setBuilderActionApproval(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span>Request Manager Approval</span>
                </label>
              </div>
            </div>

            {/* Recipient & Cooldown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={builderRecipientEmail}
                  onChange={e => setBuilderRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  placeholder="manager@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Cooldown Window (Minutes)
                </label>
                <input
                  type="number"
                  value={builderCooldownMinutes}
                  onChange={e => setBuilderCooldownMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  placeholder="1440 (24h)"
                />
              </div>
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
                Save Automation Rule
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW EVENT PAYLOAD MODAL */}
      <Dialog open={Boolean(selectedLogPayload)} onOpenChange={open => !open && setSelectedLogPayload(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileJson size={18} className="text-indigo-400" /> Event Payload & Telemetry Detail
            </DialogTitle>
            <DialogDescription className="text-xs">
              Raw payload structure dispatched to the Make.com webhook.
            </DialogDescription>
          </DialogHeader>

          {selectedLogPayload && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Visual Breakdown */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-foreground">{selectedLogPayload.title}</strong>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground uppercase">
                    {selectedLogPayload.severity}
                  </span>
                </div>
                <p className="text-muted-foreground">{selectedLogPayload.eventPayload.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <strong>Resource:</strong> {selectedLogPayload.resourceName} ({selectedLogPayload.resourceType})
                  </div>
                  <div>
                    <strong>Recipient:</strong> {selectedLogPayload.recipientEmail}
                  </div>
                  <div>
                    <strong>Sector:</strong> {selectedLogPayload.sector}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {selectedLogPayload.timestamp}
                  </div>
                </div>
              </div>

              {/* AI Analysis Breakdown if present */}
              {selectedLogPayload.eventPayload.ai && (
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Sparkles size={14} /> AI Decision & Impact Breakdown
                  </div>
                  <p className="text-foreground">
                    <strong>Analysis:</strong> {selectedLogPayload.eventPayload.ai.analysis}
                  </p>
                  <p className="text-indigo-200">
                    <strong>Recommendation:</strong> {selectedLogPayload.eventPayload.ai.recommendation}
                  </p>
                  {selectedLogPayload.eventPayload.ai.impact && (
                    <p className="text-muted-foreground text-[11px]">
                      <strong>Impact:</strong> {selectedLogPayload.eventPayload.ai.impact}
                    </p>
                  )}
                </div>
              )}

              {/* Raw JSON viewer */}
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Complete JSON Event Payload
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto border border-border/40 max-h-60">
                  {JSON.stringify(selectedLogPayload.eventPayload, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Make Status: {selectedLogPayload.makeStatus || "200 (Simulated / Verified)"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLogPayload.eventPayload, null, 2));
                    toast.success("JSON copied to clipboard");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground cursor-pointer"
                >
                  Copy JSON
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
