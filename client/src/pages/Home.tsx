import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AccountCenter } from "@/components/AccountCenter";
import { ResourcesView } from "@/components/ResourcesView";
import { ImpactGraphView } from "@/components/ImpactGraphView";
import { ScenariosView } from "@/components/ScenariosView";
import { ApprovalsView } from "@/components/ApprovalsView";
import { LiveSimulationScreen } from "@/components/LiveSimulationScreen";
import { VoiceAssistantCopilot } from "@/components/VoiceAssistantCopilot";
import { OnboardingModal } from "@/components/OnboardingModal";
import { track } from "@/lib/analytics";
import { recordTaskAssignment, recordApprovalDecision } from "@/lib/supabase";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Boxes,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Command,
  Filter,
  Gauge,
  GitBranch,
  Layers3,
  LoaderCircle,
  Leaf,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type Scenario = "balanced" | "deadline" | "cost";

const navItems = [
  { label: "Command center", icon: Gauge },
  { label: "Resources", icon: Users },
  { label: "Impact graph", icon: GitBranch, badge: "3" },
  { label: "Scenarios", icon: Layers3 },
  { label: "Approvals", icon: ShieldCheck, badge: "2" },
];

const riskItems = [
  { title: "Mobile release train", detail: "QA capacity drops below threshold", level: "High", time: "in 9h", accent: "coral" },
  { title: "Northstar onboarding", detail: "Dependency chain is compressing", level: "Medium", time: "in 2d", accent: "amber" },
  { title: "Shared infra pool", detail: "Utilization trending above 82%", level: "Watch", time: "in 4d", accent: "blue" },
];

const scenarioData: Record<Scenario, { title: string; sub: string; gain: string; cost: string; risk: string; blurb: string }> = {
  balanced: { title: "Balanced recovery", sub: "Best overall outcome", gain: "+2.4 days", cost: "$1.2k", risk: "−38%", blurb: "Rebalances 4 resources while protecting the launch milestone." },
  deadline: { title: "Protect deadline", sub: "Time-first objective", gain: "+4.1 days", cost: "$3.8k", risk: "−61%", blurb: "Adds temporary capacity and pulls forward the critical path." },
  cost: { title: "Minimize cost", sub: "Efficiency-first objective", gain: "+1.2 days", cost: "$0.4k", risk: "−19%", blurb: "Uses internal capacity and delays two low-priority tasks." },
};

function Sparkline({ color = "#38bdf8", reverse = false }: { color?: string; reverse?: boolean }) {
  return (
    <svg viewBox="0 0 130 34" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={reverse ? "M0 8 C16 7 22 24 38 20 S54 13 68 21 S84 33 100 20 S117 13 130 15" : "M0 28 C18 22 23 25 38 17 S54 7 67 16 S84 20 100 9 S118 15 130 4"} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d={reverse ? "M0 8 C16 7 22 24 38 20 S54 13 68 21 S84 33 100 20 S117 13 130 15 L130 34 L0 34Z" : "M0 28 C18 22 23 25 38 17 S54 7 67 16 S84 20 100 9 S118 15 130 4 L130 34 L0 34Z"} fill={color} opacity=".1" />
    </svg>
  );
}

function StatusDot({ color = "blue" }: { color?: string }) {
  return <span className={`status-dot status-${color}`} />;
}

function Home() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const accountProfileQuery = trpc.account.profile.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000, retry: false });
  const dashboardQuery = trpc.dashboard.snapshot.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const approvalMutation = trpc.recommendations.approve.useMutation({
    onSuccess: () => {
      setApproved(true);
      void dashboardQuery.refetch();
      toast.success("Recommendation approved", { description: "The decision was recorded and queued for execution." });
    },
    onError: (error) => {
      toast.error("Approval could not be recorded", { description: error.message });
    },
  });
  const [selectedScenario, setSelectedScenario] = useState<Scenario>("balanced");
  const [simulating, setSimulating] = useState(false);
  const [isLiveSimulationOpen, setIsLiveSimulationOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [activeNav, setActiveNav] = useState("Command center");
  const [accountOpen, setAccountOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [assignedTaskNotification, setAssignedTaskNotification] = useState<{
    person: string;
    task: string;
    time: string;
  } | null>(null);

  const speakAnnouncement = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
      );
      if (naturalVoice) utterance.voice = naturalVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAssignTask = (person: string, task: string) => {
    setAssignedTaskNotification({ person, task, time: "Just now" });
    void recordTaskAssignment(person, task);
    toast.success(`Task Assigned to ${person}`, {
      description: `Allocated to ${task}. Notification sent to Admin and Team Lead for review.`,
    });
    speakAnnouncement(
      `New task assigned! ${person} has been allocated to ${task}. The recovery plan has been sent to the Admin and Team Lead for approval.`
    );
  };
  const [time, setTime] = useState("09:42:18");
  const isLoading = dashboardQuery.isLoading || dashboardQuery.isFetching;
  const dataError = Boolean(dashboardQuery.error);
  const lastUpdated = dashboardQuery.data?.fetchedAt
    ? new Date(dashboardQuery.data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const loadDashboard = async (showToast = false) => {
    const result = await dashboardQuery.refetch();
    if (result.error) {
      toast.error("Refresh failed", { description: "Your last successful snapshot is still visible." });
      return;
    }
    if (showToast) toast.success("Dashboard refreshed", { description: "All resource signals are up to date." });
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated && accountProfileQuery.data?.user && !accountProfileQuery.data.user.onboardingCompleted) setAccountOpen(true);
  }, [accountProfileQuery.data?.user, isAuthenticated]);

  const liveMetrics = dashboardQuery.data?.metrics ?? {
    resourceHealth: "87.4%", resourceHealthDelta: "+4.8%", atRiskCapacity: "12.6h", atRiskCapacityDelta: "-18.2%",
    forecastConfidence: "94.2%", forecastConfidenceDelta: "+2.1%", openDecisions: 4, urgentDecisions: 2,
  };
  const liveSignals = dashboardQuery.data?.signals ?? riskItems.map((item, index) => ({
    id: index + 1, title: item.title, detail: item.detail, severity: item.level === "High" ? "high" : item.level === "Medium" ? "medium" : "watch", horizon: item.time, status: "active", ownersNotified: 3,
  }));
  const liveScenarios = dashboardQuery.data?.scenarios ?? Object.entries(scenarioData).map(([scenarioKey, value], index) => ({
    id: index + 1, scenarioKey, title: value.title, subtitle: value.sub, timeRecovered: value.gain, estimatedCost: value.cost, riskReduction: value.risk, blurb: value.blurb, feasible: 1,
  }));
  const liveRecommendation = dashboardQuery.data?.recommendation ?? {
    id: 1, title: "Give QA a safe landing", recommendation: "Move Arjun Rao from Support pod to the release train for one test cycle. This is the highest-confidence recovery path that protects the milestone without adding external capacity.", confidence: 94, expectedOutcome: "−2.4 days", expectedOutcomeLabel: "milestone slip avoided", riskChange: "−38%", riskChangeLabel: "deadline risk reduced", status: "pending", recommendedResource: "Arjun Rao", skillMatch: "mobile QA", availability: "6.5h tomorrow", sourceProjectImpact: "low",
  };
  const liveActivity = dashboardQuery.data?.activity ?? [];
  const selected = useMemo(() => liveScenarios.find((scenario) => scenario.scenarioKey === selectedScenario) ?? liveScenarios[0], [liveScenarios, selectedScenario]);
  const metricCards = [
    { label: "Resource health", value: liveMetrics.resourceHealth, delta: liveMetrics.resourceHealthDelta, trend: "up", icon: Activity, color: "blue" },
    { label: "At-risk capacity", value: liveMetrics.atRiskCapacity, delta: liveMetrics.atRiskCapacityDelta, trend: "down", icon: CircleAlert, color: "amber" },
    { label: "Forecast confidence", value: liveMetrics.forecastConfidence, delta: liveMetrics.forecastConfidenceDelta, trend: "up", icon: Target, color: "violet" },
    { label: "Open decisions", value: String(liveMetrics.openDecisions).padStart(2, "0"), delta: `${liveMetrics.urgentDecisions} urgent`, trend: "neutral", icon: ShieldCheck, color: "coral" },
  ];

  const handleSimulation = () => {
    setIsLiveSimulationOpen(true);
    track("simulation_started", { scenario: selectedScenario });
  };

  const handleApprove = () => {
    approvalMutation.mutate({ id: liveRecommendation.id });
    void recordApprovalDecision(
      String(liveRecommendation.id),
      "Maya Chen",
      "Reallocation of " + (liveRecommendation.recommendedResource || "Arjun Rao") + " to Mobile Release Train"
    );
    speakAnnouncement("Plan approved by Maya Chen. Allocations updated and logged in the audit trail.");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-icon"><Zap size={16} strokeWidth={2.5} /></div>
          <span>resource<span className="brand-accent">pulse</span></span>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><span className="eyebrow">Workspace</span><strong>Northstar Ops</strong></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="sidebar-label">Operations</div>
        <nav className="main-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setActiveNav(item.label);
                  toast.info(`${item.label} opened`, { description: `Switched view to ${item.label}.` });
                }}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-label sidebar-label-spaced">Monitor</div>
        <nav className="main-nav">
          <button className="nav-item" onClick={() => toast("Live feed", { description: "All systems are reporting within normal latency." })}><Bell size={17} strokeWidth={1.7} /><span>Live feed</span><span className="live-ping" /></button>
          <button className="nav-item" onClick={() => toast("Integrations", { description: "12 connected sources · last sync 34s ago." })}><Boxes size={17} strokeWidth={1.7} /><span>Integrations</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-health"><span><StatusDot color="blue" /> System nominal</span><span className="mono">99.98%</span></div>
          <button className="user-row" onClick={() => setAccountOpen(true)} aria-label="Open account center"><div className="user-avatar">{user?.name?.slice(0, 2).toUpperCase() ?? "MC"}</div><div><strong>{user?.name ?? "Maya Chen"}</strong><span>{isAuthenticated ? `${user?.role ?? "user"} · Account settings` : "Demo mode · Sign in"}</span></div><MoreHorizontal size={16} className="muted-icon" /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Northstar Ops</span>
            <span className="slash">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <button className="sync-status" onClick={() => loadDashboard(true)}>
              <StatusDot color={dataError ? "coral" : "blue"} />
              <span>{isLoading ? "Syncing…" : dataError ? "Sync paused" : "Live sync"}</span>
              <span className="mono">{isLoading ? "fetching" : time}</span>
            </button>
            <button className="icon-button" aria-label="Search" onClick={() => toast("Search", { description: "Try searching for a resource, task, or scenario." })}><Search size={17} /></button>
            <button
              className="icon-button"
              aria-label="Approvals"
              onClick={() => setActiveNav("Approvals")}
            >
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
            <button
              className="command-button"
              style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(14, 165, 233, 0.1)" }}
              onClick={() => setOnboardingOpen(true)}
            >
              <Sparkles size={14} />
              <span>Tour / Onboard</span>
            </button>
            <button className="command-button" onClick={() => toast("Command palette", { description: "Keyboard shortcut: ⌘ K" })}><Command size={15} /><span>Command</span><kbd>⌘ K</kbd></button>
          </div>
        </header>

        <div className="content-wrap">
          {assignedTaskNotification && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-sky-950/80 border border-sky-400/50 shadow-xl mb-6 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                  <BellRing size={20} className="animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500 text-slate-950 uppercase">
                      New Task Assigned
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {assignedTaskNotification.time}
                    </span>
                  </div>
                  <strong className="text-sm font-bold text-white block mt-0.5">
                    {assignedTaskNotification.person} allocated to {assignedTaskNotification.task}
                  </strong>
                  <p className="text-xs text-sky-300">
                    ✓ Voice announcement broadcasted • Reallocation request sent to Admin & Team Lead for authorization.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="primary-button"
                  onClick={() => {
                    setActiveNav("Approvals");
                    speakAnnouncement(
                      "Navigating to Approvals. Reviewing pending recovery plan for " +
                        assignedTaskNotification.person
                    );
                  }}
                >
                  Review in Approvals →
                </button>
                <button
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setAssignedTaskNotification(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Conditionally render views based on activeNav */}
          {activeNav === "Resources" && (
            <ResourcesView onAssignTask={handleAssignTask} />
          )}

          {activeNav === "Impact graph" && (
            <ImpactGraphView onNavigateToScenarios={() => setActiveNav("Scenarios")} />
          )}

          {activeNav === "Scenarios" && (
            <ScenariosView
              onNavigateToApprovals={() => setActiveNav("Approvals")}
              onOpenLiveSimulation={() => setIsLiveSimulationOpen(true)}
            />
          )}

          {activeNav === "Approvals" && <ApprovalsView />}

          {activeNav === "Command center" && (
            <>
              {showNotice && (
                <div className="incident-banner">
                  <div className="incident-icon"><CircleAlert size={16} /></div>
                  <div><strong>Signal detected · Mobile release train</strong><span>QA availability changed 14m ago. Cascading impact is being evaluated across 18 dependent tasks.</span></div>
                  <button className="banner-action" onClick={() => setActiveNav("Impact graph")}>Review impact <ArrowUpRight size={14} /></button>
                  <button className="close-banner" onClick={() => setShowNotice(false)} aria-label="Dismiss alert"><X size={15} /></button>
                </div>
              )}

              {isLoading && (
                <div className="data-status-banner loading-banner" role="status" aria-live="polite">
                  <LoaderCircle size={15} className="spin" />
                  <div><strong>Updating your command center</strong><span>Pulling the latest resource availability, task progress, and forecast signals.</span></div>
                  <span className="loading-sheen" />
                </div>
              )}

              {dataError && (
                <div className="data-status-banner error-banner" role="alert">
                  <div className="data-error-icon"><CircleAlert size={15} /></div>
                  <div><strong>We couldn’t refresh the dashboard</strong><span>Your last successful snapshot is still visible. Check your connection, then try again.</span></div>
                  <button className="retry-button" onClick={() => loadDashboard(true)}><RotateCcw size={13} /> Try again</button>
                </div>
              )}

              <section className="hero-row">
                <div>
                  <div className="eyebrow hero-eyebrow"><span className="pulse-ring" /> Live Operations Telemetry</div>
                  <h1>Good morning, Maya<span className="heading-dot">.</span></h1>
                  <p className="hero-copy">Your operation is <strong>stable</strong>, but one signal needs a closer look.</p>
                </div>
                <div className="hero-actions">
                  <button className="secondary-button" onClick={() => setActiveNav("Resources")}><Filter size={15} /> Manage Resources</button>
                  <button className="primary-button" onClick={handleSimulation} disabled={simulating}><Play size={14} fill="currentColor" /> {simulating ? "Simulating..." : "Run simulation"}</button>
                </div>
              </section>

              <div className="metrics-grid">
                {metricCards.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div className="metric-card" key={metric.label}>
                      <div className={`metric-icon metric-${metric.color}`}><Icon size={16} /></div>
                      <div className="metric-top"><span>{metric.label}</span><MoreHorizontal size={15} className="muted-icon" /></div>
                      <div className="metric-value-row"><strong>{metric.value}</strong><span className={`metric-delta delta-${metric.trend}`}>{metric.trend === "up" ? <ArrowUpRight size={13} /> : metric.trend === "down" ? <ArrowDownRight size={13} /> : null}{metric.delta}</span></div>
                      <Sparkline color={metric.color === "blue" ? "#38bdf8" : metric.color === "amber" ? "#f3bd6b" : metric.color === "violet" ? "#b8a1ff" : "#ff8c7a"} reverse={metric.trend === "down"} />
                    </div>
                  );
                })}
              </div>

              <div className="section-heading"><div><span className="eyebrow">Observe · detect · predict</span><h2>What deserves your attention</h2></div><button className="text-button" onClick={() => setActiveNav("Impact graph")}>View cascading impact <ArrowUpRight size={14} /></button></div>

              <section className="attention-grid">
                <div className="panel risk-panel">
                  <div className="panel-heading"><div><span className="panel-kicker"><span className="signal-bars"><i /><i /><i /></span> PRIORITY QUEUE</span><h3>Signals that may cascade</h3></div><span className="panel-count">03 active</span></div>
                  <div className="risk-list">
                    {liveSignals.map((item, index) => <button className="risk-row" key={item.id} onClick={() => setActiveNav("Impact graph")}>
                      <div className={`risk-number risk-${item.severity === "high" ? "coral" : item.severity === "medium" ? "amber" : "blue"}`}>0{index + 1}</div>
                      <div className="risk-copy"><strong>{item.title}</strong><span>{item.detail}</span></div>
                      <div className="risk-meta"><span className={`risk-chip chip-${item.severity === "high" ? "coral" : item.severity === "medium" ? "amber" : "blue"}`}>{item.severity === "high" ? "High" : item.severity === "medium" ? "Medium" : "Watch"}</span><span className="risk-time"><Clock3 size={12} /> {item.horizon}</span></div>
                      <ArrowUpRight size={15} className="row-arrow" />
                    </button>)}
                  </div>
                  <div className="panel-footer"><span><span className="mini-avatar avatar-blue">AL</span><span className="mini-avatar avatar-violet">RK</span><span className="mini-avatar avatar-sky">JD</span></span><span>3 owners notified</span><button className="icon-button small" onClick={() => setActiveNav("Resources")}><Plus size={14} /></button></div>
                </div>

                <div className="panel forecast-panel">
                  <div className="panel-heading"><div><span className="panel-kicker"><TrendingDown size={13} /> FORECAST</span><h3>Capacity pressure</h3></div><button className="period-select" onClick={() => toast("Forecast range", { description: "Showing the next 7 days." })}>Next 7 days <ChevronDown size={13} /></button></div>
                  <div className="forecast-value"><strong>−12.6</strong><span>hours at risk</span><div className="forecast-badge"><TrendingDown size={13} /> 18.2%</div></div>
                  <div className="chart-wrap">
                    <div className="chart-y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
                    <svg viewBox="0 0 500 138" className="forecast-chart" preserveAspectRatio="none" aria-label="Capacity pressure forecast chart">
                      <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity=".25" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></linearGradient></defs>
                      <path d="M0 112 C38 109 45 91 78 99 S114 110 142 84 S177 68 204 81 S241 85 269 61 S305 38 330 61 S365 78 393 45 S430 31 458 39 S484 17 500 20 L500 138 L0 138Z" fill="url(#chartFill)" />
                      <path d="M0 112 C38 109 45 91 78 99 S114 110 142 84 S177 68 204 81 S241 85 269 61 S305 38 330 61 S365 78 393 45 S430 31 458 39 S484 17 500 20" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="0" x2="500" y1="83" y2="83" stroke="#f3bd6b" strokeDasharray="5 6" strokeOpacity=".7" />
                      <circle cx="393" cy="45" r="4" fill="#38bdf8" stroke="#081225" strokeWidth="3" /><circle cx="500" cy="20" r="4" fill="#38bdf8" stroke="#081225" strokeWidth="3" />
                    </svg>
                    <div className="chart-x-labels"><span>Today</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span></div>
                  </div>
                  <div className="forecast-note"><span className="legend-line legend-blue" /> forecast <span className="legend-line legend-amber" /> safe capacity threshold</div>
                </div>
              </section>

              <section className="workspace-grid" id="impact-map">
                <div className="panel impact-panel">
                  <div className="panel-heading"><div><span className="panel-kicker"><GitBranch size={13} /> CASCADING IMPACT PREVIEW</span><h3>Mobile release train</h3></div><div className="impact-controls"><span className="status-pill"><StatusDot color="coral" /> Live analysis</span><button className="icon-button small" onClick={() => setActiveNav("Impact graph")}><RotateCcw size={14} /></button></div></div>
                  <div className="impact-summary"><span><strong>18</strong> dependent tasks</span><span><strong>04</strong> resources touched</span><span><strong>+2.4d</strong> milestone shift</span></div>
                  <div className="impact-canvas">
                    <div className="graph-grid" />
                    <svg className="graph-lines" viewBox="0 0 760 280" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M145 140 C205 140 198 78 265 78 S325 78 372 103" /><path d="M145 140 C215 140 200 200 265 200 S325 200 372 177" /><path d="M440 103 C510 103 520 69 600 69" /><path d="M440 177 C510 177 520 221 600 221" /><path d="M440 103 C515 103 515 140 600 140" /><path d="M440 177 C515 177 515 140 600 140" />
                      <circle cx="145" cy="140" r="5" /><circle cx="372" cy="103" r="4" /><circle cx="372" cy="177" r="4" /><circle cx="600" cy="69" r="4" /><circle cx="600" cy="140" r="4" /><circle cx="600" cy="221" r="4" />
                    </svg>
                    <div className="graph-node node-origin"><div className="node-icon node-coral"><CircleAlert size={14} /></div><div><strong>QA absence</strong><span>source event</span></div></div>
                    <div className="graph-node node-a"><div className="node-icon node-amber"><Clock3 size={14} /></div><div><strong>Test cycle</strong><span>+1.5 days</span></div></div>
                    <div className="graph-node node-b"><div className="node-icon node-amber"><GitBranch size={14} /></div><div><strong>Release gate</strong><span>blocked</span></div></div>
                    <div className="graph-node node-c"><div className="node-icon node-blue"><Target size={14} /></div><div><strong>Launch milestone</strong><span>at risk</span></div></div>
                    <div className="graph-node node-d"><div className="node-icon node-violet"><Users size={14} /></div><div><strong>Support pod</strong><span>idle 6h</span></div></div>
                    <div className="graph-node node-e"><div className="node-icon node-coral"><Zap size={14} /></div><div><strong>Overtime</strong><span>+$1.2k est.</span></div></div>
                    <div className="graph-tooltip"><span className="eyebrow">Predicted impact</span><strong>Deadline risk +26%</strong><span>Confidence 94.2%</span></div>
                  </div>
                  <div className="impact-footer"><span><StatusDot color="coral" /> Direct impact</span><span><StatusDot color="amber" /> Dependent task</span><span><StatusDot color="blue" /> Recoverable path</span><button className="text-button" onClick={() => setActiveNav("Impact graph")}>Open full interactive graph <ArrowUpRight size={14} /></button></div>
                </div>

                <div className="panel recommendation-panel">
                  <div className="recommendation-top"><div className="ai-orb"><Sparkles size={16} /></div><div><span className="panel-kicker">EXPLAINABLE RECOMMENDATION</span><h3>{liveRecommendation.title}</h3></div><span className="confidence">{liveRecommendation.confidence}% <span>confidence</span></span></div>
                  <p className="recommendation-copy">{liveRecommendation.recommendation}</p>
                  <div className="reason-list"><div><Check size={13} /><span>Skill match: <strong>{liveRecommendation.skillMatch}</strong></span></div><div><Check size={13} /><span>Available: <strong>{liveRecommendation.availability}</strong></span></div><div><Check size={13} /><span>Source project impact: <strong>{liveRecommendation.sourceProjectImpact}</strong></span></div></div>
                  <div className="recommendation-impact"><div><span className="eyebrow">EXPECTED OUTCOME</span><strong>{liveRecommendation.expectedOutcome}</strong><span>{liveRecommendation.expectedOutcomeLabel}</span></div><div><span className="eyebrow">RISK CHANGE</span><strong className="blue-text">{liveRecommendation.riskChange}</strong><span>{liveRecommendation.riskChangeLabel}</span></div></div>
                  <div className="recommendation-actions">{approved || liveRecommendation.status === "approved" ? <div className="approved-state"><Check size={15} /> Approved · queued for execution</div> : <><button className="secondary-button" onClick={() => setActiveNav("Approvals")}>Review in Approvals</button><button className="primary-button" onClick={handleApprove} disabled={approvalMutation.isPending}><ShieldCheck size={14} /> {approvalMutation.isPending ? "Recording..." : isAuthenticated ? "Approve plan" : "Sign in to approve"}</button></>}</div>
                  <div className="explain-footer"><Bot size={14} /><span>Why this recommendation?</span><button onClick={() => toast("Explainability", { description: "The model weighed skills, availability, source-project impact, and milestone criticality." })}><ArrowUpRight size={13} /></button></div>
                </div>
              </section>

              <div className="section-heading scenario-heading"><div><span className="eyebrow">Simulate before you move</span><h2>Recovery scenarios</h2></div><button className="text-button" onClick={() => setActiveNav("Scenarios")}>Open simulator & trade-offs <ArrowUpRight size={14} /></button></div>
              <section className="scenario-section">
                <div className="scenario-tabs" role="tablist" aria-label="Recovery scenarios">
                  {liveScenarios.map((scenario) => <button key={scenario.scenarioKey} className={`scenario-tab ${selectedScenario === scenario.scenarioKey ? "selected" : ""}`} onClick={() => setSelectedScenario(scenario.scenarioKey as Scenario)} role="tab" aria-selected={selectedScenario === scenario.scenarioKey}><span className={`scenario-dot dot-${scenario.scenarioKey}`} /><span>{scenario.title}</span><span className="scenario-tab-sub">{scenario.subtitle}</span></button>)}
                </div>
                <div className="scenario-detail">
                  <div className="scenario-title"><div className="scenario-hero-icon"><Sparkles size={18} /></div><div><span className="eyebrow">SELECTED SCENARIO</span><h3>{selected?.title}</h3><p>{selected?.blurb}</p></div><span className="scenario-status"><StatusDot color="blue" /> {selected?.feasible ? "Feasible" : "Needs review"}</span></div>
                  <div className="scenario-stats"><div><span className="eyebrow">TIME RECOVERED</span><strong>{selected?.timeRecovered}</strong></div><div><span className="eyebrow">EST. COST</span><strong>{selected?.estimatedCost}</strong></div><div><span className="eyebrow">RISK REDUCTION</span><strong className="blue-text">{selected?.riskReduction}</strong></div><button className="primary-button" onClick={() => setActiveNav("Scenarios")}><Play size={14} fill="currentColor" /> Open full simulator</button></div>
                </div>
              </section>

              <section className="bottom-row">
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><span className="panel-kicker"><Activity size={13} /> RECENT ACTIVITY</span><h3>What changed</h3></div><button className="icon-button small" onClick={() => toast("Activity log", { description: "Showing the last 24 hours." })}><MoreHorizontal size={15} /></button></div>
                  <div className="activity-list">
                    {liveActivity.slice(0, 3).map((event) => (
                      <div className="activity-item" key={event.id}>
                        <div className={`activity-marker marker-${event.eventType === "signal" ? "coral" : event.eventType === "prediction" ? "blue" : "violet"}`}>
                          {event.eventType === "signal" ? <CircleAlert size={13} /> : event.eventType === "prediction" ? <ArrowUpRight size={13} /> : <ShieldCheck size={13} />}
                        </div>
                        <div><strong>{event.title}</strong><span>{event.detail}</span></div>
                        <span className={`activity-tag tag-${event.eventType === "signal" ? "coral" : event.eventType === "prediction" ? "blue" : "violet"}`}>{event.eventType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel governance-panel">
                  <div className="governance-graphic"><Leaf size={20} /></div>
                  <div>
                    <span className="panel-kicker">GOVERNANCE</span>
                    <h3>Humans stay in control.</h3>
                    <p>High-impact changes always need an approval. Every decision is explained, logged, and reversible.</p>
                    <button className="text-button" onClick={() => setActiveNav("Approvals")}>Go to Approval Center <ArrowUpRight size={14} /></button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="footer-bar">
          <span>Resource Pulse <span className="footer-muted">· Predictive operations, made explainable.</span></span>
          <span className="footer-right"><span>Last full sync {lastUpdated}</span><span className="footer-sep" /> <span>v2.4.0</span></span>
        </footer>
      </main>

      <AccountCenter
        open={accountOpen}
        onOpenChange={setAccountOpen}
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
        onOpenOnboardingTour={() => setOnboardingOpen(true)}
        onUserUpdate={updateUser}
      />

      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        currentUserRole={user?.role}
        currentUserName={user?.name}
        onComplete={(data) => {
          updateUser({
            role: data.role as any,
            onboardingCompleted: 1,
          });
        }}
      />

      {isLiveSimulationOpen && (
        <LiveSimulationScreen
          onClose={() => setIsLiveSimulationOpen(false)}
          onApproveAndNavigate={() => {
            setIsLiveSimulationOpen(false);
            setActiveNav("Approvals");
          }}
        />
      )}

      <VoiceAssistantCopilot
        activeNav={activeNav}
        onNavigate={(view) => {
          setActiveNav(view);
          toast.info(`Navigated to ${view}`);
        }}
        onLaunchSimulation={() => setIsLiveSimulationOpen(true)}
        onApprovePlan={handleApprove}
        onAssignTask={handleAssignTask}
      />
    </div>
  );
}

export default Home;
