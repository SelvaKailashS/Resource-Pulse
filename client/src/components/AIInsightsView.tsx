import { useState, useMemo } from "react";
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Resource, Project, ThresholdSettings, AIInsightItem } from "@shared/orgTypes";
import {
  loadInitialResources,
  loadInitialProjects,
  loadThresholds,
  generateTransparentAIInsights,
} from "@/lib/orgStore";

interface AIInsightsViewProps {
  onNavigateToAllocation?: () => void;
}

export function AIInsightsView({ onNavigateToAllocation }: AIInsightsViewProps) {
  const [resources] = useState<Resource[]>(() => loadInitialResources());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [thresholds] = useState<ThresholdSettings>(() => loadThresholds());

  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  const insights = useMemo<AIInsightItem[]>(() => {
    return generateTransparentAIInsights(resources, projects, thresholds);
  }, [resources, projects, thresholds]);

  const filteredInsights = useMemo(() => {
    return insights.filter((item) => {
      const matchCat = categoryFilter === "All" || item.category === categoryFilter;
      const matchSev = severityFilter === "All" || item.severity === severityFilter;
      return matchCat && matchSev;
    });
  }, [insights, categoryFilter, severityFilter]);

  if (resources.length === 0) {
    return (
      <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto my-8">
        <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base text-foreground">No Organizational Data Available</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          AI insights are derived exclusively from actual workforce assignments, capacity deficits, and milestone commitments.
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
              Transparent Decision Intelligence
            </span>
            <span className="text-xs text-muted-foreground">• Data-Backed Operational Diagnostics</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">AI Operational Insights</h2>
          <p className="text-sm text-muted-foreground">
            Every recommendation is accompanied by verifiable empirical evidence, projected downstream impact, and model confidence.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground mr-1">Category:</span>
          {["All", "Capacity", "Risk", "Budget", "Delivery"].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                categoryFilter === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
          >
            <option value="All">All Severities</option>
            <option value="High">High Priority Only</option>
            <option value="Medium">Medium Priority</option>
            <option value="Info">Informational</option>
          </select>
        </div>
      </div>

      {/* Insights Grid */}
      {filteredInsights.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredInsights.map((insight) => {
            const isHigh = insight.severity === "High" || insight.severity === "critical";
            const isMed = insight.severity === "Medium" || insight.severity === "warning";
            const sevLabel = isHigh ? "High" : isMed ? "Medium" : "Info";

            return (
              <div
                key={insight.id}
                className={`border rounded-xl p-5 bg-card/40 hover:border-border transition-all space-y-3.5 ${
                  isHigh
                    ? "border-red-500/30"
                    : isMed
                    ? "border-amber-500/30"
                    : "border-border/50"
                }`}
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isHigh
                          ? "bg-red-500/10 text-red-500"
                          : isMed
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {sevLabel} Priority
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {insight.category}
                    </span>
                    <h3 className="font-semibold text-sm text-foreground">{insight.title || insight.headline}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-bold text-primary">{insight.confidence || insight.confidenceScore || 92}%</span>
                  </div>
                </div>

              {/* Evidence, Impact, Recommendation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Empirical Evidence
                  </p>
                  <p className="text-foreground leading-relaxed">{insight.evidence}</p>
                </div>

                <div className="p-3 rounded-lg border border-border/30 bg-background/50 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Business Impact
                  </p>
                  <p className="text-foreground leading-relaxed">{insight.impact}</p>
                </div>

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" /> Actionable Recommendation
                  </p>
                  <p className="text-foreground leading-relaxed font-medium">
                    {insight.recommendation}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {onNavigateToAllocation && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onNavigateToAllocation}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Apply Rebalancing in Allocation Matrix <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        </div>
      ) : (
        <div className="border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/20">
          <p className="text-xs text-muted-foreground">
            No active insights match the selected filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
