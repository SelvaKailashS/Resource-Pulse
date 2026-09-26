import { useState } from "react";
import { Layers3, Check, Sliders, ShieldCheck, ArrowUpRight, DollarSign, Clock, AlertTriangle, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

interface ScenarioOption {
  key: string;
  title: string;
  tag: string;
  timeGain: string;
  costDelta: string;
  riskReduction: string;
  overtimeHours: string;
  feasibility: string;
  affectedResources: string[];
  affectedTasks: string[];
  assumptions: string;
  blurb: string;
}

const scenarioOptions: ScenarioOption[] = [
  {
    key: "balanced",
    title: "Balanced Recovery",
    tag: "Recommended",
    timeGain: "+2.4 days",
    costDelta: "$1,200",
    riskReduction: "-38%",
    overtimeHours: "6.5h",
    feasibility: "94% High",
    affectedResources: ["Arjun Rao", "Priya Sharma"],
    affectedTasks: ["Mobile Core E2E Tests", "Support Triage"],
    assumptions: "Support pod can absorb 10% queue deferral for 48 hours without breaching SLAs.",
    blurb: "Rebalances Arjun Rao from Support to the Release Train for 1 cycle. Preserves launch deadline with minimal cost.",
  },
  {
    key: "deadline",
    title: "Protect Deadline at All Costs",
    tag: "Aggressive",
    timeGain: "+4.1 days",
    costDelta: "$3,800",
    riskReduction: "-61%",
    overtimeHours: "24.0h",
    feasibility: "86% Feasible",
    affectedResources: ["Arjun Rao", "Contract QA Specialist", "Marcus Vance"],
    affectedTasks: ["Mobile Core E2E", "Payment Gateway v2.4", "Staging Validation"],
    assumptions: "External contractor capacity can onboard within 4 hours; overtime budget authorized.",
    blurb: "Adds external contractor capacity and pulls forward the critical path. Maximum speed with elevated cost.",
  },
  {
    key: "cost",
    title: "Minimize Budget & Overtime",
    tag: "Cost-Lean",
    timeGain: "+1.2 days",
    costDelta: "$400",
    riskReduction: "-19%",
    overtimeHours: "0.0h",
    feasibility: "98% High",
    affectedResources: ["Priya Sharma"],
    affectedTasks: ["Payment Gateway v2.4", "Analytics Reporting"],
    assumptions: "Product team accepts delaying low-priority analytics dashboard release to next sprint.",
    blurb: "Uses existing internal capacity only. Delays two non-critical tasks without adding any contractor spend.",
  },
  {
    key: "utilization",
    title: "Utilization Leveling",
    tag: "Balanced Load",
    timeGain: "+2.0 days",
    costDelta: "$950",
    riskReduction: "-30%",
    overtimeHours: "3.0h",
    feasibility: "91% Feasible",
    affectedResources: ["Marcus Vance", "Elena Rostova", "Arjun Rao"],
    affectedTasks: ["Device Farm Validation", "Design System Freeze"],
    assumptions: "UI polish sprint can be segmented to free up Marcus for deployment automation.",
    blurb: "Smooths workload spikes across the engineering organization, maintaining all individuals below 85% capacity.",
  },
];

export function ScenariosView({
  onNavigateToApprovals,
  onOpenLiveSimulation,
}: {
  onNavigateToApprovals?: () => void;
  onOpenLiveSimulation?: () => void;
}) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("balanced");
  const [whatIfUnavailable, setWhatIfUnavailable] = useState(2);
  const [whatIfDelayDays, setWhatIfDelayDays] = useState(3);
  const [whatIfBudgetCap, setWhatIfBudgetCap] = useState(3500);
  const [isSimulating, setIsSimulating] = useState(false);

  const selectedScenario = scenarioOptions.find((s) => s.key === selectedScenarioKey) ?? scenarioOptions[0];

  const handleRunSimulation = () => {
    if (onOpenLiveSimulation) {
      onOpenLiveSimulation();
      return;
    }
    setIsSimulating(true);
    toast.info("Running What-If Monte Carlo Simulation", {
      description: `Testing ${whatIfUnavailable} unavailable personnel, +${whatIfDelayDays}d buffer, and $${whatIfBudgetCap.toLocaleString()} budget ceiling...`,
    });

    setTimeout(() => {
      setIsSimulating(false);
      toast.success("Simulation Complete", {
        description: `Generated optimal recovery trade-off. Confidence score evaluated at 92.8%.`,
      });
    }, 1200);
  };

  const handleSubmitApproval = (scenario: ScenarioOption) => {
    toast.success(`Scenario "${scenario.title}" submitted`, {
      description: "Queued in the Approval Center for Lead Operations review.",
    });
    if (onNavigateToApprovals) onNavigateToApprovals();
  };

  return (
    <div className="scenarios-view">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="status-pill chip-blue">4 Feasible Strategies Generated</span>
            <span className="mono text-xs text-slate-400">Zero Unconstrained Bottlenecks</span>
          </div>
          <h1>Scenario Simulation & Trade-Off Matrix</h1>
          <p>
            Evaluate multi-dimensional recovery strategies. The system does not dictate a universal "best" plan; compare trade-offs across time, cost, and risk.
          </p>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div className="scenarios-grid-view">
        {scenarioOptions.map((scenario) => {
          const isSelected = selectedScenarioKey === scenario.key;
          return (
            <div
              key={scenario.key}
              className={`scenario-full-card cursor-pointer ${
                isSelected ? "border-sky-400/80 shadow-lg shadow-sky-500/10" : ""
              }`}
              onClick={() => setSelectedScenarioKey(scenario.key)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`scenario-badge ${
                      scenario.key === "balanced"
                        ? "bg-sky-950 text-sky-400 border border-sky-800/40"
                        : scenario.key === "deadline"
                        ? "bg-rose-950 text-rose-400 border border-rose-800/40"
                        : "bg-indigo-950 text-indigo-400 border border-indigo-800/40"
                    }`}
                  >
                    {scenario.tag}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono font-bold">
                      <Check size={14} /> Selected
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-2">{scenario.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{scenario.blurb}</p>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-900/60 border border-sky-900/20 mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400">Schedule</span>
                    <strong className="block text-sm font-bold text-sky-400 mt-0.5">{scenario.timeGain}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400">Cost</span>
                    <strong className="block text-sm font-bold text-slate-200 mt-0.5">{scenario.costDelta}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400">Risk</span>
                    <strong className="block text-sm font-bold text-emerald-400 mt-0.5">{scenario.riskReduction}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-sky-900/20 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">Feasibility: {scenario.feasibility}</span>
                <button
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitApproval(scenario);
                  }}
                >
                  Send to Approval →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Trade-off Comparison Table */}
      <div className="comparison-table-wrap">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Layers3 size={16} className="text-sky-400" /> Transparent Scenario Comparison Table
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Compare key decision criteria without hidden ranking algorithms.
        </p>

        <div className="overflow-x-auto">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Decision Attribute</th>
                <th>Balanced Recovery</th>
                <th>Protect Deadline</th>
                <th>Minimize Cost</th>
                <th>Utilization Leveling</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold text-slate-300">Time Recovered (Days)</td>
                <td className="text-sky-400 font-bold">+2.4 Days</td>
                <td className="text-emerald-400 font-bold">+4.1 Days</td>
                <td className="text-slate-300">+1.2 Days</td>
                <td className="text-slate-300">+2.0 Days</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Financial Spend / Overtime</td>
                <td className="text-slate-300 font-mono">$1,200</td>
                <td className="text-rose-400 font-mono font-bold">$3,800</td>
                <td className="text-emerald-400 font-mono font-bold">$400</td>
                <td className="text-slate-300 font-mono">$950</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Deadline Risk Reduction</td>
                <td className="text-sky-400 font-bold">-38% Risk</td>
                <td className="text-emerald-400 font-bold">-61% Risk</td>
                <td className="text-amber-400 font-bold">-19% Risk</td>
                <td className="text-sky-400 font-bold">-30% Risk</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Overtime Burden</td>
                <td className="text-slate-300">6.5 hrs total</td>
                <td className="text-rose-400 font-bold">24.0 hrs (High)</td>
                <td className="text-emerald-400 font-bold">0.0 hrs (None)</td>
                <td className="text-slate-300">3.0 hrs total</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Core Assumptions</td>
                <td className="text-xs text-slate-400">Support pod absorbs 10% queue deferral</td>
                <td className="text-xs text-slate-400">Immediate contractor onboarding</td>
                <td className="text-xs text-slate-400">Analytics task moved to Sprint 45</td>
                <td className="text-xs text-slate-400">UI polish segmented across team</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive What-If Simulator Panel */}
      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-sky-900/20">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Interactive What-If Simulation Sandbox</h3>
              <p className="text-xs text-slate-400">
                Adjust resource constraints and see real-time recalculations. Changes in this sandbox do not affect live allocations.
              </p>
            </div>
          </div>
          <button
            className="primary-button"
            disabled={isSimulating}
            onClick={handleRunSimulation}
          >
            {isSimulating ? "Recalculating..." : "Run Simulation"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Simulate Unavailable Engineers</span>
              <span className="mono text-sky-400 font-bold">{whatIfUnavailable} people</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={whatIfUnavailable}
              onChange={(e) => setWhatIfUnavailable(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[10px] text-slate-400">
              Evaluates capacity drop and tests replacement skills in reserve pools.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Buffer Days Allowed</span>
              <span className="mono text-sky-400 font-bold">+{whatIfDelayDays} days</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              value={whatIfDelayDays}
              onChange={(e) => setWhatIfDelayDays(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[10px] text-slate-400">
              Permits slack in non-critical dependency paths.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Budget Ceiling</span>
              <span className="mono text-sky-400 font-bold">${whatIfBudgetCap.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="500"
              max="8000"
              step="500"
              value={whatIfBudgetCap}
              onChange={(e) => setWhatIfBudgetCap(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[10px] text-slate-400">
              Caps contractor spend and discretionary overtime allowance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScenariosView;
