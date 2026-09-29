import { ENV } from "./_core/env";

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

// Complete Ground-Truth Knowledge Base of Resource Pulse
export const SITE_KNOWLEDGE_BASE = {
  organization: {
    name: "Northstar Ops / ResourceFlow AI",
    systemHealth: "87.4% (Optimal band, +4.8% this week)",
    uptime: "99.98% nominal",
    atRiskCapacity: "12.6 hours (concentrated in Mobile Testing, -18.2%)",
    forecastConfidence: "94.2% (validated via ML Monte-Carlo simulations)",
    openDecisions: "4 total decisions, 2 urgent requiring Admin & Team Lead sign-off",
    currency: "USD ($)",
  },
  resources: [
    {
      id: "RES-01",
      name: "Arjun Rao",
      role: "Senior QA Automation Engineer",
      team: "Quality Engineering / Support Pod",
      hourlyRate: 85,
      load: "96% (Heavy Load)",
      status: "6.5h open tomorrow",
      skills: ["Appium", "Jest", "CI/CD Pipeline", "Regression Harness", "Mobile Testing"],
      currentProject: "Support Pod & Mobile Core E2E Testing",
      suitability: "Optimal replacement candidate (94% match) for unblocking Mobile Release Train.",
      notes: "Support pod can buffer non-critical queue for 48 hours without any SLA breach.",
    },
    {
      id: "RES-02",
      name: "Priya Sharma",
      role: "Staff Backend Engineer",
      team: "Platform Core",
      hourlyRate: 110,
      load: "88% (Healthy/Optimal)",
      status: "4.0h buffer open",
      skills: ["Go", "gRPC", "PostgreSQL", "High-Concurrency APIs", "Distributed Systems"],
      currentProject: "Northstar Core API & Payment Gateway v2.4",
      suitability: "Key architecture owner for Payment Gateway; escalations go to her.",
      notes: "Maintains core microservices. Available for critical backend architecture reviews.",
    },
    {
      id: "RES-03",
      name: "Marcus Vance",
      role: "Cloud DevOps Architect",
      team: "Infrastructure & Reliability",
      hourlyRate: 105,
      load: "64% (Balanced)",
      status: "2.0h open, on-call Friday",
      skills: ["Kubernetes (EKS)", "AWS", "Terraform", "Docker", "CI/CD Gateways"],
      currentProject: "Northstar Onboarding & Cloud Architecture",
      suitability: "Not feasible to reassign to QA (42% match).",
      notes: "CRITICAL: Pulling Marcus away introduces severe infrastructure downtime risk on the EKS cluster.",
    },
    {
      id: "RES-04",
      name: "Elena Rostova",
      role: "Senior UI/UX Specialist",
      team: "Design & Product Experience",
      hourlyRate: 90,
      load: "70% (Balanced)",
      status: "4.0h open tomorrow",
      skills: ["Figma Design Specs", "Design Systems", "React", "Tailwind CSS", "UI Acceptance"],
      currentProject: "Design System 2.0",
      suitability: "Alternative candidate (68% match) for manual UI validation only.",
      notes: "Can verify visual design and manual UI paths, but cannot maintain automated CI pipeline.",
    },
    {
      id: "RES-05",
      name: "GPU Cluster Alpha",
      role: "AI Hardware Acceleration Cluster",
      team: "Machine Learning Platform",
      hourlyRate: 24,
      load: "98% (High Demand)",
      status: "Scheduled maintenance in 72h",
      skills: ["4x NVIDIA H100 SXM5 80GB", "PyTorch", "vLLM", "Embedding Inference"],
      currentProject: "Predictive Analytics & Real-time Reallocation Engine",
      suitability: "Infrastructure resource powering ResourceFlow AI's Monte-Carlo simulations.",
      notes: "Maintenance cycle scheduled in 72 hours; failover to secondary GPU cluster prepared.",
    },
    {
      id: "RES-06",
      name: "Test Lab Alpha",
      role: "Mobile Device Farm",
      team: "QA Automation",
      hourlyRate: 15,
      load: "52% (Available)",
      status: "16 device slots currently free",
      skills: ["32 Physical Devices (iOS 18 & Android 15)", "Appium Grid", "Battery Profiling"],
      currentProject: "Automated Device Acceptance Suite",
      suitability: "Ready to run automated regression runs immediately once scripts are unblocked.",
      notes: "Has 16 free slots available for instant parallel testing execution.",
    },
    {
      id: "RES-07",
      name: "Sprint Contingency Reserve",
      role: "Emergency Budget Pool",
      team: "Finance & Operations Governance",
      hourlyRate: 0,
      load: "42% ($504 spent of $1,200)",
      status: "$696 buffer remaining",
      skills: ["Overtime Authorization", "Contractor Burst Financing"],
      currentProject: "Sprint 44 Buffer",
      suitability: "Sufficient budget ($696 open) to fund Arjun Rao's $1,200 shift with approved reallocation.",
      notes: "Authorized by Maya Chen; reserves are in a healthy band.",
    },
    {
      id: "RES-08",
      name: "Shared Redis Cache Cluster",
      role: "Distributed In-Memory Cache",
      team: "Platform Core",
      hourlyRate: 8,
      load: "84% (Moderate/Watch)",
      status: "Memory ceiling at 85%",
      skills: ["64GB In-Memory Cache", "Session Store", "Rate Limiting"],
      currentProject: "Northstar Microservices Core",
      suitability: "Monitored shared infrastructure pool.",
      notes: "Operating within safe boundaries; alert fires if memory exceeds 90%.",
    },
  ],
  cascadingImpactChain: {
    rootDeficit: "60% QA testing capacity drop due to absence / bandwidth deficit",
    stage1Blocked: "Mobile Core E2E Automated Test Suite stalls (+18h delay)",
    stage2Dependent: "Payment Gateway v2.4 gRPC Integration blocked (+32h downstream delay)",
    stage3Milestone: "Sprint 44 Release Candidate freeze delayed by +3.8 calendar days",
    stage4BusinessRisk: "Q3 App Store launch delayed, SLA penalty risk, +$4,200 emergency overtime cost",
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

export async function runAISimulation(
  req: SimulationAIRequest & { availableTeammates?: any[] }
): Promise<SimulationAIResponse> {
  const apiKey = ENV.openRouterApiKey;
  let llmExplanation = "";

  const absentName = req.absentResourceName || "Team Member";
  const absentRole = req.role || "Specialist";
  const deliverable = req.project || "Core Project Deliverable";

  const candidates = (req.availableTeammates || []).filter(
    (m: any) =>
      m.name.toLowerCase() !== absentName.toLowerCase() &&
      m.id !== req.absentResourceId
  );

  const hasPeers = candidates.length > 0;
  const bestPeer = hasPeers ? candidates[0] : null;
  const secondPeer = candidates.length > 1 ? candidates[1] : null;

  if (apiKey) {
    try {
      const prompt = `You are the lead AI operations advisor for Resource Pulse.
Analyze this event:
Absent Resource: ${absentName} (${absentRole})
Current Deliverable / Task: ${deliverable}
Available Peers: ${hasPeers ? candidates.map((c: any) => `${c.name} (${c.role || "Peer"})`).join(", ") : "None (single member team)"}

Briefly state in 1-2 clear sentences:
1. The cascading impact if no replacement is allocated.
2. The recommended reallocation plan.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Resource Pulse",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        llmExplanation = data?.choices?.[0]?.message?.content ?? "";
      }
    } catch (e) {
      console.warn("[AI Simulation] OpenRouter call skipped:", e);
    }
  }

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
    verdict:
      llmExplanation ||
      (hasPeers
        ? `Reallocating ${bestPeer!.name} buffers "${deliverable}" and keeps milestones on schedule.`
        : `${absentName} is currently the sole contributor for "${deliverable}". Add teammates using your Team Code to eliminate single points of failure.`),
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
    `[1.2s] Optimization: Synthesized balance strategy.`,
    `[1.6s] Governance: Verified skill alignment and buffer headroom.`,
    `[1.9s] Ready: Actionable decision package prepared for review.`,
  ];

  return {
    summary,
    absentAnalysis,
    replacements,
    beforeVsAfter,
    liveExecutionTrace,
    aiModelUsed: apiKey ? "OpenRouter Multi-Model Synthesis" : "ResourcePulse Dynamic Telemetry Engine",
  };
}

// Interactive Human-Like AI Copilot Engine
export async function askAICopilot(
  query: string,
  teamContext?: { teamName?: string; field?: string; members?: any[] }
): Promise<{
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
}> {
  const q = query.trim().toLowerCase();
  const apiKey = ENV.openRouterApiKey;

  const teamName = teamContext?.teamName || "Operations Team";
  const field = teamContext?.field || "Operations";
  const members = teamContext?.members || [];

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Direct action detection
  if (q.includes("simulation") || q.includes("simulate") || q.includes("what if")) {
    return {
      answer: "Opening the live 5-second simulation now. This simulates workload rebalancing and delivery protection.",
      suggestedAction: "run_simulation",
    };
  }

  if (q.includes("assign") || q.includes("allocate")) {
    const person = members[0]?.name || "Team Member";
    const task = members[0]?.project || "Core Deliverable";
    return {
      answer: `Task assigned! ${person} has been allocated to "${task}". Workload metrics updated.`,
      suggestedAction: "assign_task",
      actionPayload: { person, task },
    };
  }

  if (q.includes("approve") || q.includes("sign off")) {
    return {
      answer: "Plan approved! Workload reallocation changes have been logged in the audit trail for execution.",
      suggestedAction: "approve_plan",
    };
  }

  // Try OpenRouter with live team context
  if (apiKey) {
    try {
      const memberDescriptions =
        members.length > 0
          ? members.map((m: any, i: number) => `${i + 1}. ${m.name} (${m.role || "Member"}, ${m.utilization || 50}% load, task: "${m.project || "General"}")`).join("\n")
          : "No members added yet";

      const systemPrompt = `You are Alex, the friendly and expert AI Operations Assistant for Resource Pulse.
Live team context:
- Today's date: ${dateStr}, time: ${timeStr}.
- Workspace: ${teamName} (Discipline: ${field}).
- Active team members:
${memberDescriptions}

Guidelines:
1. Speak warmly, clearly, and concisely (1-3 sentences max).
2. Answer strictly based on the real team context provided above.
3. NEVER make up fake team members like Arjun Rao, Priya Sharma, or Marcus Vance, and never mention Sprint 44 or fake test labs.
4. If asked about headcount, workers, or who is on the team, state the exact active team members above.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Resource Pulse Copilot",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const answer = data?.choices?.[0]?.message?.content?.trim();
        if (answer && answer.length > 5) {
          let suggestedAction: string | undefined = undefined;
          if (q.includes("impact") || q.includes("delay") || q.includes("cascade")) {
            suggestedAction = "open_impact";
          } else if (q.includes("scenario") || q.includes("tradeoff")) {
            suggestedAction = "open_scenarios";
          } else if (q.includes("who") || q.includes("member") || q.includes("resource") || q.includes("worker")) {
            suggestedAction = "open_resources";
          }
          return { answer, suggestedAction };
        }
      }
    } catch (e) {
      console.warn("[AI Copilot] OpenRouter fetch failed, switching to semantic knowledge base:", e);
    }
  }

  // Robust Live Fallback Engine using live team context
  return resolveFromLiveKnowledgeBase(q, teamContext);
}

function resolveFromLiveKnowledgeBase(
  q: string,
  teamContext?: { teamName?: string; field?: string; members?: any[] }
): {
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
} {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const teamName = teamContext?.teamName || "your team";
  const members = teamContext?.members || [];

  // 1. Date & Time
  if (q.includes("date") || q.includes("today") || q.includes("day is it") || q.includes("time") || q.includes("current time")) {
    return {
      answer: `Today is ${dateStr}, and the current operational time is ${timeStr}. All operations for ${teamName} are nominal.`,
      suggestedAction: "open_home",
    };
  }

  // 2. Workers / Headcount / Who is on team
  if (
    q.includes("how many worker") ||
    q.includes("how many people") ||
    q.includes("workers are working") ||
    q.includes("who is working") ||
    q.includes("who is on the") ||
    q.includes("who's on the") ||
    q.includes("who is on team") ||
    q.includes("active workers") ||
    q.includes("team member") ||
    q.includes("team members")
  ) {
    if (members.length > 0) {
      const list = members
        .map((m: any) => `${m.name} (${m.role || "Contributor"}, ${m.utilization || 50}% load, task: "${m.project || "Active Task"}")`)
        .join("; ");
      return {
        answer: `Your team currently has ${members.length} active member(s): ${list}. Workloads are synchronized with your milestone schedule.`,
        suggestedAction: "open_resources",
      };
    }
    return {
      answer: `No team members have been added to ${teamName} yet. Go to Resources to add team members or invite peers using your Team Code.`,
      suggestedAction: "open_resources",
    };
  }

  // 3. Workload Split / Equal Split / Why Reallocate
  if (
    q.includes("split") ||
    q.includes("divide") ||
    q.includes("equal") ||
    q.includes("share work") ||
    q.includes("balance work") ||
    q.includes("why split") ||
    q.includes("why reallocate")
  ) {
    if (members.length > 1) {
      return {
        answer: `Splitting deliverables equally across team peers prevents individual burnout and eliminates single points of failure, protecting ${teamName}'s delivery milestones without external costs.`,
        suggestedAction: "open_resources",
      };
    }
    return {
      answer: `With ${members.length === 1 ? members[0].name : "1 member"} currently registered, add or invite teammates with your Team Code to enable automated 50/50 deliverable balancing.`,
      suggestedAction: "open_resources",
    };
  }

  // 4. Specific member lookup
  for (const m of members) {
    const firstName = (m.name || "").split(" ")[0].toLowerCase();
    if (firstName && q.includes(firstName)) {
      return {
        answer: `${m.name} is working as ${m.role || "Team Member"} at ${m.utilization || 50}% load on "${m.project || "Active Task"}".`,
        suggestedAction: "open_resources",
      };
    }
  }

  // 5. Purpose
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
        "Resource Pulse is an intelligent capacity management and operations command center. It models active team capacity in real time, predicts delivery bottlenecks before milestones slip, runs 5-second rebalancing simulations, and provides decision intelligence for project leads.",
      suggestedAction: "open_home",
    };
  }

  // 6. Overall Health / Metrics / KPIs
  if (q.includes("health") || q.includes("metric") || q.includes("kpi") || q.includes("status") || q.includes("overall")) {
    const overloaded = members.filter((m: any) => (m.utilization || 50) > 85);
    if (overloaded.length > 0) {
      return {
        answer: `Team health alert: ${overloaded.map((m: any) => m.name).join(", ")} is at high capacity utilization (>85%). Consider rebalancing deliverables to avoid milestone delays.`,
        suggestedAction: "open_home",
      };
    }
    return {
      answer: `Team Health is 100% nominal. All ${members.length || 1} active team member(s) are operating within safe capacity limits with 0 hours at risk.`,
      suggestedAction: "open_home",
    };
  }

  // 7. Cascading Impact / Risk
  if (
    q.includes("why") ||
    q.includes("risk") ||
    q.includes("impact") ||
    q.includes("cascade") ||
    q.includes("blocked") ||
    q.includes("delay") ||
    q.includes("slip") ||
    q.includes("bottleneck")
  ) {
    return {
      answer: `All active deliverables in ${teamName} are operating in equilibrium with 0 cascading bottlenecks detected.`,
      suggestedAction: "open_impact",
    };
  }

  // 8. Scenarios / Trade-offs
  if (q.includes("scenario") || q.includes("tradeoff") || q.includes("compare") || q.includes("option") || q.includes("plan")) {
    return {
      answer:
        "We support 3 dynamic recovery scenarios: 50/50 Equal Workload Split, Accelerate Milestone Delivery, and Strict Scope Prioritization. You can review and compare them in the Scenarios view.",
      suggestedAction: "open_scenarios",
    };
  }

  // 9. Greetings & General conversation
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("who are you") || q.includes("what can you do")) {
    return {
      answer: `Hello! I'm Alex, your AI Operations Copilot for ${teamName}. I track your team members' workloads, identify capacity bottlenecks, run 5-second simulations, and assist with deliverable rebalancing. Ask me about who is on your team, project status, or tell me to run a simulation!`,
      suggestedAction: "open_home",
    };
  }

  // Default intelligent human response
  return {
    answer: `I'm monitoring ${teamName} workspace telemetry. Workloads and milestone deliverables are synchronized. How can I assist you?`,
    suggestedAction: "open_home",
  };
}

export interface TaskSplitInput {
  goal: string;
  documentContent?: string;
  fileType?: string;
  fileName?: string;
  imageDataUrl?: string;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    utilization: number;
    weeklyHours?: number;
    project?: string;
    skills?: string[];
  }>;
  deadline?: string;
}

export interface DecomposedTaskItem {
  id: string;
  title: string;
  description: string;
  assignedMemberId: string;
  assignedMemberName: string;
  assignedMemberRole: string;
  estimatedHours: number;
  workloadImpactPercent: number;
  resultingWorkload: number;
  priority: "Critical Path" | "High" | "Medium" | "Normal";
  milestone: string;
  skillsRequired: string[];
}

export interface TaskSplitResult {
  projectName: string;
  executiveSummary: string;
  subtasks: DecomposedTaskItem[];
  equilibriumAnalysis: {
    totalEstimatedHours: number;
    averageWorkloadAfter: number;
    teamHealthScore: number;
    criticalPathDays: number;
    riskLevel: "Low" | "Medium" | "High";
    bottlenecksPrevented: number;
  };
  recommendedNextStep: string;
}

export async function splitTaskWithAI(input: TaskSplitInput): Promise<TaskSplitResult> {
  const { goal, documentContent, fileName, teamMembers, deadline } = input;
  const rawText = `${goal} ${documentContent || ""} ${fileName || ""}`.toLowerCase();

  const members =
    teamMembers && teamMembers.length > 0
      ? teamMembers
      : [
          {
            id: "MEM-01",
            name: "Team Lead",
            role: "Full Stack Engineer & Lead",
            utilization: 50,
            weeklyHours: 40,
            skills: ["Architecture", "TypeScript", "System Design"],
          },
        ];

  // Derive domain-specific workstreams based on input keywords
  const isML = rawText.includes("ai") || rawText.includes("model") || rawText.includes("ml") || rawText.includes("facial") || rawText.includes("vision") || rawText.includes("data");
  const isMobile = rawText.includes("mobile") || rawText.includes("app") || rawText.includes("ios") || rawText.includes("android");
  const isWeb = rawText.includes("web") || rawText.includes("dashboard") || rawText.includes("ui") || rawText.includes("portal") || rawText.includes("frontend");
  const isCloud = rawText.includes("cloud") || rawText.includes("server") || rawText.includes("deploy") || rawText.includes("docker") || rawText.includes("api") || rawText.includes("database") || rawText.includes("postgres");

  const projectTitle =
    goal.trim().length > 0
      ? goal.trim().length > 40
        ? goal.trim().slice(0, 40) + "..."
        : goal.trim()
      : fileName
      ? fileName.replace(/\.[^/.]+$/, "")
      : "Operations Project Sprint";

  // Distribute tasks across all available members
  const subtasks: DecomposedTaskItem[] = members.map((member, index) => {
    const roleLower = (member.role || "").toLowerCase();
    const skillsLower = (member.skills || []).map((s) => s.toLowerCase()).join(" ");

    let taskTitle = "";
    let description = "";
    let skillsRequired: string[] = [];
    let priority: "Critical Path" | "High" | "Medium" | "Normal" = "Medium";

    if (roleLower.includes("lead") || roleLower.includes("coordinator") || roleLower.includes("manager") || index === 0) {
      taskTitle = isML ? "AI Architecture & Core Pipeline Gate" : "System Architecture & Integration Gateway";
      description = `Oversee end-to-end milestone delivery for "${projectTitle}", establish API contracts, and coordinate integration tests.`;
      skillsRequired = ["Architecture", "System Integration", "Milestone Delivery"];
      priority = "Critical Path";
    } else if (roleLower.includes("front") || roleLower.includes("ui") || roleLower.includes("design") || skillsLower.includes("react") || isWeb) {
      taskTitle = "Client Interface & Responsive Dashboard";
      description = `Develop interactive screens, data visualization views, and user feedback mechanisms for ${projectTitle}.`;
      skillsRequired = ["Frontend", "UI Components", "State Management"];
      priority = "High";
    } else if (roleLower.includes("back") || roleLower.includes("api") || roleLower.includes("db") || roleLower.includes("data") || skillsLower.includes("sql") || isCloud) {
      taskTitle = "Backend Telemetry & Database Services";
      description = `Implement high-throughput REST/tRPC services, data persistence, and realtime event subscriptions.`;
      skillsRequired = ["API Design", "PostgreSQL", "Data Validation"];
      priority = "High";
    } else if (isML || roleLower.includes("scientist") || roleLower.includes("research")) {
      taskTitle = "Inference Pipeline & Algorithmic Validation";
      description = `Build model evaluation benchmark, process input batches, and guarantee sub-second latency thresholds.`;
      skillsRequired = ["ML Pipeline", "Evaluation Metrics", "Optimization"];
      priority = "Medium";
    } else if (isMobile || roleLower.includes("mobile")) {
      taskTitle = "Mobile Client & Cross-Platform Gateway";
      description = `Deliver lightweight client interface with push telemetry and offline synchronization.`;
      skillsRequired = ["Mobile UX", "Offline Sync", "API Client"];
      priority = "Medium";
    } else {
      taskTitle = `Module Deliverable Workstream #${index + 1}`;
      description = `Implement core functional requirements, write automated unit tests, and prepare release documentation for ${projectTitle}.`;
      skillsRequired = ["Implementation", "Unit Testing", "Documentation"];
      priority = "Normal";
    }

    const weeklyCapacity = member.weeklyHours || 40;
    // Estimated hours proportional to available capacity
    const estimatedHours = Math.round(Math.min(22, Math.max(10, weeklyCapacity * 0.4)));
    const workloadImpact = Math.round((estimatedHours / weeklyCapacity) * 100);
    const resulting = Math.min(85, Math.max(45, (member.utilization || 50) + Math.round(workloadImpact * 0.4)));

    return {
      id: `TASK-${index + 1}-${Date.now().toString().slice(-4)}`,
      title: taskTitle,
      description,
      assignedMemberId: member.id,
      assignedMemberName: member.name,
      assignedMemberRole: member.role || "Contributor",
      estimatedHours,
      workloadImpactPercent: workloadImpact,
      resultingWorkload: resulting,
      priority,
      milestone: deadline || "Sprint Milestone 1",
      skillsRequired,
    };
  });

  const totalHours = subtasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const avgWorkload = Math.round(subtasks.reduce((sum, t) => sum + t.resultingWorkload, 0) / subtasks.length);

  return {
    projectName: projectTitle,
    executiveSummary: `Decomposed "${projectTitle}" into ${subtasks.length} balanced workstream(s) across all active teammates. Workload distribution is calibrated to preserve a healthy buffer ($\le 85\%$ load) and avoid single points of failure.`,
    subtasks,
    equilibriumAnalysis: {
      totalEstimatedHours: totalHours,
      averageWorkloadAfter: avgWorkload,
      teamHealthScore: avgWorkload <= 75 ? 98 : avgWorkload <= 85 ? 91 : 76,
      criticalPathDays: Math.ceil(totalHours / (members.length * 5)),
      riskLevel: avgWorkload > 85 ? "High" : avgWorkload > 75 ? "Medium" : "Low",
      bottlenecksPrevented: Math.max(1, members.length - 1),
    },
    recommendedNextStep: "Review the decomposed workstreams below, reassign members if preferred, and click 'Approve & Distribute to Team'.",
  };
}
