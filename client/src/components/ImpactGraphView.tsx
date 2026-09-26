import { useState } from "react";
import { GitBranch, AlertCircle, ArrowRight, ShieldCheck, Clock, DollarSign, Layers, ChevronRight, CheckCircle2, RefreshCw } from "lucide-react";
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

const cascadeNodes: CascadeNode[] = [
  {
    id: "NODE-1",
    stage: "1. Trigger Event",
    title: "QA Capacity Deficit (Arjun Rao PTO & Support Pod Lock)",
    type: "Root Cause",
    severity: "high",
    impactDetails: "Available testing capacity for Mobile Core drops by 60% across the next 48h.",
    timeline: "Immediate (T+0h)",
    costDelta: "$0",
    upstream: "PeopleOps availability feed",
    downstream: ["Mobile Core E2E Tests Slipped", "Regression harness stall"],
  },
  {
    id: "NODE-2",
    stage: "2. Immediate Task Delay",
    title: "Mobile Core E2E Automated Tests Slipped",
    type: "Direct Impact",
    severity: "high",
    impactDetails: "Critical test pass suite cannot run to completion. 14 blocking test cases queued.",
    timeline: "+18h delay",
    costDelta: "+$650 idle wait",
    upstream: "QA Capacity Deficit",
    downstream: ["Payment Gateway Integration blocked"],
  },
  {
    id: "NODE-3",
    stage: "3. Dependent Task Cascade",
    title: "Payment Gateway v2.4 Integration Blocked",
    type: "Dependent Block",
    severity: "high",
    impactDetails: "Requires signed test coverage report from Mobile Core before security tokens can be validated.",
    timeline: "+32h delay",
    costDelta: "+$1,400 team wait",
    upstream: "Mobile Core E2E Automated Tests",
    downstream: ["Sprint 44 Release Candidate freeze"],
  },
  {
    id: "NODE-4",
    stage: "4. Milestone Compression",
    title: "Sprint 44 Release Candidate Pushed",
    type: "Milestone Slip",
    severity: "medium",
    impactDetails: "Target freeze date compromised. Milestone slip projected at 2.4 calendar days.",
    timeline: "+2.4 days slip",
    costDelta: "+$2,800 overtime",
    upstream: "Payment Gateway Integration",
    downstream: ["Northstar Q3 Launch Event"],
  },
  {
    id: "NODE-5",
    stage: "5. Organizational Risk",
    title: "Northstar Mobile Q3 App Store Submission at Risk",
    type: "Financial/Deadline Risk",
    severity: "high",
    impactDetails: "Missed review window incurs Apple App Store expedited review fee + risk of public launch delay.",
    timeline: "+3.8 days total risk",
    costDelta: "+$4,200 estimated",
    upstream: "Sprint 44 Release Candidate",
    downstream: ["Public PR marketing campaign reschedule"],
  },
];

export function ImpactGraphView({ onNavigateToScenarios }: { onNavigateToScenarios?: () => void }) {
  const [selectedNode, setSelectedNode] = useState<CascadeNode>(cascadeNodes[0]);
  const [impactFilter, setImpactFilter] = useState<"All" | "Direct" | "Indirect">("All");

  const filteredNodes = cascadeNodes.filter((node) => {
    if (impactFilter === "Direct") return node.type === "Root Cause" || node.type === "Direct Impact";
    if (impactFilter === "Indirect") return node.type !== "Root Cause" && node.type !== "Direct Impact";
    return true;
  });

  return (
    <div className="impact-view">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="status-pill chip-coral">3 Cascading Risky Chains Active</span>
            <span className="mono text-xs text-slate-400">Forecast Confidence: 94.2%</span>
          </div>
          <h1>Cascading Impact Analysis</h1>
          <p>
            Trace how a single resource shortage propagates through dependencies into milestone and deadline slips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="secondary-button"
            onClick={() => toast.success("Graph refreshed", { description: "Recalculated downstream paths across 18 dependencies." })}
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
              <span>Propagation Path: Resource → Task → Dependent Task → Milestone → Business Risk</span>
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
            {filteredNodes.map((node, index) => {
              const isSelected = selectedNode.id === node.id;
              return (
                <div key={node.id}>
                  <div
                    className={`cascade-step-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div
                      className={`cascade-icon ${
                        node.severity === "high"
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
                        <span className="mono text-[10px] text-rose-400 font-bold">
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
            <div className="flex items-center justify-between pb-3 border-b border-sky-900/20">
              <span className="eyebrow text-sky-400">Impact Summary</span>
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
                    <Clock size={12} /> Schedule Drift
                  </div>
                  <strong className="text-sm font-mono text-rose-400 block mt-1">
                    {selectedNode.timeline}
                  </strong>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-sky-900/20">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-mono">
                    <DollarSign size={12} /> Cost Variance
                  </div>
                  <strong className="text-sm font-mono text-amber-400 block mt-1">
                    {selectedNode.costDelta}
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">Direct Upstream Cause</span>
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
                  toast.success("Recovery plan simulated", {
                    description: "Selected Arjun Rao rebalance recovered +2.4 days and resolved 4 blockers.",
                  });
                  if (onNavigateToScenarios) onNavigateToScenarios();
                }}
              >
                Simulate Cascading Recovery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImpactGraphView;
