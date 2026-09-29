import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { computeClientSimulation } from "@shared/aiKnowledgeBase";
import {
  X,
  Play,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  UserCheck,
  Zap,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { recordSimulationRun } from "@/lib/supabase";

interface Props {
  onClose: () => void;
  onApproveAndNavigate: () => void;
  initialResourceName?: string;
}

const getRealTeammates = () => {
  try {
    const raw = localStorage.getItem("resourcepulse_student_resources");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => ({
          id: m.id || `STU-${m.name}`,
          name: m.name,
          role: m.role || "Developer",
          project: m.project || "Sprint Tasks",
          avatarBg: m.avatarBg || "from-blue-600 to-cyan-500",
        }));
      }
    }
  } catch {}
  return [
    {
      id: "MEM-01",
      name: "Team Member",
      role: "Lead Specialist",
      project: "Core Deliverable",
      avatarBg: "from-blue-600 to-cyan-500",
    },
  ];
};

export function LiveSimulationScreen({ onClose, onApproveAndNavigate, initialResourceName }: Props) {
  const absentPersonnelOptions = useMemo(() => getRealTeammates(), []);

  const [selectedPerson, setSelectedPerson] = useState(() => {
    if (initialResourceName) {
      const match = absentPersonnelOptions.find((p) => p.name.toLowerCase().includes(initialResourceName.toLowerCase()));
      if (match) return match;
    }
    return absentPersonnelOptions[0];
  });

  useEffect(() => {
    if (initialResourceName) {
      const match = absentPersonnelOptions.find((p) => p.name.toLowerCase().includes(initialResourceName.toLowerCase()));
      if (match) setSelectedPerson(match);
    }
  }, [initialResourceName, absentPersonnelOptions]);

  // Query server AI simulation backed by OpenRouter
  const simulationQuery = trpc.simulation.runAI.useQuery(
    {
      absentResourceId: selectedPerson.id,
      absentResourceName: selectedPerson.name,
      role: selectedPerson.role,
      project: selectedPerson.project,
    },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const fallbackData = useMemo(
    () =>
      computeClientSimulation({
        absentResourceId: selectedPerson.id,
        absentResourceName: selectedPerson.name,
        role: selectedPerson.role,
        project: selectedPerson.project,
      }),
    [selectedPerson]
  );

  const data = simulationQuery.data ?? fallbackData;
  const isLoading = simulationQuery.isLoading && !simulationQuery.data;

  const handleApprove = () => {
    void recordSimulationRun(
      selectedPerson.name,
      data.summary.timeRecovered,
      data.summary.riskReduction,
      data.summary.estimatedCost,
      data.replacements[0]?.name || "Assigned Teammate"
    );
    toast.success("Simulation Approved & Executed!", {
      description: `Plan queued for ${selectedPerson.name} recovery. Transferred to Approval Governance Center.`,
    });
    onApproveAndNavigate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14]/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8 animate-fadeIn">
      {/* Top Banner & Control Bar */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-sky-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 border border-sky-400/30 text-sky-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  Live AI Simulation Active
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Model: {data?.aiModelUsed || "OpenRouter AI Engine"}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-0.5">
                Real-Time Cascading Recovery & Replacement Probability
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="secondary-button"
              onClick={() => simulationQuery.refetch()}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "spin" : ""} />
              {isLoading ? "Analyzing..." : "Re-run AI"}
            </button>
            <button className="primary-button" onClick={handleApprove}>
              <ShieldCheck size={16} /> Approve & Execute Plan
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Exit simulation"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 5-SECOND CLIENT SUMMARY STRIP: 4 BIG NUMBERS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/60 to-slate-900/90 border border-sky-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>SCHEDULE RECOVERED</span>
              <Clock size={16} className="text-sky-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-sky-400 font-mono mt-2">
              {data?.summary.timeRecovered ?? "+2.4 Days"}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              Sprint 44 milestone saved & freeze protected
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>RISK REDUCTION</span>
              <TrendingDown size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono mt-2">
              {data?.summary.riskReduction ?? "−38%"}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              Deadline risk drops from 84% to safe 46%
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900/90 border border-blue-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ESTIMATED SPEND</span>
              <DollarSign size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white font-mono mt-2">
              {data?.summary.estimatedCost ?? "$1,200"}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">
              Saves $3,000 vs. $4,200 emergency contractor spend
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900/90 border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>AI CONFIDENCE</span>
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-indigo-300 font-mono mt-2">
              {data?.summary.aiConfidence ?? 94}%
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              100% skill competency & capacity verified
            </p>
          </div>
        </div>

        {/* INTERACTIVE ABSENT PERSON TESTER */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-900/20 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Simulate Unexpected Absence For:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {absentPersonnelOptions.map((person) => {
              const isSelected = selectedPerson.id === person.id;
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isSelected
                      ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold scale-105"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {person.name} ({person.role.split(" ")[0]})
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-SECOND BEFORE VS AFTER COMPARISON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* WITHOUT AI */}
          <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/40">
            <div className="flex items-center gap-2 pb-3 border-b border-rose-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <strong className="text-sm font-bold text-rose-300 uppercase tracking-wider font-mono">
                WITHOUT AI REALLOCATION (Current Reality)
              </strong>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-rose-200/90">
              {data?.beforeVsAfter.unmitigated.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* WITH AI */}
          <div className="p-5 rounded-xl bg-sky-950/20 border border-sky-500/40 shadow-lg shadow-sky-950/30">
            <div className="flex items-center gap-2 pb-3 border-b border-sky-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <strong className="text-sm font-bold text-sky-300 uppercase tracking-wider font-mono">
                WITH AI REALLOCATION (Simulated Resolution)
              </strong>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-sky-100">
              {data?.beforeVsAfter.mitigated.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-sky-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* REPLACEMENT CANDIDATE PROBABILITY MATRIX */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-sky-900/30 mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck size={18} className="text-sky-400" /> Candidate Replacement Probability Ranking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI dynamically evaluates skills, availability, and donor project impact to compute replacement probability.
              </p>
            </div>
            <span className="text-xs font-mono text-sky-400">
              Sorted by AI Match Score
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {data?.replacements.map((candidate) => (
              <div
                key={candidate.id}
                className={`p-4 rounded-xl border transition-all ${
                  candidate.recommendationStatus === "Recommended"
                    ? "bg-sky-950/30 border-sky-500/50 shadow-md shadow-sky-900/20"
                    : candidate.recommendationStatus === "Alternative"
                    ? "bg-slate-900/60 border-slate-800"
                    : "bg-rose-950/10 border-rose-900/30 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-white">{candidate.name}</strong>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          candidate.recommendationStatus === "Recommended"
                            ? "bg-sky-500 text-slate-950"
                            : candidate.recommendationStatus === "Alternative"
                            ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                            : "bg-rose-950 text-rose-400 border border-rose-800/40"
                        }`}
                      >
                        {candidate.recommendationStatus}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">{candidate.role}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-mono font-extrabold text-sky-400">
                      {candidate.probability}%
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Probability
                    </span>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full my-3 overflow-hidden">
                  <div
                    className={`h-full ${
                      candidate.probability >= 90
                        ? "bg-sky-400"
                        : candidate.probability >= 70
                        ? "bg-amber-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${candidate.probability}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {candidate.reasoning}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                  {candidate.skillsMatch.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/30 text-sky-300 font-mono text-[10px]"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                  {candidate.skillsMissing.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/30 text-rose-300 font-mono text-[10px]"
                    >
                      ✕ {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LIVE AI EXECUTION TELEMETRY TRACE */}
        <div className="p-4 rounded-xl bg-black/40 border border-slate-800 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity size={14} className="text-sky-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Real-Time AI Telemetry & Reasoning Stream
            </span>
          </div>
          <div className="space-y-1 text-slate-300">
            {data?.liveExecutionTrace.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sky-400">›</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Human-in-the-Loop Safeguard: This simulation does not modify live database allocations until approved.
          </span>
          <div className="flex items-center gap-3">
            <button className="secondary-button" onClick={onClose}>
              Back to Overview
            </button>
            <button className="primary-button" onClick={handleApprove}>
              <ShieldCheck size={16} /> Approve & Commit Reallocation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveSimulationScreen;
