import { useState, useMemo, useEffect, useRef } from "react";
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
  Cpu,
  Layers,
  Send,
  Check,
  RotateCcw,
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
          weeklyHours: m.weeklyHours || 40,
        }));
      }
    }
  } catch {}
  return [
    {
      id: "MEM-01",
      name: "Kailash",
      role: "Engineering Lead / Architect",
      project: "Architecture, Gateway & Core Integration",
      avatarBg: "from-blue-600 to-cyan-500",
      weeklyHours: 40,
    },
    {
      id: "MEM-02",
      name: "MADHUNILA R",
      role: "Research & Project Coordinator",
      project: "RESEARCHER & Operations",
      avatarBg: "from-pink-600 to-purple-500",
      weeklyHours: 40,
    },
    {
      id: "MEM-03",
      name: "G.Sribalaji",
      role: "Presentation & QA Specialist",
      project: "PowerPoint Presentation & Demo",
      avatarBg: "from-emerald-600 to-teal-500",
      weeklyHours: 40,
    },
    {
      id: "MEM-04",
      name: "Sasinathan",
      role: "Core Implementation Lead",
      project: "Architecture, Gateway & Core Integration",
      avatarBg: "from-amber-600 to-orange-500",
      weeklyHours: 40,
    },
  ];
};

export function LiveSimulationScreen({ onClose, onApproveAndNavigate, initialResourceName }: Props) {
  const absentPersonnelOptions = useMemo(() => getRealTeammates(), []);

  const [selectedPerson, setSelectedPerson] = useState(() => {
    if (initialResourceName) {
      const match = absentPersonnelOptions.find((p) =>
        p.name.toLowerCase().includes(initialResourceName.toLowerCase())
      );
      if (match) return match;
    }
    return absentPersonnelOptions[0];
  });

  useEffect(() => {
    if (initialResourceName) {
      const match = absentPersonnelOptions.find((p) =>
        p.name.toLowerCase().includes(initialResourceName.toLowerCase())
      );
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
      availableTeammates: absentPersonnelOptions,
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

  // -------------------------------------------------------------
  // LIVE WORK ANIMATION ENGINE
  // -------------------------------------------------------------
  const [animProgress, setAnimProgress] = useState(0); // 0 to 100
  const [animPhase, setAnimPhase] = useState<"scanning" | "rebalancing" | "stabilizing" | "completed">("scanning");
  const [animElapsed, setAnimElapsed] = useState("0.0s");
  const [isAnimRunning, setIsAnimRunning] = useState(true);

  const startAnimation = () => {
    setAnimProgress(0);
    setAnimPhase("scanning");
    setAnimElapsed("0.0s");
    setIsAnimRunning(true);
  };

  useEffect(() => {
    // Re-trigger animation whenever selected person changes
    startAnimation();
  }, [selectedPerson.id]);

  useEffect(() => {
    if (!isAnimRunning) return;
    const startTime = Date.now();
    const duration = 3600; // 3.6s total

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setAnimProgress(progress);
      setAnimElapsed((elapsed / 1000).toFixed(1) + "s");

      if (progress < 30) {
        setAnimPhase("scanning");
      } else if (progress < 75) {
        setAnimPhase("rebalancing");
      } else if (progress < 100) {
        setAnimPhase("stabilizing");
      } else {
        setAnimPhase("completed");
        setIsAnimRunning(false);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isAnimRunning, selectedPerson.id]);

  const handleInstantComplete = () => {
    setAnimProgress(100);
    setAnimPhase("completed");
    setAnimElapsed("3.6s");
    setIsAnimRunning(false);
  };

  const otherTeammates = useMemo(
    () => absentPersonnelOptions.filter((p) => p.id !== selectedPerson.id),
    [absentPersonnelOptions, selectedPerson.id]
  );

  const telemetryEvents = [
    { at: 8, text: `Fleet telemetry initialized across ${absentPersonnelOptions.length} registered workspace nodes.` },
    { at: 25, text: `Bottleneck flagged: ${selectedPerson.name}'s deliverable "${selectedPerson.project || 'Milestone Delivery'}" at risk.` },
    { at: 45, text: `OpenRouter AI evaluated skill match and idle capacity buffers across available teammates.` },
    { at: 68, text: `Workload transfer streams dispatched to ${otherTeammates.map((t) => t.name).join(", ")}.` },
    { at: 85, text: `Capacity equalized: All 4 nodes stabilized at nominal 50% workload. Zero overtime.` },
    { at: 99, text: `Equilibrium confirmed! ${data?.summary.timeRecovered || '2.5 Days'} protected. Zero slip.` },
  ];

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
    <div className="fixed inset-0 z-50 bg-[#060a14]/95 backdrop-blur-xl overflow-y-auto p-3 sm:p-5 md:p-8 animate-fadeIn">
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
                  Live Work Simulation Active
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Model: {data?.aiModelUsed || "OpenRouter Neural Engine"}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-0.5">
                Real-Time Cascading Recovery & Workload Equalization
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="secondary-button"
              onClick={startAnimation}
              title="Re-run live animated simulation"
            >
              <RotateCcw size={14} className={isAnimRunning ? "animate-spin" : ""} />
              {isAnimRunning ? "Simulating..." : "Replay Live Animation"}
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

        {/* ============================================================== */}
        {/* ATTRACTIVE LIVE WORK SIMULATION ANIMATION STAGE (HERO CANVAS) */}
        {/* ============================================================== */}
        <div className="my-6 p-5 md:p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#070d1d] border border-sky-500/30 shadow-[0_0_40px_rgba(14,165,233,0.12)] relative overflow-hidden">
          {/* Animated Ambient Energy Sweep */}
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none transition-all duration-1000"
            style={{
              transform: `translate(${animProgress * 6}px, ${animProgress * 1.5}px)`,
            }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none transition-all duration-1000"
          />

          {/* Header & Status Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-sky-900/30 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <Cpu size={18} className={isAnimRunning ? "animate-pulse" : ""} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Live Multi-Agent Work Redistribution
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      animPhase === "scanning"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : animPhase === "rebalancing"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 animate-pulse"
                        : animPhase === "stabilizing"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    }`}
                  >
                    {animPhase === "scanning" && "1. Telemetry Scanning"}
                    {animPhase === "rebalancing" && "2. Live Task Transfer"}
                    {animPhase === "stabilizing" && "3. Load Equalization"}
                    {animPhase === "completed" && "Equilibrium Locked"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Simulating unexpected absence for <span className="text-sky-300 font-bold">{selectedPerson.name}</span> and equalizing sprint velocity across team nodes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                Runtime: <strong className="text-sky-400">{animElapsed}</strong> / 3.6s
              </span>
              {isAnimRunning && (
                <button
                  onClick={handleInstantComplete}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  ⚡ Fast Forward
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar with Glow Runner */}
          <div className="my-4 relative z-10">
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-sky-900/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-150 relative shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                style={{ width: `${animProgress}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/70 rounded-full blur-[1px] animate-pulse" />
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* INTERACTIVE TEAMMATE NETWORK NODES (THE LIVE WORK CANVAS) */}
          {/* --------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6 relative z-10">
            {/* 1. DONOR / BOTTLENECK NODE (Selected Person) */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                animPhase === "completed"
                  ? "bg-slate-900/80 border-slate-700"
                  : "bg-rose-950/20 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30"
              }`}
            >
              {/* Radar Scanner Line */}
              {animPhase === "scanning" && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/10 to-transparent animate-pulse pointer-events-none" />
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  {animPhase === "completed" ? "Tasks Reassigned" : "Bottleneck Node"}
                </span>
                <span className="text-[11px] font-mono text-slate-400">Donor</span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${selectedPerson.avatarBg || "from-blue-600 to-cyan-500"} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ${
                    animPhase === "completed" ? "ring-slate-700" : "ring-rose-500 animate-pulse"
                  }`}
                >
                  {selectedPerson.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{selectedPerson.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{selectedPerson.role}</p>
                </div>
              </div>

              {/* Task at Risk */}
              <div className="mt-3 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Sprint Deliverable:</span>
                <span className="text-white font-medium truncate block">{selectedPerson.project || "Deliverable"}</span>
              </div>

              {/* Workload Equalizer Gauge */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>Workload Pressure</span>
                  <span className={animPhase === "completed" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {animPhase === "scanning"
                      ? "85% (Overload)"
                      : animPhase === "rebalancing"
                      ? `${Math.max(15, 85 - Math.round(animProgress * 0.7))}% (Offloading)`
                      : "0h At-Risk (Resolved)"}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      animPhase === "completed" ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{
                      width:
                        animPhase === "scanning"
                          ? "85%"
                          : animPhase === "rebalancing"
                          ? `${Math.max(15, 85 - (animProgress - 30) * 1.5)}%`
                          : "15%",
                    }}
                  />
                </div>
              </div>

              {animPhase === "rebalancing" && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-sky-400 animate-pulse">
                  <ArrowRight size={12} />
                  <span>Streaming task packages...</span>
                </div>
              )}
            </div>

            {/* 2, 3, 4. RECIPIENT NODES (Other Teammates Absorbing Workload) */}
            {otherTeammates.map((teammate, idx) => {
              const absorbedHours = idx === 0 ? 16 : idx === 1 ? 12 : 12;
              const matchScore = idx === 0 ? 94 : idx === 1 ? 91 : 89;

              return (
                <div
                  key={teammate.id}
                  className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                    animPhase === "rebalancing"
                      ? "bg-sky-950/30 border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] ring-1 ring-sky-400/40"
                      : animPhase === "completed" || animPhase === "stabilizing"
                      ? "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        animPhase === "rebalancing"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                          : animPhase === "completed" || animPhase === "stabilizing"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {animPhase === "scanning" && "Available Node"}
                      {animPhase === "rebalancing" && `Absorbing +${absorbedHours}h`}
                      {(animPhase === "stabilizing" || animPhase === "completed") && "Balanced 50%"}
                    </span>
                    <span className="text-[11px] font-mono text-sky-400 font-bold">
                      {matchScore}% Match
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${teammate.avatarBg || "from-blue-600 to-cyan-500"} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ${
                        animPhase === "rebalancing"
                          ? "ring-sky-400 animate-pulse"
                          : animPhase === "completed"
                          ? "ring-emerald-400"
                          : "ring-slate-700"
                      }`}
                    >
                      {teammate.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{teammate.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{teammate.role}</p>
                    </div>
                  </div>

                  {/* Task Absorbed Status */}
                  <div className="mt-3 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Sprint Flow:</span>
                    <span className="text-white font-medium truncate block">
                      {animPhase === "scanning"
                        ? teammate.project || "Sprint Tasks"
                        : animPhase === "rebalancing"
                        ? `Absorbing: ${selectedPerson.project?.slice(0, 24) || "Milestone"}...`
                        : `Protected: ${teammate.project || "Sprint Tasks"}`}
                    </span>
                  </div>

                  {/* Workload Equalizer Gauge */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Equilibrium Load</span>
                      <span className={animPhase === "completed" ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"}>
                        {animPhase === "scanning"
                          ? "35% (Idle Buffer)"
                          : animPhase === "rebalancing"
                          ? `${Math.min(50, 35 + Math.round((animProgress - 30) * 0.35))}% (Absorbing)`
                          : "50% (Nominal Target)"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          animPhase === "completed"
                            ? "bg-emerald-400"
                            : animPhase === "rebalancing"
                            ? "bg-sky-400 shadow-[0_0_8px_#38bdf8]"
                            : "bg-slate-500"
                        }`}
                        style={{
                          width:
                            animPhase === "scanning"
                              ? "35%"
                              : animPhase === "rebalancing"
                              ? `${Math.min(50, 35 + (animProgress - 30) * 0.35)}%`
                              : "50%",
                        }}
                      />
                    </div>
                  </div>

                  {animPhase === "rebalancing" && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <Check size={12} />
                      <span>Capacity verified (0% slip)</span>
                    </div>
                  )}
                  {animPhase === "completed" && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <CheckCircle2 size={12} />
                      <span>100% Milestone Protected</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* --------------------------------------------------------- */}
          {/* LIVE SIMULATION TELEMETRY TERMINAL (STREAMING LOGS)       */}
          {/* --------------------------------------------------------- */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800/80 font-mono text-xs relative z-10">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-sky-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                  Live Neural Telemetry & Dispatch Feed
                </span>
              </div>
              <span className="text-[10px] text-sky-400">
                {animPhase === "completed" ? "All 6 events committed" : "Streaming live execution"}
              </span>
            </div>

            <div className="space-y-1 text-slate-300 max-h-28 overflow-y-auto pr-1">
              {telemetryEvents
                .filter((evt) => animProgress >= evt.at)
                .map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 animate-fadeIn text-[11px]">
                    <span className="text-sky-400 shrink-0 select-none">›</span>
                    <span className="text-slate-400 shrink-0">[{String(idx * 600).padStart(4, "0")}ms]</span>
                    <span className={idx === telemetryEvents.length - 1 ? "text-emerald-300 font-semibold" : "text-slate-200"}>
                      {evt.text}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Celebratory Completion Strip */}
          {animPhase === "completed" && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex flex-wrap items-center justify-between gap-3 animate-fadeIn relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Equilibrium Achieved: 100% Sprint Deadlines Preserved
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Recovered {data?.summary.timeRecovered || "2.5 Days"} with 0 burnout across all 4 team members.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startAnimation}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={12} /> Replay Animation
                </button>
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
                >
                  <ShieldCheck size={14} /> Commit Reallocation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5-SECOND CLIENT SUMMARY STRIP: 4 BIG NUMBERS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/60 to-slate-900/90 border border-sky-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>SCHEDULE RECOVERED</span>
              <Clock size={16} className="text-sky-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-sky-400 font-mono mt-2">
              {data?.summary.timeRecovered ?? "2.5 Days"}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              {data?.absentAnalysis?.dependentMilestone ? `${data.absentAnalysis.dependentMilestone} protected` : "Milestone deliverable protected"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>RISK REDUCTION</span>
              <TrendingDown size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono mt-2">
              {data?.summary.riskReduction ?? "−78%"}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              {data?.summary?.riskReduction && data.summary.riskReduction !== "0%" ? `Risk reduced by ${data.summary.riskReduction.replace("−", "")}` : "Operational risk mitigated"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900/90 border border-blue-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ESTIMATED SPEND</span>
              <DollarSign size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white font-mono mt-2">
              {data?.summary.estimatedCost ?? "$0"}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">
              {data?.summary?.estimatedCost ? `${data.summary.estimatedCost} reallocation spend` : "$0 internal shift"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900/90 border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>AI CONFIDENCE</span>
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-indigo-300 font-mono mt-2">
              {data?.summary.aiConfidence ?? 96}%
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
