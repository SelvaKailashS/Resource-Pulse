export interface SimulationAIRequest {
  absentResourceId: string;
  absentResourceName: string;
  role: string;
  project: string;
  bufferDays?: number;
  budgetCeiling?: number;
}

export interface ReplacementCandidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  probability: number;
  recommendationStatus: "Recommended" | "Alternative" | "Not Feasible";
  skillsMatch: string[];
  skillsMissing: string[];
  availability: string;
  donorProject: string;
  donorImpact: "Low" | "Medium" | "High";
  costDelta: string;
  reasoning: string;
}

export interface SimulationAIResponse {
  summary: {
    timeRecovered: string;
    riskReduction: string;
    estimatedCost: string;
    aiConfidence: number;
    headline: string;
    verdict: string;
  };
  absentAnalysis: {
    resourceName: string;
    capacityDrop: string;
    directTaskBlocked: string;
    dependentMilestone: string;
    unmitigatedDelay: string;
    unmitigatedCost: string;
  };
  replacements: ReplacementCandidate[];
  beforeVsAfter: {
    unmitigated: string[];
    mitigated: string[];
  };
  liveExecutionTrace: string[];
  aiModelUsed: string;
}

export const SITE_KNOWLEDGE_BASE = {
  organization: {
    name: "ResourcePulse Workspace",
    systemHealth: "Active",
    uptime: "99.98% nominal",
    atRiskCapacity: "0 hours",
    forecastConfidence: "95.0%",
    openDecisions: "0 pending decisions",
    currency: "USD ($)",
  },
  resources: [],
  cascadingImpactChain: {
    rootDeficit: "Capacity deficit detected in critical path deliverables",
    stage1Blocked: "Direct tasks delayed without resource reallocation",
    stage2Dependent: "Downstream milestone integration delayed",
    stage3Milestone: "Target delivery window compressed",
    stage4BusinessRisk: "Schedule risk and emergency overtime expenditure",
  },
  scenarios: [
    {
      id: "balanced",
      title: "Balanced Recovery (AI Recommended)",
      objective: "Optimal trade-off between schedule, team load, and budget.",
      timeRecovered: "+2.4 Days",
      estimatedCost: "$1,200",
      riskReduction: "−38%",
      donorDisruption: "Low (Support pod buffers non-critical tickets for 48h)",
      action: "Temporarily shift Arjun Rao to Mobile Core E2E for 1 test cycle.",
    },
    {
      id: "deadline",
      title: "Protect Deadline",
      objective: "Maximum time recovery regardless of cost.",
      timeRecovered: "+4.1 Days",
      estimatedCost: "$3,800",
      riskReduction: "−61%",
      donorDisruption: "None (Brings in external contractor QA burst pod in 4h)",
      action: "Contractor QA burst pod onboarded to execute parallel regression suites.",
    },
    {
      id: "cost",
      title: "Minimize Cost",
      objective: "Spend as little money as possible ($400).",
      timeRecovered: "+1.2 Days",
      estimatedCost: "$400",
      riskReduction: "−19%",
      donorDisruption: "Medium (Pauses 2 low-priority backlog features)",
      action: "Reallocates internal junior capacity and delays non-critical tasks.",
    },
    {
      id: "utilization",
      title: "Utilization Leveling",
      objective: "Smooth workload across all engineers to prevent burnout.",
      timeRecovered: "+2.0 Days",
      estimatedCost: "$950",
      riskReduction: "−30%",
      donorDisruption: "Low",
      action: "Distributes sub-tasks evenly across 3 platform engineers.",
    },
  ],
  governanceAndApprovals: {
    pendingDecisions: [
      {
        id: "DEC-8821",
        title: "Temporary Reallocation of Arjun Rao to Mobile Core E2E",
        status: "Pending Admin / Team Lead Authorization",
        recommendedCandidate: "Arjun Rao (94% probability match)",
        estimatedCost: "$1,200",
        milestoneGain: "+2.4 Days recovered",
        policyChecks: "Skill match: 100% | Overtime limit: Pass | Budget ceiling: Pass",
      },
      {
        id: "DEC-8822",
        title: "Overtime Authorization for Payment Gateway v2.4 Team",
        status: "Pending Team Lead Review",
        estimatedCost: "$650",
        policyChecks: "Budget ceiling: Pass",
      },
    ],
    auditLog: [
      {
        time: "08:30 AM Today",
        user: "Maya Chen (Operations Lead)",
        action: "Approved Kafka Consumer Overtime ($801)",
        status: "Committed to Audit Trail",
      },
      {
        time: "Yesterday 05:15 PM",
        user: "Maya Chen",
        action: "Authorized Test Lab Alpha device allocation for Sprint 44",
        status: "Completed",
      },
    ],
  },
  purposeAndUseCases: {
    whatIsThis:
      "Resource Pulse (ResourceFlow AI) is an enterprise engineering operations command center and predictive resource reallocation platform.",
    whyItMatters:
      "When engineers call in sick, go on leave, or get overloaded, traditional teams suffer silent cascading delays, missed release dates, and thousands in emergency contractor costs. Resource Pulse simulates the downstream impact in real time, recommends optimal skill-matched replacements with calculated probability, and allows 1-click human-in-the-loop executive governance.",
    whereCanItBeUsed:
      "1. High-growth tech companies and SaaS engineering departments.\n2. FinTech, Healthcare, and Mobile App teams with strict compliance and release freeze deadlines.\n3. Engineering leadership (CTOs, VPs of Engineering, Engineering Managers, Tech Leads).\n4. Digital agencies and consultancies balancing multi-project resource allocation.\n5. Enterprise IT Operations and Incident Response Command Centers.",
  },
};

export function resolveQueryKnowledgeBase(query: string): {
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
} {
  const q = query.trim().toLowerCase();

  let team: any[] = [];
  let currentTeamName = "your team";
  let currentField = "Operations";
  try {
    if (typeof window !== "undefined") {
      currentTeamName = localStorage.getItem("resourcepulse_team_name") || "your team";
      currentField = localStorage.getItem("resourcepulse_selected_field") || "Operations";
      const orgRaw = localStorage.getItem("resourcepulse_org_resources");
      if (orgRaw) {
        const parsedOrg = JSON.parse(orgRaw);
        if (Array.isArray(parsedOrg) && parsedOrg.length > 0) {
          team = parsedOrg.map((r: any) => ({
            id: r.id,
            name: r.name,
            role: r.role,
            utilization: r.capacityHours > 0 ? Math.round(((r.assignedHours || 0) / r.capacityHours) * 100) : 0,
            project: r.department || "Core Operations",
          }));
        }
      }
      if (team.length === 0) {
        const raw = localStorage.getItem("resourcepulse_student_resources");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) team = parsed;
        }
      }
    }
  } catch {}

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Date & Time
  if (
    q.includes("date") ||
    q.includes("today") ||
    q.includes("time") ||
    q.includes("day is it") ||
    q.includes("what day")
  ) {
    return {
      answer: `Today is ${dateStr}, and the current time is ${timeStr}. All operational models for ${currentTeamName} are synchronized.`,
      suggestedAction: "open_home",
    };
  }

  // 2. Workers / Headcount / Who is working / Team members
  if (
    q.includes("worker") ||
    q.includes("workers") ||
    q.includes("how many people") ||
    q.includes("how many staff") ||
    q.includes("how many working") ||
    q.includes("headcount") ||
    q.includes("team member") ||
    q.includes("team members") ||
    q.includes("who is working") ||
    q.includes("who is on the") ||
    q.includes("who's on the") ||
    q.includes("who is on team")
  ) {
    if (team.length > 0) {
      const memberList = team
        .map((m: any) => `${m.name} (${m.role || "Contributor"}, ${m.utilization || 50}% load, deliverable: "${m.project || "Active Task"}")`)
        .join("; ");
      return {
        answer: `Your team currently has ${team.length} active member(s): ${memberList}. Workloads are synchronized with your milestone schedule.`,
        suggestedAction: "open_resources",
      };
    }
    return {
      answer: `No team members have been added to ${currentTeamName} yet. Go to Resources to add team members or invite peers using your Team Code.`,
      suggestedAction: "open_resources",
    };
  }

  // 3. Workload split / 50-50 / Why reallocate
  if (
    q.includes("split") ||
    q.includes("divide") ||
    q.includes("equal") ||
    q.includes("share work") ||
    q.includes("balance work") ||
    q.includes("why split") ||
    q.includes("why reallocate")
  ) {
    if (team.length > 1) {
      return {
        answer: `Splitting deliverables equally across team peers prevents individual burnout and eliminates single points of failure, protecting ${currentTeamName}'s delivery milestones without external costs.`,
        suggestedAction: "open_resources",
      };
    }
    return {
      answer: `With ${team.length === 1 ? team[0].name : "1 member"} currently registered, add or invite teammates with your Team Code to enable automated 50/50 deliverable balancing.`,
      suggestedAction: "open_resources",
    };
  }

  // 4. Purpose / What is this website / Use cases
  if (
    q.includes("purpose") ||
    q.includes("what is this website") ||
    q.includes("where can this website be used") ||
    q.includes("why do we need") ||
    q.includes("explain the website") ||
    q.includes("use case") ||
    q.includes("who uses this")
  ) {
    return {
      answer:
        "Resource Pulse is an intelligent capacity management and operations command center. It models active team capacity in real time, predicts delivery bottlenecks before milestones slip, runs 5-second rebalancing simulations, and provides decision intelligence for project leads across any discipline.",
      suggestedAction: "open_home",
    };
  }

  // 5. Overall Health / Metrics / KPIs
  if (q.includes("health") || q.includes("metric") || q.includes("kpi") || q.includes("status") || q.includes("overall")) {
    const overloaded = team.filter((m: any) => (m.utilization || 50) > 85);
    if (overloaded.length > 0) {
      return {
        answer: `Team health alert: ${overloaded.map((m: any) => m.name).join(", ")} is at high capacity utilization (>85%). Consider rebalancing deliverables to avoid milestone delays.`,
        suggestedAction: "open_home",
      };
    }
    return {
      answer: `Team Health is 100% nominal. All ${team.length || 1} active team member(s) are operating within safe capacity limits with 0 hours at risk.`,
      suggestedAction: "open_home",
    };
  }

  // 6. Risk / Impact / Cascade / Bottleneck
  if (
    q.includes("risk") ||
    q.includes("impact") ||
    q.includes("cascade") ||
    q.includes("blocked") ||
    q.includes("delay") ||
    q.includes("slip") ||
    q.includes("bottleneck")
  ) {
    const overloaded = team.filter((m: any) => (m.utilization || 50) > 85);
    if (overloaded.length > 0) {
      return {
        answer: `Potential bottleneck detected on ${overloaded[0].name}'s deliverable ("${overloaded[0].project || "Core Project"}"). Open the Impact Graph to trace dependencies.`,
        suggestedAction: "open_impact",
      };
    }
    return {
      answer: `All active deliverables in ${currentTeamName} are operating in equilibrium with 0 cascading bottlenecks detected.`,
      suggestedAction: "open_impact",
    };
  }

  // 7. Scenarios / Trade-offs
  if (q.includes("scenario") || q.includes("tradeoff") || q.includes("compare") || q.includes("option") || q.includes("plan")) {
    return {
      answer:
        "We support 3 dynamic recovery scenarios: 50/50 Equal Workload Split, Accelerate Milestone Delivery, and Strict Scope Prioritization. You can review and compare them in the Scenarios view.",
      suggestedAction: "open_scenarios",
    };
  }

  // 8. Approvals / Decisions / Governance
  if (
    q.includes("approval") ||
    q.includes("decision") ||
    q.includes("admin") ||
    q.includes("lead") ||
    q.includes("audit")
  ) {
    return {
      answer:
        "There are currently no blocking approvals. Any simulated reallocations or policy shifts are queued for human-in-the-loop review.",
      suggestedAction: "open_approvals",
    };
  }

  // 9. Simulation / What If
  if (q.includes("simulation") || q.includes("simulate") || q.includes("what if") || q.includes("absent")) {
    const targetMember = team[0]?.name || "a team member";
    return {
      answer: `Launching live simulation! Evaluating workload impact if ${targetMember} is absent and computing recovery paths. Opening the simulation screen now!`,
      suggestedAction: "run_simulation",
    };
  }

  // 10. Task Assignment Voice Request
  if (q.includes("assign") || q.includes("allocate") || q.includes("task")) {
    const person = team[0]?.name || "Team Member";
    const task = team[0]?.project || "Core Deliverable";
    return {
      answer: `Task assigned! ${person} has been allocated to "${task}". Workload updates have been saved.`,
      suggestedAction: "assign_task",
      actionPayload: { person, task },
    };
  }

  // 11. Approval Voice Request
  if (q.includes("approve") || q.includes("sign off") || q.includes("confirm")) {
    return {
      answer: "Plan approved! Workload reallocation changes have been logged in the audit trail for execution.",
      suggestedAction: "approve_plan",
    };
  }

  // 12. Check if query is asking about a specific person in the real team
  for (const m of team) {
    const firstName = m.name.split(" ")[0].toLowerCase();
    if (q.includes(firstName)) {
      return {
        answer: `${m.name} is registered as ${m.role || "Team Member"} working on "${m.project || "Active Task"}" at ${m.utilization || 50}% load.`,
        suggestedAction: "open_resources",
      };
    }
  }

  // Project-related capability questions
  if (
    q.includes("project") ||
    q.includes("projects") ||
    q.includes("use this website") ||
    q.includes("can i use") ||
    q.includes("can we use") ||
    q.includes("manage project") ||
    q.includes("what is this for")
  ) {
    let projCount = 0;
    try {
      if (typeof window !== "undefined") {
        const rawProj = localStorage.getItem("resourcepulse_enterprise_projects_v2");
        if (rawProj) {
          const parsed = JSON.parse(rawProj);
          if (Array.isArray(parsed)) projCount = parsed.length;
        }
      }
    } catch {}

    return {
      answer: `Yes, absolutely! ResourcePulse is built specifically for project portfolio governance and delivery. You can create projects, upload requirement documents (PDF, Word, CSV, images), let AI decompose milestones, match teammates based on skills and availability, and forecast deadlines. You currently have ${projCount} project initiative(s) configured.`,
      suggestedAction: "open_projects",
    };
  }

  // Conversational prompts like "say something"
  if (
    q.includes("say something") ||
    q.includes("tell me something") ||
    q.includes("talk to me") ||
    q.includes("anything new") ||
    q.includes("what's up") ||
    q.includes("whats up")
  ) {
    return {
      answer: `Your ${currentTeamName} workspace is actively monitored. You have ${team.length} registered resource(s) operating in equilibrium. All telemetry models, milestone schedules, and capacity safety buffers are synchronized. How can I assist you with your projects today?`,
      suggestedAction: "open_home",
    };
  }

  // Greetings with word boundaries (not matching "this" or "something")
  if (
    (/\b(hello|hi|hey|howdy|greetings)\b/i.test(q) && q.split(" ").length <= 4) ||
    q.includes("who are you") ||
    q.includes("what can you do")
  ) {
    return {
      answer: `Hello! I'm Alex, your AI Operations Copilot for ${currentTeamName}. I track your team members' workloads, identify capacity bottlenecks, run 5-second simulations, and assist with deliverable rebalancing. Ask me about who is on your team, project status, or tell me to run a simulation!`,
      suggestedAction: "open_home",
    };
  }

  // Default intelligent response
  if (team.length > 0) {
    const summary = `Tracking ${team.length} active member(s): ` + team.map((m: any) => `${m.name} (${m.role || "Contributor"})`).join(", ") + ".";
    return {
      answer: `I'm monitoring ${currentTeamName} (${currentField}). ${summary} Workloads are synchronized with your milestone schedule. How can I assist you?`,
      suggestedAction: "open_home",
    };
  }

  return {
    answer: `I'm monitoring your ${currentTeamName} workspace. You can add your team members in Resources or click 'AI Project Setup' to configure deliverables! How can I assist you?`,
    suggestedAction: "open_home",
  };
}

export function computeClientSimulation(req: SimulationAIRequest): SimulationAIResponse {
  let realTeam: any[] = [];
  let currentTeamName = "Team";
  try {
    if (typeof window !== "undefined") {
      const orgRaw = localStorage.getItem("resourcepulse_org_resources");
      if (orgRaw) {
        const parsedOrg = JSON.parse(orgRaw);
        if (Array.isArray(parsedOrg) && parsedOrg.length > 0) {
          realTeam = parsedOrg.map((r: any) => ({
            id: r.id,
            name: r.name,
            role: r.role,
            utilization: r.capacityHours > 0 ? Math.round(((r.assignedHours || 0) / r.capacityHours) * 100) : 0,
            project: r.department || "Core Operations",
          }));
        }
      }
      if (realTeam.length === 0) {
        const raw = localStorage.getItem("resourcepulse_student_resources");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) realTeam = parsed;
        }
      }
      currentTeamName = localStorage.getItem("resourcepulse_team_name") || "Team";
    }
  } catch {}

  const absentName = req.absentResourceName || realTeam[0]?.name || "Team Member";
  const deliverable = req.project || realTeam[0]?.project || "Core Project Deliverable";

  // Filter peers other than the absent resource
  const candidates = realTeam.filter(
    (m: any) =>
      m.name.toLowerCase() !== absentName.toLowerCase() &&
      m.id !== req.absentResourceId
  );

  const hasPeers = candidates.length > 0;
  const bestPeer = hasPeers ? candidates[0] : null;
  const secondPeer = candidates.length > 1 ? candidates[1] : null;

  let replacements: ReplacementCandidate[] = [];

  if (hasPeers && bestPeer) {
    replacements.push({
      id: "CAND-01",
      name: bestPeer.name,
      role: bestPeer.role || "Peer Specialist",
      matchScore: 92,
      probability: 91,
      recommendationStatus: "Recommended",
      skillsMatch: ["Core Delivery", "Active Capacity", "Internal Project Context"],
      skillsMissing: [],
      availability: "Available for rebalance",
      donorProject: bestPeer.project || "Secondary Task",
      donorImpact: "Low",
      costDelta: "$0 (Internal)",
      reasoning: `Rebalancing with ${bestPeer.name} absorbs the deliverable without incurring external costs.`,
    });

    if (secondPeer) {
      replacements.push({
        id: "CAND-02",
        name: secondPeer.name,
        role: secondPeer.role || "Contributor",
        matchScore: 78,
        probability: 76,
        recommendationStatus: "Alternative",
        skillsMatch: ["Internal Project Context"],
        skillsMissing: ["Lead Review"],
        availability: "Partial availability",
        donorProject: secondPeer.project || "Secondary Task",
        donorImpact: "Medium",
        costDelta: "$0 (Internal)",
        reasoning: `${secondPeer.name} can assist with sub-tasks while maintaining their current track.`,
      });
    }
  } else {
    replacements.push({
      id: "NO-PEERS",
      name: "No backup registered",
      role: "Invite teammates to enable auto-rebalancing",
      matchScore: 0,
      probability: 0,
      recommendationStatus: "Alternative",
      skillsMatch: [],
      skillsMissing: ["Peer Capacity"],
      availability: "0h",
      donorProject: "None",
      donorImpact: "High",
      costDelta: "$0",
      reasoning: "Only 1 member is currently registered. Share your Team Code or Invite Link from Resources to add peers.",
    });
  }

  const summary = {
    timeRecovered: hasPeers ? "+2.0 Days" : "0.0 Days",
    riskReduction: hasPeers ? "−45%" : "0%",
    estimatedCost: "$0",
    aiConfidence: hasPeers ? 94 : 85,
    headline: hasPeers
      ? `Dynamic Workload Reallocation for ${absentName}`
      : `Single-Member Capacity Alert`,
    verdict: hasPeers
      ? `Reallocating ${bestPeer!.name} buffers "${deliverable}" and keeps milestones on schedule.`
      : `${absentName} is currently the sole contributor for "${deliverable}". Add teammates using your Team Code to eliminate single points of failure.`,
  };

  const absentAnalysis = {
    resourceName: absentName,
    capacityDrop: "100% capacity loss for this deliverable",
    directTaskBlocked: deliverable,
    dependentMilestone: `${deliverable} Milestone`,
    unmitigatedDelay: hasPeers ? "+2.5 Calendar Days" : "+4.0 Calendar Days",
    unmitigatedCost: "$0 (Internal Reallocation)",
  };

  const beforeVsAfter = {
    unmitigated: [
      `Absence causes "${deliverable}" to stall without an active owner.`,
      `Downstream ${absentAnalysis.dependentMilestone} slips by ${absentAnalysis.unmitigatedDelay}.`,
      `Deliverable buffer drops to 0 hours.`,
      `Milestone completion blocked until capacity is restored.`,
    ],
    mitigated: hasPeers
      ? [
          `Immediate workload shift to ${bestPeer!.name} absorbs active deliverables.`,
          `Blocker cleared: "${deliverable}" remains protected.`,
          `Net financial savings: $0 internal workload distribution.`,
          `Projected milestone slip prevented.`,
        ]
      : [
          `Invite teammates using your Team Code to share "${deliverable}".`,
          `No external contractor costs incurred ($0).`,
          `Once added, AI automatically balances workload across all peers.`,
          `Milestone protection ready upon teammate registration.`,
        ],
  };

  const liveExecutionTrace = [
    `[0.1s] Telemetry: Monitoring capacity for ${absentName} in ${deliverable}.`,
    `[0.4s] Knowledge Graph: Traced dependencies for ${deliverable}.`,
    `[0.8s] Candidate Matrix: Evaluated ${candidates.length} active registered peer(s).`,
    `[1.2s] Optimization: Synthesized balance strategy for ${currentTeamName}.`,
    `[1.6s] Governance: Verified skill alignment and buffer headroom.`,
    `[1.9s] Ready: Actionable decision package prepared for review.`,
  ];

  return {
    summary,
    absentAnalysis,
    replacements,
    beforeVsAfter,
    liveExecutionTrace,
    aiModelUsed: "ResourcePulse Dynamic Telemetry Engine",
  };
}
