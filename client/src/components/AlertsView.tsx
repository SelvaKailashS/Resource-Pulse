import { useState, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Resource, Project, ThresholdSettings } from "@shared/orgTypes";
import { loadInitialResources, loadInitialProjects, loadThresholds } from "@/lib/orgStore";

interface AlertItem {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  category: "Overload" | "Underutilization" | "Project Deficit" | "Schedule Slip";
  title: string;
  description: string;
  metric: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AlertsViewProps {
  onNavigateToAllocation?: () => void;
}

export function AlertsView({ onNavigateToAllocation }: AlertsViewProps) {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = [];

    // Check resources for overload or underutilization
    resources.forEach((r) => {
      if (r.utilization > thresholds.criticalUtilization) {
        list.push({
          id: `ALT-CRIT-${r.id}`,
          severity: "Critical",
          category: "Overload",
          title: `Severe Over-Allocation: ${r.name}`,
          description: `${r.name} is operating at ${r.utilization}% load (${r.assignedHours}h assigned / ${r.weeklyCapacityHours}h max). Immediate burnout and delivery bottleneck risk.`,
          metric: `${r.utilization}% Load`,
          timestamp: "Active",
          acknowledged: acknowledgedIds.has(`ALT-CRIT-${r.id}`),
        });
      } else if (r.utilization > thresholds.warningUtilization) {
        list.push({
          id: `ALT-WARN-${r.id}`,
          severity: "Warning",
          category: "Overload",
          title: `High Capacity Threshold: ${r.name}`,
          description: `${r.name} has reached ${r.utilization}% capacity utilization. Buffer headroom is limited to ${Math.max(0, r.weeklyCapacityHours - r.assignedHours)} hours.`,
          metric: `${r.utilization}% Load`,
          timestamp: "Active",
          acknowledged: acknowledgedIds.has(`ALT-WARN-${r.id}`),
        });
      } else if (r.utilization < thresholds.underutilizedThreshold && r.status !== "On Leave") {
        list.push({
          id: `ALT-UNDER-${r.id}`,
          severity: "Info",
          category: "Underutilization",
          title: `Underutilized Bandwidth: ${r.name}`,
          description: `${r.name} is currently assigned ${r.assignedHours}h (${r.utilization}% load), with ${r.weeklyCapacityHours - r.assignedHours}h of available bandwidth.`,
          metric: `${r.utilization}% Load`,
          timestamp: "Active",
          acknowledged: acknowledgedIds.has(`ALT-UNDER-${r.id}`),
        });
      }
    });

    // Check projects for unassigned capacity gaps
    projects.forEach((p) => {
      const gap = p.requiredHours - p.assignedHours;
      if (gap > p.requiredHours * 0.4 && p.status === "In Progress") {
        list.push({
          id: `ALT-PRJ-${p.id}`,
          severity: "Warning",
          category: "Project Deficit",
          title: `Unstaffed Capacity Gap: ${p.name}`,
          description: `Initiative "${p.name}" requires ${p.requiredHours}h but only has ${p.assignedHours}h committed (${gap}h unstaffed gap).`,
          metric: `-${gap}h Gap`,
          timestamp: "Active",
          acknowledged: acknowledgedIds.has(`ALT-PRJ-${p.id}`),
        });
      }
      if (p.status === "At Risk") {
        list.push({
          id: `ALT-RISK-${p.id}`,
          severity: "Critical",
          category: "Schedule Slip",
          title: `Milestone Slippage Detected: ${p.name}`,
          description: `Deliverables for "${p.name}" are flagged as At Risk due to resource contention on critical path milestones.`,
          metric: "At Risk",
          timestamp: "Active",
          acknowledged: acknowledgedIds.has(`ALT-RISK-${p.id}`),
        });
      }
    });

    return list;
  }, [resources, projects, thresholds, acknowledgedIds]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== "All" && a.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, severityFilter]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success("Alert acknowledged");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Alerts & Exceptions
            </span>
            <span className="text-xs text-muted-foreground">• Automated Threshold Enforcement</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Operational Alerts</h2>
          <p className="text-sm text-muted-foreground">
            Real-time exceptions triggered by capacity overload, underutilization, and milestone delivery delays.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground mr-1">Filter Severity:</span>
        {["All", "Critical", "Warning", "Info"].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              severityFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.acknowledged
                  ? "bg-muted/10 border-border/30 opacity-70"
                  : alert.severity === "Critical"
                  ? "bg-red-500/5 border-red-500/30"
                  : alert.severity === "Warning"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-card/40 border-border/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    alert.severity === "Critical"
                      ? "bg-red-500/10 text-red-500"
                      : alert.severity === "Warning"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {alert.severity === "Critical" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : alert.severity === "Warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">{alert.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {alert.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        alert.severity === "Critical"
                          ? "bg-red-500/10 text-red-500"
                          : alert.severity === "Warning"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {alert.metric}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Acknowledge
                  </button>
                )}
                {onNavigateToAllocation && (
                  <button
                    onClick={onNavigateToAllocation}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                  >
                    Resolve <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-semibold text-base text-foreground">All Systems Nominal</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All active resource allocations and projects are operating within safe threshold parameters. No exceptions flagged.
          </p>
        </div>
      )}
    </div>
  );
}
