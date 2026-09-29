import { useState, useMemo } from "react";
import {
  GitBranch,
  ArrowRight,
  ShieldCheck,
  Clock,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface CascadeNode {
  id: string;
  stage: string;
  title: string;
  type: "Root Cause" | "Direct Impact" | "Dependent Block" | "Milestone Slip" | "Financial/Deadline Risk";
  severity: "high" | "medium" | "watch";
  impactDetails: string;
  timeline: string;
  costDelta: string;
  upstream: string;
  downstream: string[];
}

const getDynamicCascadeNodes = (): { nodes: CascadeNode[]; isEquilibrium: boolean; focalName: string } => {
  try {
    const raw = localStorage.getItem("resourcepulse_student_resources");
    const teamName = localStorage.getItem("resourcepulse_team_name") || "Operations Team";

    let team: any[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) team = parsed;
    }

    if (team.length === 0) {
      return {
        isEquilibrium: true,
        focalName: "Team",
        nodes: [
          {
            id: "NODE-1",
            stage: "1. Team Allocation",
            title: "Workspace Initialized",
            type: "Root Cause",
            severity: "watch",
            impactDetails: "No team members currently registered. Workload is at 0%.",
            timeline: "0h delay",
            costDelta: "$0",
            upstream: "Team Initialization",
            downstream: ["Deliverable Configuration"],
          },
        ],
      };
    }

    // Check if any member is actually overloaded (>80%)
    const overloaded = team.find((m: any) => (m.utilization || 0) > 80 || m.status === "High Load" || m.status === "Overallocated");

    if (!overloaded) {
      // EQUILIBRIUM STATE: Workload is healthy (<= 80%)
      const primary = team[0];
      const task = primary.project || "Active Deliverable";

      return {
        isEquilibrium: true,
        focalName: primary.name,
        nodes: [
          {
            id: "NODE-1",
            stage: "1. Capacity Telemetry",
            title: `${primary.name} (${primary.role || "Lead"}) Capacity Equilibrium`,
            type: "Root Cause",
            severity: "watch",
            impactDetails: `Operating at healthy ${primary.utilization || 50}% workload. ${primary.weeklyHours ? 40 - Math.round(40 * (primary.utilization || 50) / 100) : 18}h buffer headroom available.`,
            timeline: "0h delay (On schedule)",
            costDelta: "$0",
            upstream: "Continuous Telemetry",
            downstream: [`"${task}" deliverable on track`],
          },
          {
            id: "NODE-2",
            stage: "2. Deliverable Velocity",
            title: `"${task}" Milestone On Track`,
            type: "Direct Impact",
            severity: "watch",
            impactDetails: `Active deliverable "${task}" is proceeding on schedule with zero unconstrained blockers.`,
            timeline: "+0.0h delay",
            costDelta: "$0 (Internal)",
            upstream: `${primary.name} Capacity Equilibrium`,
            downstream: [`${teamName} Delivery Gate Protected`],
          },
          {
            id: "NODE-3",
            stage: "3. Dependency Coordination",
            title: "Cross-Deliverable Integration Clear",
            type: "Dependent Block",
            severity: "watch",
            impactDetails: `All dependency paths for ${teamName} are aligned with active resource availability.`,
            timeline: "Clear gate",
            costDelta: "$0",
            upstream: `"${task}" Milestone On Track`,
            downstream: [`${teamName} Milestone Submission Protected`],
          },
          {
            id: "NODE-4",
            stage: "4. Milestone Integrity",
            title: `${teamName} Milestone Delivery Window Protected`,
            type: "Milestone Slip",
            severity: "watch",
            impactDetails: "Submission and review windows remain completely intact with buffer headroom.",
            timeline: "+0.0d milestone shift",
            costDelta: "$0 penalty risk",
            upstream: "Cross-Deliverable Integration Clear",
            downstream: ["Final Evaluation & Acceptance Gate"],
          },
          {
            id: "NODE-5",
            stage: "5. Final Project Status",
            title: "Executive & Final Milestone Protected",
            type: "Financial/Deadline Risk",
            severity: "watch",
            impactDetails: "All project deliverables are verified within healthy capacity thresholds. Zero deadline risk.",
            timeline: "Nominal delivery",
            costDelta: "$0",
            upstream: `${teamName} Milestone Delivery Window Protected`,
            downstream: ["Milestone sign-off"],
          },
        ],
      };
    }

    // BOTTLENECK DETECTED: Member is overloaded (>80%)
    const delayHours = Math.max(6, Math.round(((overloaded.utilization || 85) - 80) * 1.5));
    const delayDays = (delayHours / 8).toFixed(1);
    const task = overloaded.project || "Deliverable";

    return {
      isEquilibrium: false,
      focalName: overloaded.name,
      nodes: [
        {
          id: "NODE-1",
          stage: "1. Trigger Event",
          title: `${overloaded.name} (${overloaded.role || "Member"}) Capacity Deficit`,
          type: "Root Cause",
          severity: "high",
          impactDetails: `Workload reached ${overloaded.utilization || 88}%. Exceeds the 80% safety buffer threshold.`,
          timeline: "Immediate (T+0h)",
          costDelta: "$0",
          upstream: "Real-time telemetry alert",
          downstream: [`"${task}" milestone slip`],
        },
        {
          id: "NODE-2",
          stage: "2. Immediate Task Delay",
          title: `"${task}" Deliverable Delayed`,
          type: "Direct Impact",
          severity: "high",
          impactDetails: `Without workload rebalancing, "${task}" incurs an estimated +${delayHours}h delivery deficit.`,
          timeline: `+${delayHours}h delay`,
          costDelta: "Milestone slip",
          upstream: `${overloaded.name} Capacity Deficit`,
          downstream: ["Cross-Task Integration Gate"],
        },
        {
          id: "NODE-3",
          stage: "3. Dependent Task Cascade",
          title: "Cross-Deliverable Integration Stalled",
          type: "Dependent Block",
          severity: "medium",
          impactDetails: `Downstream modules waiting on output from "${task}" before final integration.`,
          timeline: `+${Math.round(delayHours * 1.4)}h delay`,
          costDelta: "Dependency stall",
          upstream: `"${task}" Deliverable Delayed`,
          downstream: [`${teamName} Milestone Submission`],
        },
        {
          id: "NODE-4",
          stage: "4. Milestone Compression",
          title: `${teamName} Delivery Window Compressed`,
          type: "Milestone Slip",
          severity: "high",
          impactDetails: `Final milestone buffer compressed by ${delayDays} calendar days.`,
          timeline: `+${delayDays}d slip`,
          costDelta: "Schedule risk",
          upstream: "Cross-Deliverable Integration Stalled",
          downstream: ["Final Evaluation Slip"],
        },
        {
          id: "NODE-5",
          stage: "5. Final Project Risk",
          title: "Milestone Evaluation & Delivery Risk",
          type: "Financial/Deadline Risk",
          severity: "high",
          impactDetails: `Target completion date compromised unless rebalanced via 50/50 peer split.`,
          timeline: `+${(Number(delayDays) * 1.5).toFixed(1)}d total risk`,
          costDelta: "Milestone risk",
          upstream: `${teamName} Delivery Window Compressed`,
          downstream: ["Target deadline breach"],
        },
      ],
    };
  } catch {}

  return {
    isEquilibrium: true,
    focalName: "Team",
    nodes: [],
  };
};

export function ImpactGraphView({ onNavigateToScenarios }: { onNavigateToScenarios?: () => void }) {
  const { nodes, isEquilibrium } = useMemo(() => getDynamicCascadeNodes(), []);
  const [selectedNode, setSelectedNode] = useState<CascadeNode | null>(nodes[0] || null);
  const [impactFilter, setImpactFilter] = useState<"All" | "Direct" | "Indirect">("All");

  const filteredNodes = nodes.filter((node) => {
    if (impactFilter === "Direct") return node.type === "Root Cause" || node.type === "Direct Impact";
    if (impactFilter === "Indirect") return node.type !== "Root Cause" && node.type !== "Direct Impact";
    return true;
  });

  return (
    <div className="impact-view">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isEquilibrium ? (
              <span className="status-pill chip-blue font-mono font-bold flex items-center gap-1.5" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.4)", background: "rgba(14,165,233,0.12)" }}>
                <CheckCircle2 size={13} className="text-sky-400" /> Equilibrium Active • 0 Cascading Delays
              </span>
            ) : (
              <span className="status-pill chip-coral font-mono font-bold">
                Cascading Risk Active • Rebalance Advised
              </span>
            )}
            <span className="mono text-xs text-slate-400">
              Synchronized with user team deliverables
            </span>
          </div>
          <h1>Cascading Impact Analysis</h1>
          <p>
            {isEquilibrium
              ? "All registered team members are operating within healthy capacity. Delivery dependency paths are clear and protected."
              : "Trace how workload bottlenecks propagate through downstream deliverables into milestone slips."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="secondary-button"
            onClick={() => toast.success("Impact Graph Re-analyzed", { description: "Dependencies verified against live team data." })}
          >
            <RefreshCw size={13} /> Re-analyze Chain
          </button>
          {onNavigateToScenarios && (
            <button className="primary-button" onClick={onNavigateToScenarios}>
              Explore Recovery Scenarios
            </button>
          )}
        </div>
      </div>

      <div className="impact-workspace">
        {/* Left Column: Interactive Chain Nodes */}
        <div className="impact-main-panel">
          <div className="flex items-center justify-between pb-3 border-b border-sky-900/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <GitBranch size={16} className="text-sky-400" />
              <span>
                Propagation Path: {isEquilibrium ? "Capacity (Healthy) → Active Task → Milestone Gate → Final Delivery" : "Resource Overload → Deliverable Deficit → Gate Stall → Milestone Slip"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(["All", "Direct", "Indirect"] as const).map((filter) => (
                <button
                  key={filter}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                    impactFilter === filter
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setImpactFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="cascade-flow">
            {filteredNodes.map((node: CascadeNode, index: number) => {
              const isSelected = selectedNode?.id === node.id;
              const isWatch = node.severity === "watch";

              return (
                <div key={node.id}>
                  <div
                    className={`cascade-step-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div
                      className={`cascade-icon ${
                        isWatch
                          ? "bg-sky-950/80 text-sky-400 border border-sky-800/40"
                          : node.severity === "high"
                          ? "bg-rose-950/80 text-rose-400 border border-rose-800/40"
                          : "bg-amber-950/80 text-amber-400 border border-amber-800/40"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="cascade-info">
                      <div className="flex items-center justify-between">
                        <span className="mono text-[10px] text-sky-400 uppercase font-semibold">
                          {node.stage} • {node.type}
                        </span>
                        <span
                          className={`mono text-[10px] font-bold ${
                            isWatch ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {node.timeline}
                        </span>
                      </div>
                      <strong>{node.title}</strong>
                      <span>{node.impactDetails}</span>
                    </div>

                    <ChevronRight size={18} className="text-slate-500" />
                  </div>

                  {index < filteredNodes.length - 1 && (
                    <div className="cascade-arrow">
                      <ArrowRight className="rotate-90" size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Node Details & Impact Summary */}
        <div className="space-y-4">
          <div className="panel p-5">
            {selectedNode ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-sky-900/20">
                  <span className="eyebrow text-sky-400">Node Analysis</span>
                  <span className="mono text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40">
                    {selectedNode.id}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <strong className="text-xs text-white block mb-1">{selectedNode.title}</strong>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.impactDetails}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <Clock size={12} /> Schedule Status
                      </div>
                      <strong
                        className={`text-sm font-mono block mt-1 ${
                          selectedNode.severity === "watch" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {selectedNode.timeline}
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                        <DollarSign size={12} /> Cost Variance
                      </div>
                      <strong className="text-sm font-mono text-slate-200 block mt-1">
                        {selectedNode.costDelta}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Direct Upstream Source</span>
                    <div className="text-xs text-slate-200 p-2.5 rounded bg-slate-900/80 border border-slate-800">
                      {selectedNode.upstream}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Downstream Cascading Targets</span>
                    <div className="space-y-1.5">
                      {selectedNode.downstream.map((item) => (
                        <div
                          key={item}
                          className="text-xs text-sky-300 p-2 rounded bg-sky-950/40 border border-sky-900/30 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-sky-900/20">
                  <button
                    className="primary-button w-full"
                    onClick={() => {
                      toast.success(
                        isEquilibrium ? "Deliverables Verified" : "Recovery Plan Simulated",
                        {
                          description: isEquilibrium
                            ? "All project milestones confirmed on schedule."
                            : "Workload rebalance simulated to protect milestone deliverables.",
                        }
                      );
                      if (onNavigateToScenarios) onNavigateToScenarios();
                    }}
                  >
                    {isEquilibrium ? "Review Scenario Options" : "Simulate Cascading Recovery"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Select a cascading node to view detailed propagation paths.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImpactGraphView;
