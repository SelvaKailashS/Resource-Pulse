import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  TrendingUp,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Resource, Project, ThresholdSettings } from "@shared/orgTypes";
import { loadInitialResources, loadInitialProjects, loadThresholds, computeOrgMetrics } from "@/lib/orgStore";

interface WorkloadCapacityViewProps {
  onSimulate?: () => void;
  onNavigateToDataIntake?: () => void;
}

export function WorkloadCapacityView({ onSimulate, onNavigateToDataIntake }: WorkloadCapacityViewProps) {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());
  const [selectedDept, setSelectedDept] = useState<string>("All");

  const metrics = useMemo(() => {
    return computeOrgMetrics(resources, projects, thresholds);
  }, [resources, projects, thresholds]);

  const departments = useMemo(() => {
    const set = new Set(resources.map((r) => r.department || "General"));
    return ["All", ...Array.from(set)];
  }, [resources]);

  const filteredResources = useMemo(() => {
    if (selectedDept === "All") return resources;
    return resources.filter((r) => (r.department || "General") === selectedDept);
  }, [resources, selectedDept]);

  if (resources.length === 0) {
    return (
      <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto my-8">
        <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base text-foreground">No Organizational Data Available</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Workload and capacity tracking requires active employee or team member records. Import your workforce to generate utilization metrics.
        </p>
        {onNavigateToDataIntake && (
          <button
            onClick={onNavigateToDataIntake}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Import Workforce Data
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
              Capacity Monitoring
            </span>
            <span className="text-xs text-muted-foreground">• Live Workload Distribution</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Workload & Capacity Equilibrium</h2>
          <p className="text-sm text-muted-foreground">
            Visual capacity distribution against configured safety thresholds ({thresholds.warningUtilization}% Warning, {thresholds.criticalUtilization}% Critical).
          </p>
        </div>
        {onSimulate && (
          <button
            onClick={onSimulate}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Run Rebalance Simulation
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Available Weekly Bandwidth</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{metrics.availableCapacityHours}h</span>
            <span className="text-xs text-muted-foreground">({metrics.totalResources} headcount)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Committed Project Hours</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{metrics.totalAssignedHours}h</span>
            <span className="text-xs text-emerald-500 font-medium">
              {metrics.avgUtilization}% avg load
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Overallocated Resources</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                metrics.overallocatedCount > 0 ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {metrics.overallocatedCount}
            </span>
            <span className="text-xs text-muted-foreground">
              &gt; {thresholds.criticalUtilization}% load
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Underutilized Capacity</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-500">{metrics.underutilizedCount}</span>
            <span className="text-xs text-muted-foreground">
              &lt; {thresholds.underutilizedThreshold}% load
            </span>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      {metrics.departments.length > 0 && (
        <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Department Capacity Distribution</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.departments.map((dept) => (
              <div key={dept.name} className="p-3.5 rounded-lg border border-border/30 bg-background/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{dept.name}</span>
                  <span className="font-mono text-muted-foreground">{dept.resourceCount} members</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{dept.assignedHours}h / {dept.capacityHours}h</span>
                  <span
                    className={`font-bold ${
                      dept.utilization > thresholds.criticalUtilization
                        ? "text-red-500"
                        : dept.utilization > thresholds.warningUtilization
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {dept.utilization}% load
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dept.utilization > thresholds.criticalUtilization
                        ? "bg-red-500"
                        : dept.utilization > thresholds.warningUtilization
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, dept.utilization)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Resource Workload List */}
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40">
        <div className="px-4 py-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Individual Bandwidth & Commitment ({filteredResources.length} members)
            </span>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDept(d)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  selectedDept === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/20">
          {filteredResources.map((res) => {
            const isOver = res.utilization > thresholds.criticalUtilization;
            const isWarn = res.utilization > thresholds.warningUtilization && !isOver;
            const isUnder = res.utilization < thresholds.underutilizedThreshold;

            return (
              <div key={res.id} className="p-4 hover:bg-muted/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="md:w-1/3 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{res.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {res.department}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{res.role}</p>
                  {res.currentProjects.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Projects:</span> {res.currentProjects.join(", ")}
                    </div>
                  )}
                </div>

                {/* Progress bar with threshold indicator */}
                <div className="md:w-1/2 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono">
                      {res.assignedHours}h committed / {res.weeklyCapacityHours}h max
                    </span>
                    <span
                      className={`font-bold ${
                        isOver
                          ? "text-red-500"
                          : isWarn
                          ? "text-amber-500"
                          : isUnder
                          ? "text-blue-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {res.utilization}% load
                    </span>
                  </div>

                  <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? "bg-red-500"
                          : isWarn
                          ? "bg-amber-500"
                          : isUnder
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, res.utilization)}%` }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="md:w-1/6 flex justify-end">
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      isOver
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : isWarn
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : isUnder
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    }`}
                  >
                    {isOver
                      ? "Overallocated"
                      : isWarn
                      ? "High Load"
                      : isUnder
                      ? "Underutilized"
                      : "Optimal"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
