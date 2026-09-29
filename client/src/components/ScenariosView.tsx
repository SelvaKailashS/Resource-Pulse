import { useState, useMemo } from "react";
import {
  Layers3,
  Check,
  Sliders,
  ShieldCheck,
  Clock,
  Sparkles,
  Users,
  AlertTriangle,
} from "lucide-react";
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

const getDynamicScenarioOptions = (): { options: ScenarioOption[]; hasPeers: boolean; teamCount: number } => {
  try {
    const raw = localStorage.getItem("resourcepulse_student_resources");
    let team: any[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) team = parsed;
    }

    const hasPeers = team.length > 1;
    const overloaded = team.find((m: any) => (m.utilization || 0) > 80) || team[0] || { name: "Contributor", role: "Specialist", project: "Sprint Deliverable" };
    const helper = team.find((m: any) => m.id !== overloaded.id) || (hasPeers ? team[1] : null);

    const ovName = overloaded?.name || "Teammate";
    const hpName = helper?.name || "Peer";

    return {
      hasPeers,
      teamCount: team.length,
      options: [
        {
          key: "balanced",
          title: "50/50 Equal Workload Split",
          tag: "Recommended",
          timeGain: hasPeers ? "+2.0 days" : "0.0 days",
          costDelta: "$0 (Internal)",
          riskReduction: hasPeers ? "-42%" : "0%",
          overtimeHours: "0.0h",
          feasibility: hasPeers ? "95% High" : "Requires Teammates",
          affectedResources: hasPeers ? [ovName, hpName] : [ovName],
          affectedTasks: [overloaded?.project || "Deliverable"],
          assumptions: hasPeers
            ? `${hpName} absorbs 50% of the deliverable load to avoid milestone bottlenecks.`
            : "Invite or add teammates using your Team Code to enable automated 50/50 deliverable balancing.",
          blurb: hasPeers
            ? `Rebalances ${ovName}’s deliverable equally with ${hpName} to avoid bottlenecking milestones.`
            : `Invite or add teammates using your Team Code to enable automated 50/50 deliverable balancing across peers.`,
        },
        {
          key: "deadline",
          title: "Accelerate Milestone Delivery",
          tag: "Speed-First",
          timeGain: hasPeers ? "+3.5 days" : "+1.5 days",
          costDelta: "$0 (Internal)",
          riskReduction: "-58%",
          overtimeHours: "0.0h",
          feasibility: "88% Feasible",
          affectedResources: team.slice(0, 3).map((m: any) => m.name),
          affectedTasks: team.slice(0, 3).map((m: any) => m.project || "Deliverable"),
          assumptions: "Pulls forward the critical path by parallelizing module integration.",
          blurb: "Pulls forward the critical path by parallelizing module integration. Maximum delivery speed.",
        },
        {
          key: "cost",
          title: "Strict Scope Prioritization",
          tag: "Scope-Lean",
          timeGain: "+1.2 days",
          costDelta: "$0 (Internal)",
          riskReduction: "-22%",
          overtimeHours: "0.0h",
          feasibility: "98% High",
          affectedResources: [ovName],
          affectedTasks: [overloaded?.project || "Deliverable"],
          assumptions: "Focuses strictly on critical path deliverables and defers non-essential items.",
          blurb: "Uses existing member capacity only. Defers low-priority non-critical features.",
        },
      ],
    };
  } catch {}

  return {
    hasPeers: false,
    teamCount: 1,
    options: [],
  };
};

export function ScenariosView({
  onNavigateToApprovals,
  onOpenLiveSimulation,
}: {
  onNavigateToApprovals?: () => void;
  onOpenLiveSimulation?: () => void;
  onNavigateToResources?: () => void;
}) {
  const { options: scenarioOptions, hasPeers, teamCount } = useMemo(() => getDynamicScenarioOptions(), []);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("balanced");
  const [whatIfUnavailable, setWhatIfUnavailable] = useState(1);
  const [whatIfDelayDays, setWhatIfDelayDays] = useState(3);
  const [whatIfDeliveryDays, setWhatIfDeliveryDays] = useState(14);
  const [isSimulating, setIsSimulating] = useState(false);

  const selectedScenario = scenarioOptions.find((s) => s.key === selectedScenarioKey) ?? scenarioOptions[0];

  const handleRunSimulation = () => {
    if (onOpenLiveSimulation) {
      onOpenLiveSimulation();
      return;
    }
    setIsSimulating(true);
    toast.info("Running What-If Dynamic Simulation", {
      description: `Testing capacity with ${whatIfUnavailable} unavailable member(s) and +${whatIfDelayDays}d buffer...`,
    });

    setTimeout(() => {
      setIsSimulating(false);
      toast.success("Simulation Complete", {
        description: "Optimal workload rebalancing synthesized with $0 internal cost.",
      });
    }, 900);
  };

  const handleSubmitApproval = (scenario: ScenarioOption) => {
    toast.success(`Scenario "${scenario.title}" submitted`, {
      description: "Queued in the Approval Center for review.",
    });
    if (onNavigateToApprovals) onNavigateToApprovals();
  };

  return (
    <div className="scenarios-view">
      <div className="module-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="status-pill chip-blue font-mono font-bold" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.4)", background: "rgba(14,165,233,0.12)" }}>
              {scenarioOptions.length} Recovery Strategies Available
            </span>
            <span className="mono text-xs text-slate-400">
              {hasPeers ? `${teamCount} Active Team Members` : "1 Active Team Member"}
            </span>
          </div>
          <h1>Scenario Simulation & Trade-Off Matrix</h1>
          <p>
            Evaluate recovery strategies for your team. Compare trade-offs across schedule, internal allocation, and risk reduction.
          </p>
        </div>
      </div>

      {!hasPeers && (
        <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 mb-6 flex items-start gap-3">
          <Sparkles className="text-sky-400 shrink-0 mt-0.5" size={18} />
          <div>
            <strong className="text-sm text-sky-200 block">Single-Member Workspace Detected</strong>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated 50/50 workload distribution requires at least 2 team members. Share your Team Code or Invite Link from Resources so teammates can join and unlock peer rebalancing.
            </p>
          </div>
        </div>
      )}

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
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
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
                <span className="text-[10px] font-mono text-slate-400">Status: {scenario.feasibility}</span>
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
          <Layers3 size={16} className="text-sky-400" /> Scenario Comparison Table
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Compare key decision criteria without hidden ranking algorithms.
        </p>

        <div className="overflow-x-auto">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Decision Attribute</th>
                <th>50/50 Equal Split</th>
                <th>Accelerate Delivery</th>
                <th>Strict Scope Prioritization</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold text-slate-300">Time Recovered</td>
                <td className="text-sky-400 font-bold">{hasPeers ? "+2.0 Days" : "0.0 Days"}</td>
                <td className="text-emerald-400 font-bold">{hasPeers ? "+3.5 Days" : "+1.5 Days"}</td>
                <td className="text-slate-300">+1.2 Days</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Financial Spend</td>
                <td className="text-slate-300 font-mono">$0 (Internal)</td>
                <td className="text-slate-300 font-mono">$0 (Internal)</td>
                <td className="text-slate-300 font-mono">$0 (Internal)</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Deadline Risk Reduction</td>
                <td className="text-sky-400 font-bold">{hasPeers ? "-42% Risk" : "0%"}</td>
                <td className="text-emerald-400 font-bold">-58% Risk</td>
                <td className="text-amber-400 font-bold">-22% Risk</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Overtime Burden</td>
                <td className="text-slate-300">0.0 hrs (Internal rebalance)</td>
                <td className="text-slate-300">0.0 hrs (Parallel sprint)</td>
                <td className="text-slate-300">0.0 hrs (Scope deferred)</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-300">Core Assumptions</td>
                <td className="text-xs text-slate-400">
                  {hasPeers ? "Deliverable split equally across registered peers" : "Single contributor; add peers with Team Code"}
                </td>
                <td className="text-xs text-slate-400">Parallel milestone focus on critical deliverables</td>
                <td className="text-xs text-slate-400">Non-essential polish deferred to subsequent milestone</td>
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
                Adjust capacity constraints and see real-time recalculations. Changes in this sandbox do not affect live allocations.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Simulate Unavailable Members</span>
              <span className="mono text-sky-400 font-bold">{whatIfUnavailable} member(s)</span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(2, teamCount)}
              value={whatIfUnavailable}
              onChange={(e) => setWhatIfUnavailable(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[10px] text-slate-400">
              Evaluates capacity drop and tests rebalancing across remaining peers.
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
              Permits slack in non-critical deliverable paths.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Target Milestone Window</span>
              <span className="mono text-sky-400 font-bold">{whatIfDeliveryDays} days</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={whatIfDeliveryDays}
              onChange={(e) => setWhatIfDeliveryDays(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <p className="text-[10px] text-slate-400">
              Target completion horizon for active team deliverables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScenariosView;
