import { useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Resource, Project, ForecastPoint } from "@shared/orgTypes";
import { loadInitialResources, loadInitialProjects, generateDynamicForecast } from "@/lib/orgStore";

export function ForecastingView() {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [horizon, setHorizon] = useState<"7d" | "30d" | "90d" | "180d" | "365d">("30d");
  const [scope, setScope] = useState<string>("all");

  const forecastResult = useMemo(() => {
    return generateDynamicForecast(resources, projects, horizon, scope);
  }, [resources, projects, horizon, scope]);

  const forecastData = forecastResult.points;

  const summary = useMemo(() => {
    if (forecastData.length === 0) return null;
    const totalAvail = forecastData.reduce((sum, p) => sum + (p.availableCapacityHours || p.forecastCapacity || 0), 0);
    const totalDemand = forecastData.reduce((sum, p) => sum + (p.demandHours || p.forecastDemand || 0), 0);
    const netGap = totalDemand - totalAvail;
    const avgConfidence = forecastResult.confidence || 90;
    return { totalAvail, totalDemand, netGap, avgConfidence };
  }, [forecastData, forecastResult]);

  if (resources.length === 0 || projects.length === 0) {
    return (
      <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto my-8">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base text-foreground">Insufficient Data for Forecast</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Forecasting requires active resource headcount and scheduled project demands. Add organizational data in Data Intake to unlock dynamic predictive modeling.
        </p>
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
              Predictive Telemetry
            </span>
            <span className="text-xs text-muted-foreground">• Demand vs Capacity Extrapolation</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Analytics & Capacity Forecasting</h2>
          <p className="text-sm text-muted-foreground">
            Dynamic timeline projections based on actual headcount velocity, milestone deliverables, and scheduled demand.
          </p>
        </div>
      </div>

      {/* Horizon Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "90d", label: "90 Days (Quarter)" },
            { id: "180d", label: "6 Months" },
            { id: "365d", label: "12 Months (Annual)" },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setHorizon(h.id as any)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                horizon === h.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Scope:</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
          >
            <option value="all">Entire Organization</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                Project: {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <p className="text-xs text-muted-foreground font-medium">Projected Available Capacity</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{summary.totalAvail}h</span>
              <span className="text-xs text-muted-foreground">in horizon</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <p className="text-xs text-muted-foreground font-medium">Projected Workload Demand</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{summary.totalDemand}h</span>
              <span className="text-xs text-muted-foreground">required</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <p className="text-xs text-muted-foreground font-medium">Net Capacity Balance</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-bold ${
                  summary.netGap > 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {summary.netGap > 0 ? `-${summary.netGap}h` : `+${Math.abs(summary.netGap)}h`}
              </span>
              <span className="text-xs text-muted-foreground">
                {summary.netGap > 0 ? "Deficit detected" : "Buffer protected"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <p className="text-xs text-muted-foreground font-medium">Forecast Confidence</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-primary">{summary.avgConfidence}%</span>
              <span className="text-xs text-muted-foreground">empirical score</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Projection Points */}
      <div className="border border-border/50 rounded-xl p-5 bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Dynamic Horizon Projection Breakdown ({forecastData.length} periods)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Derived from live velocity telemetry
          </span>
        </div>

        <div className="space-y-3">
          {forecastData.map((pt, idx) => {
            const demand = pt.demandHours ?? pt.forecastDemand ?? 0;
            const capacity = pt.availableCapacityHours ?? pt.forecastCapacity ?? 0;
            const hasDeficit = demand > capacity;
            const diff = demand - capacity;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-border/30 bg-background/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="md:w-1/4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-xs text-foreground">{pt.date}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Confidence: {pt.confidence || 90}%
                  </span>
                </div>

                <div className="md:w-1/2 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Available Capacity</span>
                    <span className="font-bold text-emerald-500">{capacity} hrs</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Demand Requirement</span>
                    <span className="font-bold text-foreground">{demand} hrs</span>
                  </div>
                </div>

                <div className="md:w-1/4 flex justify-end">
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      hasDeficit
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    }`}
                  >
                    {hasDeficit ? `Deficit: -${diff}h` : `Buffer: +${Math.abs(diff)}h`}
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
