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
import { AINeedsModal } from "@/components/AINeedsModal";
import { LiveFeedModal } from "@/components/LiveFeedModal";
import { IntegrationsModal } from "@/components/IntegrationsModal";
import { track } from "@/lib/analytics";
import { recordTaskAssignment, recordApprovalDecision } from "@/lib/supabase";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Boxes,
  Briefcase,
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
  const [simulationPerson, setSimulationPerson] = useState<string>("Team Member");
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [activeNav, setActiveNav] = useState("Command center");
  const [accountOpen, setAccountOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isAiNeedsOpen, setIsAiNeedsOpen] = useState(() => {
    try {
      return localStorage.getItem("resourcepulse_needs_setup_pending") === "true";
    } catch {
      return false;
    }
  });
  const [assignedTaskNotification, setAssignedTaskNotification] = useState<{
    person: string;
    task: string;
    time: string;
  } | null>(null);

  // Load real teammates from localStorage
  const [realTeammates, setRealTeammates] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_student_resources");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // If stored has stale corporate demo names, purge it
          const hasStale = parsed.some((p: any) => p.name === "Alex Rivera" || p.name === "Maya Chen" || p.name === "Arjun Rao" || p.name === "Jordan Patel");
          if (hasStale) {
            localStorage.removeItem("resourcepulse_student_resources");
            return [];
          }
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  const teamName = localStorage.getItem("resourcepulse_team_name") || user?.teamName || "Operations Team";
  const userField = localStorage.getItem("resourcepulse_selected_field") || user?.field || "Operations & Cloud Systems";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_student_resources");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const hasStale = parsed.some((p: any) => p.name === "Alex Rivera" || p.name === "Maya Chen" || p.name === "Arjun Rao" || p.name === "Jordan Patel");
          if (hasStale) {
            localStorage.removeItem("resourcepulse_student_resources");
            setRealTeammates([]);
            return;
          }
          setRealTeammates(parsed);
          if (parsed[0]?.name) setSimulationPerson(parsed[0].name);
          return;
        }
      }
      setRealTeammates([]);
    } catch {}
  }, [activeNav]);

  const speakAnnouncement = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const samantha =
        voices.find(
          (v) =>
            v.name.toLowerCase().includes("samantha") ||
            (v.name.toLowerCase().includes("zira") && v.lang.startsWith("en")) ||
            (v.name.toLowerCase().includes("natural") && v.name.toLowerCase().includes("female")) ||
            (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (samantha) utterance.voice = samantha;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAssignTask = (person: string, task: string) => {
    setAssignedTaskNotification({ person, task, time: "Just now" });
    void recordTaskAssignment(person, task);
    toast.success(`Task Assigned to ${person}`, {
      description: `Allocated to ${task}. Notification logged for team review.`,
    });
    speakAnnouncement(
      `New task assigned! ${person} has been allocated to ${task}.`
    );
  };
  const [time, setTime] = useState("09:42:18");
  const lastUpdated = dashboardQuery.data?.fetchedAt
    ? new Date(dashboardQuery.data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : time;
  const isLoading = dashboardQuery.isLoading || dashboardQuery.isFetching;
  const dataError = Boolean(dashboardQuery.error);

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

  const overloadedTeammates = useMemo(
    () => realTeammates.filter((m: any) => (m.utilization || 0) > 80 || m.status === "High Load" || m.status === "Overallocated"),
    [realTeammates]
  );

  const avgWorkload = useMemo(
    () => (realTeammates.length > 0 ? Math.round(realTeammates.reduce((acc: number, m: any) => acc + (m.utilization || 0), 0) / realTeammates.length) : 0),
    [realTeammates]
  );

  const focalMember = useMemo(() => {
    return (
      overloadedTeammates[0] ||
      realTeammates[0] || {
        id: "MEM-01",
        name: user?.name || "Team Lead",
        role: "Team Lead",
        project: "Primary Deliverable",
        utilization: 55,
        weeklyHours: 40,
      }
    );
  }, [overloadedTeammates, realTeammates, user]);

  const helperMember = useMemo(() => {
    return (
      realTeammates.find((m: any) => m.id !== focalMember.id) ||
      realTeammates[1] || {
        id: "MEM-02",
        name: "Core Contributor",
        role: "Specialist",
        project: "Supporting Workstream",
        utilization: 40,
        weeklyHours: 40,
      }
    );
  }, [realTeammates, focalMember]);

  const liveSignals = useMemo(() => {
    if (realTeammates.length === 0) {
      return [
        {
          id: 1,
          title: "Team Roster Ready For Setup",
          detail: "No teammates added yet. Go to Resources to add real teammates and track capacity.",
          severity: "watch" as const,
          horizon: "Setup phase",
          status: "active",
          ownersNotified: 1,
        },
      ];
    }
    if (overloadedTeammates.length === 0) {
      return [
        {
          id: 1,
          title: "Team Workload Equilibrium",
          detail: `All ${realTeammates.length} active team members are operating within healthy capacity.`,
          severity: "watch" as const,
          horizon: "Nominal",
          status: "active",
          ownersNotified: realTeammates.length,
        },
      ];
    }
    return overloadedTeammates.map((m: any, idx: number) => ({
      id: idx + 1,
      title: `${m.name} (${m.role})`,
      detail: `Assigned to "${m.project}" at ${m.utilization}% load. ${m.constraints || "Workload rebalance recommended."}`,
      severity: m.utilization > 85 ? ("high" as const) : ("medium" as const),
      horizon: "Active Sprint",
      status: "active",
      ownersNotified: 2,
    }));
  }, [realTeammates, overloadedTeammates]);

  const liveRecommendation = useMemo(() => {
    if (realTeammates.length === 0) {
      return {
        id: 1,
        title: "Initialize Team Roster",
        recommendation: "Add team members in the Resources tab to enable AI equal workload split and bottleneck protection.",
        confidence: 99,
        expectedOutcome: "Team ready",
        expectedOutcomeLabel: "readiness",
        riskChange: "0%",
        riskChangeLabel: "status",
        status: "pending",
        recommendedResource: user?.name || "Team Lead",
        skillMatch: "Lead",
        availability: "Flexible",
        sourceProjectImpact: "none",
      };
    }

    const overloaded = overloadedTeammates[0];
    const helper = realTeammates.find((m: any) => m.id !== overloaded?.id && (m.utilization || 0) < 75) || realTeammates[1];

    if (overloaded && helper) {
      return {
        id: 1,
        title: `Rebalance ${overloaded.name}’s Deliverable`,
        recommendation: `Split ${overloaded.project} 50/50 with ${helper.name}. This is the highest-confidence recovery path to protect milestone delivery without adding overtime stress.`,
        confidence: 95,
        expectedOutcome: "−2.0 days",
        expectedOutcomeLabel: "milestone slip avoided",
        riskChange: "−42%",
        riskChangeLabel: "burnout risk reduced",
        status: "pending",
        recommendedResource: helper.name,
        skillMatch: helper.role,
        availability: `${helper.weeklyHours || 40}h capacity`,
        sourceProjectImpact: "low",
      };
    }

    return {
      id: 1,
      title: "Capacity Balanced",
      recommendation: "All team members currently have manageable workloads. Ongoing deliverables are on schedule.",
      confidence: 96,
      expectedOutcome: "On track",
      expectedOutcomeLabel: "milestone confidence",
      riskChange: "Nominal",
      riskChangeLabel: "risk factor",
      status: "pending",
      recommendedResource: realTeammates[0]?.name || "Team Lead",
      skillMatch: realTeammates[0]?.role || "Core",
      availability: "Optimal",
      sourceProjectImpact: "none",
    };
  }, [realTeammates, overloadedTeammates, user]);

  const metricCards = useMemo(
    () => [
      {
        label: "Team Health",
        value: realTeammates.length === 0 ? "Setup" : `${Math.max(50, 100 - overloadedTeammates.length * 20)}%`,
        delta: realTeammates.length === 0 ? "0 members" : `${realTeammates.length} active`,
        trend: "up" as const,
        icon: Activity,
        color: "blue" as const,
      },
      {
        label: "At-Risk Capacity",
        value: overloadedTeammates.length > 0 ? `${overloadedTeammates.length} Members` : "0 at-risk",
        delta: overloadedTeammates.length > 0 ? "Action recommended" : "Nominal",
        trend: (overloadedTeammates.length > 0 ? "down" : "up") as "up" | "down",
        icon: CircleAlert,
        color: "amber" as const,
      },
      {
        label: "Avg Workload",
        value: `${avgWorkload}%`,
        delta: avgWorkload > 75 ? "High load" : "Balanced",
        trend: "up" as const,
        icon: Target,
        color: "violet" as const,
      },
      {
        label: "Sprint Modules",
        value: String(realTeammates.filter((m: any) => m.project).length).padStart(2, "0"),
        delta: "Active tasks",
        trend: "neutral" as const,
        icon: ShieldCheck,
        color: "coral" as const,
      },
    ],
    [realTeammates, overloadedTeammates, avgWorkload]
  );

  const liveScenarios = useMemo(() => {
    const overloaded = overloadedTeammates[0] || realTeammates[0];
    const helper = realTeammates.find((m: any) => m.id !== overloaded?.id) || realTeammates[1];
    const ovName = overloaded?.name || "Teammate";
    const hpName = helper?.name || "Partner";
    const hasPeers = realTeammates.length > 1;

    return [
      {
        id: 1,
        scenarioKey: "balanced" as const,
        title: "50/50 Equal Workload Split",
        subtitle: "Optimal team balance",
        timeRecovered: hasPeers ? "+2.0 days" : "0.0 days",
        estimatedCost: "$0 (Internal)",
        riskReduction: hasPeers ? "−42%" : "0%",
        blurb: hasPeers
          ? `Rebalances ${ovName}’s deliverable equally with ${hpName} to avoid bottlenecking milestones.`
          : `Invite or add teammates using your Team Code to enable automated 50/50 deliverable balancing.`,
        feasible: hasPeers ? 1 : 0,
      },
      {
        id: 2,
        scenarioKey: "deadline" as const,
        title: "Accelerate Milestone Delivery",
        subtitle: "Speed-first focus",
        timeRecovered: hasPeers ? "+3.5 days" : "0.0 days",
        estimatedCost: "$0 (Internal)",
        riskReduction: hasPeers ? "−58%" : "0%",
        blurb: "Pulls forward the critical path by parallelizing module integration.",
        feasible: 1,
      },
      {
        id: 3,
        scenarioKey: "cost" as const,
        title: "Strict Scope Prioritization",
        subtitle: "Scope-lean core",
        timeRecovered: hasPeers ? "+1.2 days" : "0.0 days",
        estimatedCost: "$0 (Internal)",
        riskReduction: hasPeers ? "−22%" : "0%",
        blurb: "Focuses strictly on critical path deliverables and minimizes idle scope.",
        feasible: 1,
      },
    ];
  }, [overloadedTeammates, realTeammates]);

  const selected = useMemo(
    () => liveScenarios.find((s) => s.scenarioKey === selectedScenario) ?? liveScenarios[0],
    [liveScenarios, selectedScenario]
  );

  const liveActivity = useMemo(() => {
    try {
      const stored = localStorage.getItem("resourcepulse_audit_log");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: idx + 1,
            eventType: "signal" as const,
            title: item.title,
            detail: `${item.approver}: ${item.details || item.decision}`,
          }));
        }
      }
    } catch {}

    if (realTeammates.length > 0) {
      return [
        {
          id: 1,
          eventType: "signal" as const,
          title: "Team Roster Synchronized",
          detail: `${realTeammates.length} active teammates loaded in local workspace.`,
        },
        {
          id: 2,
          eventType: "prediction" as const,
          title: "Workload Telemetry Active",
          detail: "Capacity distribution and milestone risk monitored.",
        },
      ];
    }

    return [
      {
        id: 1,
        eventType: "signal" as const,
        title: "Team Setup Phase",
        detail: "Add your team members in Resources to begin telemetry.",
      },
    ];
  }, [realTeammates]);

  const handleSimulation = () => {
    setIsLiveSimulationOpen(true);
    track("simulation_started", { scenario: selectedScenario });
  };

  const handleApprove = () => {
    approvalMutation.mutate({ id: liveRecommendation.id });
    void recordApprovalDecision(
      String(liveRecommendation.id),
      user?.name || "Team Lead",
      "Reallocation of " + (liveRecommendation.recommendedResource || "Teammate") + " for balanced sprint delivery"
    );
    speakAnnouncement(`Plan approved by ${user?.name || "Team Lead"}. Workload updated in the audit trail.`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-icon"><Zap size={16} strokeWidth={2.5} /></div>
          <span>Resource<span className="brand-accent">Pulse</span></span>
        </div>
        <button
          className="workspace-switcher"
          onClick={() => setAccountOpen(true)}
          title="Team Workspace & Settings"
          style={{ cursor: "pointer", width: "calc(100% - 6px)", textAlign: "left" }}
        >
          <div
            className="workspace-avatar text-sm"
            style={{
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
            }}
          >
            🏢
          </div>
          <div className="workspace-copy">
            <span className="eyebrow" style={{ color: "#38bdf8" }}>
              {userField || "Team Workspace"}
            </span>
            <strong>{localStorage.getItem("resourcepulse_team_name") || "Operations Team"}</strong>
          </div>
          <ChevronDown size={15} className="muted-icon" />
        </button>
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
          <button
            className={`nav-item ${isLiveFeedOpen ? "active" : ""}`}
            onClick={() => setIsLiveFeedOpen(true)}
          >
            <Activity size={17} strokeWidth={1.7} />
            <span>Live feed</span>
            <span className="live-ping" />
          </button>
          <button
            className={`nav-item ${isIntegrationsOpen ? "active" : ""}`}
            onClick={() => setIsIntegrationsOpen(true)}
          >
            <Boxes size={17} strokeWidth={1.7} />
            <span>Integrations</span>
            <span className="nav-badge" style={{ background: "rgba(14, 165, 233, 0.2)", color: "#38bdf8" }}>8</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-health"><span><StatusDot color="blue" /> System nominal</span><span className="mono">99.98%</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Briefcase size={14} className="text-sky-400" />
              <span>{localStorage.getItem("resourcepulse_team_name") || "Operations Team"}</span>
            </span>
            <span className="slash">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <div
              className="command-button"
              style={{
                color: "#38bdf8",
                borderColor: "rgba(56, 189, 248, 0.35)",
                background: "rgba(14, 165, 233, 0.1)",
              }}
              title="Active Team Workspace"
            >
              <Briefcase size={13} className="text-sky-400" />
              <span>{localStorage.getItem("resourcepulse_team_name") || "Operations Team"}</span>
            </div>
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
              style={{
                color: "#38bdf8",
                borderColor: "rgba(56, 189, 248, 0.45)",
                background: "rgba(14, 165, 233, 0.15)",
                fontWeight: 600,
              }}
              onClick={() => setIsAiNeedsOpen(true)}
              title="Tell AI your project needs, features, and deliverables"
            >
              <Sparkles size={14} className="text-sky-400 animate-pulse" />
              <span>AI Project Setup</span>
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

            {/* Top Right User Profile Button */}
            <div className="topbar-divider" />
            <button
              className="topbar-user-pill"
              onClick={() => setAccountOpen(true)}
              aria-label="Open workspace account & settings"
            >
              <div className="topbar-user-avatar">
                {user?.name
                  ? user.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "TL"}
              </div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name || "Team Lead"}</span>
                <span className="topbar-user-badge">
                  <span className="topbar-role-tag">{user?.role === "admin" ? "Team Lead" : "Core Member"}</span>
                  <span className="topbar-sub-tag">· Account settings</span>
                </span>
              </div>
              <ChevronDown size={14} className="topbar-user-chevron" />
            </button>
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
            <ResourcesView
              onAssignTask={handleAssignTask}
              onSimulateAbsence={(res) => {
                setSimulationPerson(res.name);
                setIsLiveSimulationOpen(true);
                toast.info(`Simulating absence for ${res.name}`, {
                  description: "Running 5-second dynamic impact forecast.",
                });
              }}
            />
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
              {showNotice && overloadedTeammates.length > 0 && (
                <div className="incident-banner">
                  <div className="incident-icon"><CircleAlert size={16} /></div>
                  <div>
                    <strong>Workload Bottleneck: {overloadedTeammates[0].name}</strong>
                    <span>Operating at {overloadedTeammates[0].utilization}% capacity on "{overloadedTeammates[0].project}". Workload rebalance recommended.</span>
                  </div>
                  <button className="banner-action" onClick={() => setActiveNav("Resources")}>
                    Manage Teammates <ArrowUpRight size={14} />
                  </button>
                  <button className="close-banner" onClick={() => setShowNotice(false)} aria-label="Dismiss alert">
                    <X size={15} />
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="data-status-banner loading-banner" role="status" aria-live="polite">
                  <LoaderCircle size={15} className="spin" />
                  <div><strong>Updating your command center</strong><span>Synchronizing team capacity and forecast models.</span></div>
                  <span className="loading-sheen" />
                </div>
              )}

              {dataError && realTeammates.length === 0 && (
                <div className="data-status-banner error-banner" role="alert">
                  <div className="data-error-icon"><CircleAlert size={15} /></div>
                  <div><strong>Ready to initialize team</strong><span>Add your real teammates in Resources to start tracking.</span></div>
                  <button className="retry-button" onClick={() => setActiveNav("Resources")}><Users size={13} /> Go to Resources</button>
                </div>
              )}

              <section className="hero-row">
                <div>
                  <div className="eyebrow hero-eyebrow"><span className="pulse-ring" /> Live Operations Telemetry</div>
                  <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name ? user.name.split(" ")[0] : "Team"}<span className="heading-dot">.</span></h1>
                  <p className="hero-copy">Your <strong>{userField}</strong> workspace for <strong>{teamName}</strong> is active. Real capacity and deadline models are synchronized.</p>
                </div>
                <div className="hero-actions">
                  <button className="secondary-button" onClick={() => setActiveNav("Resources")}><Filter size={15} /> Manage Teammates</button>
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
                  <div className="panel-footer">
                    <span>
                      {realTeammates.length > 0 ? (
                        realTeammates.slice(0, 3).map((m: any, idx: number) => {
                          const initials = (m.name || "TM")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                          const colors = ["avatar-blue", "avatar-violet", "avatar-sky"];
                          return (
                            <span key={m.id || idx} className={`mini-avatar ${colors[idx % colors.length]}`}>
                              {initials}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </span>
                    <span>
                      {realTeammates.length > 0
                        ? `${realTeammates.length} ${realTeammates.length === 1 ? "owner" : "owners"} notified`
                        : "0 owners notified"}
                    </span>
                    <button className="icon-button small" onClick={() => setActiveNav("Resources")}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="panel forecast-panel">
                  <div className="panel-heading">
                    <div><span className="panel-kicker"><TrendingDown size={13} /> FORECAST</span><h3>Capacity pressure</h3></div>
                    <button className="period-select" onClick={() => toast("Forecast range", { description: "Showing the next 7 days." })}>Next 7 days <ChevronDown size={13} /></button>
                  </div>
                  <div className="forecast-value">
                    <strong>{overloadedTeammates.length > 0 ? `−${(overloadedTeammates.length * 6.5).toFixed(1)}` : "0.0"}</strong>
                    <span>hours at risk</span>
                    <div className="forecast-badge">
                      {overloadedTeammates.length > 0 ? <TrendingDown size={13} /> : null}{" "}
                      {overloadedTeammates.length > 0 ? `${(overloadedTeammates.length * 18.2).toFixed(1)}%` : "0.0%"}
                    </div>
                  </div>
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
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker"><GitBranch size={13} /> CASCADING IMPACT PREVIEW</span>
                      <h3>{teamName} Critical Path</h3>
                    </div>
                    <div className="impact-controls">
                      <span className="status-pill"><StatusDot color="coral" /> Live analysis</span>
                      <button className="icon-button small" onClick={() => setActiveNav("Impact graph")}><RotateCcw size={14} /></button>
                    </div>
                  </div>
                  <div className="impact-summary">
                    <span><strong>{realTeammates.length * 3 || 3}</strong> dependent tasks</span>
                    <span><strong>{String(realTeammates.length || 1).padStart(2, "0")}</strong> resources tracked</span>
                    <span><strong>{overloadedTeammates.length > 0 ? "+2.0d" : "0.0d"}</strong> milestone shift</span>
                  </div>
                  <div className="impact-canvas">
                    <div className="graph-grid" />
                    <svg className="graph-lines" viewBox="0 0 760 280" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M145 140 C205 140 198 78 265 78 S325 78 372 103" />
                      <path d="M145 140 C215 140 200 200 265 200 S325 200 372 177" />
                      <path d="M440 103 C510 103 520 69 600 69" />
                      <path d="M440 177 C510 177 520 221 600 221" />
                      <path d="M440 103 C515 103 515 140 600 140" />
                      <path d="M440 177 C515 177 515 140 600 140" />
                      <circle cx="145" cy="140" r="5" />
                      <circle cx="372" cy="103" r="4" />
                      <circle cx="372" cy="177" r="4" />
                      <circle cx="600" cy="69" r="4" />
                      <circle cx="600" cy="140" r="4" />
                      <circle cx="600" cy="221" r="4" />
                    </svg>
                    <div className="graph-node node-origin">
                      <div className="node-icon node-coral"><CircleAlert size={14} /></div>
                      <div>
                        <strong>{focalMember.name}</strong>
                        <span>{focalMember.utilization}% load</span>
                      </div>
                    </div>
                    <div className="graph-node node-a">
                      <div className="node-icon node-amber"><Clock3 size={14} /></div>
                      <div>
                        <strong>{focalMember.project || "Sprint Deliverable"}</strong>
                        <span>{overloadedTeammates.length > 0 ? "+1.5d slip" : "On schedule"}</span>
                      </div>
                    </div>
                    <div className="graph-node node-b">
                      <div className="node-icon node-amber"><GitBranch size={14} /></div>
                      <div>
                        <strong>Integration Gate</strong>
                        <span>{overloadedTeammates.length > 0 ? "Blocked" : "Clear"}</span>
                      </div>
                    </div>
                    <div className="graph-node node-c">
                      <div className="node-icon node-blue"><Target size={14} /></div>
                      <div>
                        <strong>{teamName} Submission</strong>
                        <span>{overloadedTeammates.length > 0 ? "At risk" : "Protected"}</span>
                      </div>
                    </div>
                    <div className="graph-node node-d">
                      <div className="node-icon node-violet"><Users size={14} /></div>
                      <div>
                        <strong>{helperMember.name}</strong>
                        <span>{helperMember.weeklyHours || 20}h buffer</span>
                      </div>
                    </div>
                    <div className="graph-node node-e">
                      <div className="node-icon node-coral"><Zap size={14} /></div>
                      <div>
                        <strong>Workload Pressure</strong>
                        <span>{overloadedTeammates.length > 0 ? "High stress" : "Equilibrium"}</span>
                      </div>
                    </div>
                    <div className="graph-tooltip">
                      <span className="eyebrow">Predicted impact</span>
                      <strong>{overloadedTeammates.length > 0 ? "Workload rebalance required" : "Sprint in equilibrium"}</strong>
                      <span>Discipline: {userField}</span>
                    </div>
                  </div>
                  <div className="impact-footer">
                    <span><StatusDot color="coral" /> Direct impact</span>
                    <span><StatusDot color="amber" /> Dependent task</span>
                    <span><StatusDot color="blue" /> Recoverable path</span>
                    <button className="text-button" onClick={() => setActiveNav("Impact graph")}>
                      Open full interactive graph <ArrowUpRight size={14} />
                    </button>
                  </div>
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
        onUserUpdate={(u: any) => updateUser(u)}
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

      <AINeedsModal
        open={isAiNeedsOpen}
        onOpenChange={setIsAiNeedsOpen}
        onPlanApplied={() => {
          try {
            const stored = localStorage.getItem("resourcepulse_student_resources");
            if (stored) setRealTeammates(JSON.parse(stored));
          } catch {}
          void loadDashboard(true);
        }}
      />

      {isLiveSimulationOpen && (
        <LiveSimulationScreen
          initialResourceName={simulationPerson}
          onClose={() => setIsLiveSimulationOpen(false)}
          onApproveAndNavigate={() => {
            setIsLiveSimulationOpen(false);
            setActiveNav("Approvals");
          }}
        />
      )}

      <LiveFeedModal
        open={isLiveFeedOpen}
        onOpenChange={setIsLiveFeedOpen}
      />

      <IntegrationsModal
        open={isIntegrationsOpen}
        onOpenChange={setIsIntegrationsOpen}
      />


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
