import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountCenter } from "@/components/AccountCenter";
import { ResourcesView, sanitizeRoster } from "@/components/ResourcesView";
import { ScenariosView } from "@/components/ScenariosView";
import { ApprovalsView } from "@/components/ApprovalsView";
import { LiveSimulationScreen } from "@/components/LiveSimulationScreen";
import { VoiceAssistantCopilot } from "@/components/VoiceAssistantCopilot";
import { AINeedsModal } from "@/components/AINeedsModal";
import { LiveFeedModal } from "@/components/LiveFeedModal";
import { IntegrationsModal } from "@/components/IntegrationsModal";
import { CommandPaletteModal } from "@/components/CommandPaletteModal";
import { TeamChatView } from "@/components/TeamChatView";
import { TaskSplitModal } from "@/components/TaskSplitModal";
import { DataIntakeView } from "@/components/DataIntakeView";
import { ProjectsView } from "@/components/ProjectsView";
import { AllocationView } from "@/components/AllocationView";
import { WorkloadCapacityView } from "@/components/WorkloadCapacityView";
import { ForecastingView } from "@/components/ForecastingView";
import { AIInsightsView } from "@/components/AIInsightsView";
import { AlertsView } from "@/components/AlertsView";
import { ReportsView } from "@/components/ReportsView";
import { DataSourcesView } from "@/components/DataSourcesView";
import { SettingsView } from "@/components/SettingsView";
import { ScheduleView } from "@/components/ScheduleView";
import { AssetsView } from "@/components/AssetsView";
import { InventoryView } from "@/components/InventoryView";
import { SectorModal } from "@/components/SectorModal";
import { AutomationCenter } from "@/components/AutomationCenter";
import { TimesheetsView } from "@/components/TimesheetsView";
import { CalendarSyncModal } from "@/components/CalendarSyncModal";
import { loadInitialResources, loadInitialProjects, computeOrgMetrics, loadThresholds, loadSectorConfig } from "@/lib/orgStore";
import { SECTORS } from "@shared/sectorsData";
import { track } from "@/lib/analytics";
import { recordTaskAssignment, recordApprovalDecision, syncOrganizationResources } from "@/lib/supabase";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Boxes,
  Briefcase,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  Lock,
  ChevronRight,
  CircleAlert,
  Clock3,
  Command,
  Cpu,
  Database,
  FileText,
  Filter,
  FolderGit2,
  Gauge,
  GitBranch,
  GitMerge,
  Layers3,
  LoaderCircle,
  Leaf,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Users,
  X,
  Zap,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

type Scenario = "balanced" | "deadline" | "cost";

const navSections: {
  section: string;
  items: { label: string; icon: any; badge?: string }[];
}[] = [
  {
    section: "Operations",
    items: [
      { label: "Command center", icon: Gauge },
      { label: "Resources", icon: Users },
      { label: "Projects", icon: FolderGit2 },
      { label: "Timesheets", icon: Clock3, badge: "New" },
      { label: "Schedule", icon: Calendar },
      { label: "Allocation", icon: GitMerge },
      { label: "Workload & Capacity", icon: Activity },
      { label: "Assets", icon: Cpu },
      { label: "Inventory", icon: Boxes },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { label: "Analytics & Forecasting", icon: TrendingUp },
      { label: "AI Insights", icon: Sparkles },
    ],
  },
  {
    section: "Automation & Governance",
    items: [
      { label: "Smart Alerts", icon: BellRing, badge: "Auto" },
      { label: "Reports & Invoicing", icon: FileText, badge: "PDF" },
      { label: "Alerts", icon: Bell },
      { label: "Approvals", icon: ShieldCheck },
    ],
  },
  {
    section: "Data & Config",
    items: [
      { label: "Data Intake", icon: UploadCloud },
      { label: "Data Sources", icon: Database },
      { label: "Team chat", icon: MessageSquare },
      { label: "Settings", icon: Sliders },
    ],
  },
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskSplitOpen, setIsTaskSplitOpen] = useState(false);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
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

  // Load real teammates & projects from enterprise orgStore
  const [realTeammates, setRealTeammates] = useState<any[]>(() => {
    return sanitizeRoster(loadInitialResources());
  });
  const [realProjects, setRealProjects] = useState<any[]>(() => {
    return loadInitialProjects();
  });

  const [sectorConfig, setSectorConfig] = useState(() => loadSectorConfig());
  const teamName = localStorage.getItem("resourcepulse_team_name") || user?.teamName || "Operations Team";
  const userField = localStorage.getItem("resourcepulse_selected_field") || user?.field || sectorConfig.primarySector || "IT & Software";
  const activeSectorDef = useMemo(() => {
    return (
      SECTORS.find((s) => s.id === sectorConfig.primarySector || s.name.toLowerCase() === userField.toLowerCase() || s.id.toLowerCase() === userField.toLowerCase()) ||
      SECTORS[0]
    );
  }, [sectorConfig.primarySector, userField]);

  useEffect(() => {
    try {
      const res = sanitizeRoster(loadInitialResources());
      setRealTeammates(res);
      const prj = loadInitialProjects();
      setRealProjects(prj);
      if (res[0]?.name) setSimulationPerson(res[0].name);
    } catch {}
  }, [activeNav]);

  // Synchronize team members across devices via Supabase cloud
  useEffect(() => {
    const handleTeamSynced = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setRealTeammates(sanitizeRoster(e.detail));
      }
    };
    window.addEventListener("resourcepulse-team-synced", handleTeamSynced);

    // Initial sync from Supabase
    void syncOrganizationResources(teamName).then((roster) => {
      if (roster && roster.length > 0) {
        setRealTeammates(sanitizeRoster(roster));
      }
    });

    // Auto-poll Supabase every 8 seconds to detect newly joined teammates
    const interval = setInterval(() => {
      void syncOrganizationResources(teamName);
    }, 8000);

    return () => {
      window.removeEventListener("resourcepulse-team-synced", handleTeamSynced);
      clearInterval(interval);
    };
  }, [teamName]);

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
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

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
      {/* Mobile & Split-Screen Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <button
          className="sidebar-close-btn"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>

        <div className="brand-mark">
          <div className="brand-icon"><Zap size={16} strokeWidth={2.5} /></div>
          <span>Resource<span className="brand-accent">Pulse</span></span>
        </div>
        <div
          className="workspace-switcher"
          title={`${userField} — Organization Sector Locked`}
          style={{ cursor: "default", width: "calc(100% - 6px)", textAlign: "left", userSelect: "none" }}
        >
          <div
            className="workspace-avatar text-sm"
            style={{
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
            }}
          >
            {activeSectorDef?.icon || "🏢"}
          </div>
          <div className="workspace-copy">
            <span className="eyebrow" style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{userField || "Team Workspace"}</span>
              <span title="Sector locked upon registration" style={{ fontSize: "11px", opacity: 0.85 }}>🔒</span>
            </span>
            <strong>{localStorage.getItem("resourcepulse_team_name") || "Operations Team"}</strong>
          </div>
        </div>
        <div className="sidebar-scrollable flex-1 overflow-y-auto space-y-4 pr-1">
          {navSections.map((sec) => (
            <div key={sec.section}>
              <div className="sidebar-label">{sec.section}</div>
              <nav className="main-nav" aria-label={sec.section}>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setActiveNav(item.label);
                        setIsSidebarOpen(false);
                      }}
                      className={`nav-item ${isActive ? "active" : ""}`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                      <span>{item.label}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-health"><span><StatusDot color="blue" /> System nominal</span><span className="mono">99.98%</span></div>
          <button
            onClick={async () => {
              toast.info("Signing out of workspace...");
              await logout();
            }}
            className="w-full mt-2 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-500/15 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar navigation"
              title="Open Menu"
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumb min-w-0 truncate">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium truncate">
                <Briefcase size={14} className="text-sky-400 shrink-0" />
                <span className="truncate">{localStorage.getItem("resourcepulse_team_name") || "Operations Team"}</span>
              </span>
              <span className="slash">/</span>
              <strong className="truncate">{activeNav}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div
              className="command-button hidden xl:flex"
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
            <button className="sync-status hidden md:flex" onClick={() => loadDashboard(true)}>
              <StatusDot color="blue" />
              <span>{isLoading ? "Syncing…" : "Live sync"}</span>
              <span className="mono">{isLoading ? "fetching" : time}</span>
            </button>
            <button className="icon-button" aria-label="Search" onClick={() => setIsCommandPaletteOpen(true)}><Search size={17} /></button>
            <button
              className="icon-button"
              aria-label="Approvals"
              onClick={() => setActiveNav("Approvals")}
            >
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
            <button
              className="primary-button text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md text-white border-0 cursor-pointer"
              onClick={() => setIsTaskSplitOpen(true)}
              title="Add task, upload document/image, and let AI split work across your team"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">+ Add Task</span>
            </button>
            <button
              className="command-button hidden sm:flex"
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
              <span className="hidden md:inline">AI Project Setup</span>
            </button>
            <button
              className="command-button hidden lg:flex"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Open Command Palette (⌘K / Ctrl+K)"
            >
              <Command size={15} />
              <span>Command</span>
              <kbd>⌘ K</kbd>
            </button>

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
              <div className="topbar-user-info hidden md:flex">
                <span className="topbar-user-name">{user?.name || "Team Lead"}</span>
                <span className="topbar-user-badge">
                  <span className="topbar-role-tag">{user?.role === "admin" ? "Team Lead" : "Core Member"}</span>
                  <span className="topbar-sub-tag">· Account settings</span>
                </span>
              </div>
              <ChevronDown size={14} className="topbar-user-chevron" />
            </button>

            {/* Direct 1-Click Logout Button */}
            <button
              className="px-2.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-rose-500/15 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all hidden sm:flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs ml-1"
              onClick={async () => {
                toast.info("Signing out of workspace...");
                await logout();
              }}
              title="Sign out of workspace"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
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

          {activeNav === "Projects" && (
            <ProjectsView onOpenDataIntake={() => setActiveNav("Data Intake")} />
          )}

          {activeNav === "Timesheets" && (
            <TimesheetsView onOpenCalendarSync={() => setIsCalendarSyncOpen(true)} />
          )}

          {activeNav === "Allocation" && <AllocationView />}

          {activeNav === "Schedule" && (
            <ScheduleView
              onNavigateToResources={() => setActiveNav("Resources")}
              onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
            />
          )}

          {activeNav === "Workload & Capacity" && (
            <WorkloadCapacityView
              onSimulate={handleSimulation}
              onNavigateToDataIntake={() => setActiveNav("Data Intake")}
            />
          )}

          {activeNav === "Assets" && <AssetsView />}

          {activeNav === "Inventory" && <InventoryView />}

          {activeNav === "Analytics & Forecasting" && <ForecastingView />}

          {activeNav === "AI Insights" && (
            <AIInsightsView onNavigateToAllocation={() => setActiveNav("Allocation")} />
          )}

          {activeNav === "Alerts" && (
            <AlertsView onNavigateToAllocation={() => setActiveNav("Allocation")} />
          )}

          {(activeNav === "Reports" || activeNav === "Reports & Invoicing") && <ReportsView />}

          {activeNav === "Data Intake" && (
            <DataIntakeView
              onImportComplete={() => {
                void loadDashboard(true);
              }}
              onNavigateToResources={() => setActiveNav("Resources")}
            />
          )}

          {activeNav === "Data Sources" && (
            <DataSourcesView onOpenDataIntake={() => setActiveNav("Data Intake")} />
          )}

          {activeNav === "Settings" && (
            <SettingsView
              onSettingsSaved={() => {
                void loadDashboard(true);
              }}
            />
          )}

          {activeNav === "Team chat" && (
            <TeamChatView currentUserName={user?.name} currentUserRole={user?.role} />
          )}

          {(activeNav === "Smart Alerts" || activeNav === "Automation Center") && <AutomationCenter />}

          {activeNav === "Approvals" && <ApprovalsView />}

          {activeNav === "Command center" && realTeammates.length === 0 && (
            <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center bg-card/40 max-w-2xl mx-auto my-12 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 border border-primary/20">
                <Database size={30} />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome to ResourcePulse.</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Your workspace doesn't contain any resource data yet.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveNav("Data Intake")}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud size={15} /> Import Data
                </button>
                <button
                  onClick={() => setActiveNav("Resources")}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Users size={15} /> Add Resource
                </button>
                <button
                  onClick={() => setActiveNav("Data Sources")}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Database size={15} /> Connect Data Source
                </button>
              </div>
            </div>
          )}

          {activeNav === "Command center" && realTeammates.length > 0 && (
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
                <div className="hero-actions flex-wrap">
                  <button className="secondary-button" onClick={() => setActiveNav("Timesheets")}>
                    <Clock3 size={14} className="text-amber-400" /> Log Hours
                  </button>
                  <button className="secondary-button" onClick={() => setIsCalendarSyncOpen(true)}>
                    <Calendar size={14} className="text-sky-400" /> Sync Calendar
                  </button>
                  <button className="secondary-button" onClick={() => setActiveNav("Reports & Invoicing")}>
                    <FileText size={14} className="text-sky-400" /> Client Invoice
                  </button>
                  <button className="primary-button" onClick={handleSimulation} disabled={simulating}>
                    <Play size={14} fill="currentColor" /> {simulating ? "Simulating..." : "Run simulation"}
                  </button>
                </div>
              </section>

              {/* 5-SECOND CLIENT EXECUTIVE VALUE BAR */}
              <div className="p-4 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-card/70 to-blue-950/30 backdrop-blur-md shadow-xs space-y-3 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-sky-300">
                      ResourcePulse Core Engine
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">• Understand Your Entire Workspace in 5 Seconds</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Click any pillar to explore</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div
                    onClick={() => setActiveNav("Resources")}
                    className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-sky-500/50 hover:bg-background/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="text-[10px] uppercase font-mono font-bold">1. Workforce Capacity</span>
                      <Users size={13} className="text-sky-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      {realTeammates.length} Active Resources
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      Avg Workload: <strong className="text-sky-300">{avgWorkload}%</strong>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveNav("Timesheets")}
                    className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-amber-500/50 hover:bg-background/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="text-[10px] uppercase font-mono font-bold">2. Daily Timesheets</span>
                      <Clock3 size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      Planned vs. Actual
                    </div>
                    <div className="text-[10px] text-sky-400 mt-0.5 font-mono font-semibold">
                      ± Variance Tracking Live
                    </div>
                  </div>

                  <div
                    onClick={() => setIsCalendarSyncOpen(true)}
                    className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-sky-500/50 hover:bg-background/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="text-[10px] uppercase font-mono font-bold">3. 1-Click Calendar Sync</span>
                      <Calendar size={13} className="text-sky-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      Google & iCal Feed
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      Auto-sync shifts to phone
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveNav("Reports & Invoicing")}
                    className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-blue-500/50 hover:bg-background/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="text-[10px] uppercase font-mono font-bold">4. Client Invoicing</span>
                      <FileText size={13} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="font-bold text-foreground text-sm">
                      1-Click PDF & Excel
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      Accrued billable invoices
                    </div>
                  </div>
                </div>
              </div>

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

              <div className="section-heading">
                <div>
                  <span className="eyebrow">Operations & Delivery Telemetry</span>
                  <h2>Capacity & Active Projects</h2>
                </div>
                <button className="text-button" onClick={() => setActiveNav("Smart Alerts")}>
                  View Smart Alerts <ArrowUpRight size={14} />
                </button>
              </div>

              {/* SECTION 1: RESOURCE UTILIZATION & PROJECT STATUS (Section 10) */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Resource Capacity & Load Distribution */}
                <div className="p-5 rounded-2xl border border-border/70 bg-card/60 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                          Resource Workload
                        </span>
                        <h3 className="text-sm font-bold text-foreground">Capacity & Utilization</h3>
                      </div>
                      <button
                        onClick={() => setActiveNav("Resources")}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        Manage Resources <ChevronRight size={13} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {realTeammates.slice(0, 5).map((m: any, idx: number) => {
                        const util = Number(m.utilization || 0);
                        const assignedH = Number(m.assignedHours || Math.round((util / 100) * 40));
                        const capacityH = Number(m.weeklyCapacityHours || 40);
                        const isOver = util > 100;
                        const isHeavy = util >= 80 && util <= 100;

                        return (
                          <div
                            key={m.id || idx}
                            className="p-3 rounded-xl bg-background/60 border border-border/40 flex flex-col gap-2 hover:border-border transition-all"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center font-bold text-[11px] font-mono">
                                  {(m.name || "TM").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <strong className="text-foreground block">{m.name}</strong>
                                  <span className="text-[10px] text-muted-foreground">{m.role || "Specialist"} • {m.department || "Operations"}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${
                                    isOver
                                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                      : isHeavy
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                  }`}
                                >
                                  {util}% load
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                                  {assignedH}h / {capacityH}h
                                </span>
                              </div>
                            </div>

                            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOver ? "bg-rose-500" : isHeavy ? "bg-amber-400" : "bg-sky-400"
                                }`}
                                style={{ width: `${Math.min(util, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tracking {realTeammates.length} active resources</span>
                    <button
                      onClick={() => setActiveNav("Workload & Capacity")}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      Capacity Matrix →
                    </button>
                  </div>
                </div>

                {/* Active Projects & Deliverables */}
                <div className="p-5 rounded-2xl border border-border/70 bg-card/60 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                          Deliverables & Milestones
                        </span>
                        <h3 className="text-sm font-bold text-foreground">Active Projects</h3>
                      </div>
                      <button
                        onClick={() => setActiveNav("Projects")}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        Manage Projects <ChevronRight size={13} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {realProjects.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                          No active projects yet. Add your first project in the Projects view.
                        </div>
                      ) : (
                        realProjects.slice(0, 5).map((p: any, idx: number) => {
                          const progress = Number(p.progress || 0);
                          const isRisk = p.status === "At Risk" || (p.deadline && progress < 60);

                          return (
                            <div
                              key={p.id || idx}
                              className="p-3 rounded-xl bg-background/60 border border-border/40 flex flex-col gap-2 hover:border-border transition-all"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-foreground block">{p.name}</strong>
                                  <span className="text-[10px] text-muted-foreground">
                                    Lead: {p.lead || "Project Lead"} • {p.deadline || "No deadline"}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      isRisk
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : progress === 100
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                    }`}
                                  >
                                    {p.status || "In Progress"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                                    {progress}% completed
                                  </span>
                                </div>
                              </div>

                              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isRisk ? "bg-rose-500" : progress === 100 ? "bg-emerald-400" : "bg-indigo-400"
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{realProjects.length} projects registered</span>
                    <button
                      onClick={() => setActiveNav("Projects")}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      Project Timeline →
                    </button>
                  </div>
                </div>
              </section>

              {/* SECTION 2: OPERATIONAL SIGNALS & EXPLAINABLE RECOMMENDATION */}
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Observe · Detect · Predict</span>
                  <h2>Signals & Decision Governance</h2>
                </div>
                <button className="text-button" onClick={() => setActiveNav("Smart Alerts")}>
                  Manage Alerts <ArrowUpRight size={14} />
                </button>
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Priority Telemetry Signals */}
                <div className="p-5 rounded-2xl border border-border/70 bg-card/60 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                          Priority Telemetry Queue
                        </span>
                        <h3 className="text-sm font-bold text-foreground">Signals Deserving Attention</h3>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {liveSignals.length} active
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {liveSignals.map((item, index) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-background/60 border border-border/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] font-mono shrink-0 ${
                                item.severity === "high"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                              }`}
                            >
                              0{index + 1}
                            </div>
                            <div>
                              <strong className="text-foreground block">{item.title}</strong>
                              <span className="text-[11px] text-muted-foreground">{item.detail}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                item.severity === "high"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-sky-500/20 text-sky-400"
                              }`}
                            >
                              {item.severity === "high" ? "High Risk" : "Watch"}
                            </span>
                            <button
                              onClick={() => setActiveNav("Smart Alerts")}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="View signal"
                            >
                              <ArrowUpRight size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Autonomous monitoring active</span>
                    <button
                      onClick={() => setActiveNav("Smart Alerts")}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      All Smart Alerts →
                    </button>
                  </div>
                </div>

                {/* Explainable AI Decision & Recommendation */}
                <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-500/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Sparkles size={14} />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                            Explainable Decision Support
                          </span>
                          <h3 className="text-sm font-bold text-foreground">{liveRecommendation.title}</h3>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {liveRecommendation.confidence}% Confidence
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {liveRecommendation.recommendation}
                    </p>

                    <div className="space-y-1.5 text-[11px] mb-3 p-3 rounded-xl bg-background/50 border border-indigo-500/20">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Check size={12} className="text-emerald-400" />
                        <span>Skill Alignment: <strong>{liveRecommendation.skillMatch}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Check size={12} className="text-emerald-400" />
                        <span>Resource Availability: <strong>{liveRecommendation.availability}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Check size={12} className="text-emerald-400" />
                        <span>Collateral Impact: <strong>{liveRecommendation.sourceProjectImpact}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-background/30 border border-border/40">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">Expected Outcome</span>
                        <strong className="text-foreground">{liveRecommendation.expectedOutcome}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">Risk Change</span>
                        <strong className="text-sky-400">{liveRecommendation.riskChange}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-indigo-500/20 flex items-center justify-between">
                    <button
                      onClick={() => setActiveNav("Approvals")}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Review in Approvals
                    </button>

                    <button
                      className="primary-button text-xs"
                      onClick={handleApprove}
                      disabled={approvalMutation.isPending}
                    >
                      <ShieldCheck size={13} />
                      {approvalMutation.isPending ? "Recording..." : "Approve Plan"}
                    </button>
                  </div>
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
        onUserUpdate={(u: any) => updateUser(u)}
      />

      <CommandPaletteModal
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onNavigate={(view) => setActiveNav(view)}
        onRunSimulation={() => {
          setSimulationPerson(focalMember.name);
          setIsLiveSimulationOpen(true);
        }}
        onOpenAiNeeds={() => setIsAiNeedsOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenLiveFeed={() => setIsLiveFeedOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
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

      <TaskSplitModal
        open={isTaskSplitOpen}
        onOpenChange={setIsTaskSplitOpen}
        onTaskDistributed={() => {
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

      <SectorModal
        open={isSectorModalOpen}
        onOpenChange={setIsSectorModalOpen}
        activeSectorId={sectorConfig.primarySector}
        onConfigUpdated={(newCfg) => {
          setSectorConfig(newCfg);
          void loadDashboard(true);
        }}
      />

      <CalendarSyncModal
        open={isCalendarSyncOpen}
        onOpenChange={setIsCalendarSyncOpen}
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
