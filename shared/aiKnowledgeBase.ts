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

export function resolveQueryKnowledgeBase(query: string): {
  answer: string;
  suggestedAction?: string;
  actionPayload?: any;
} {
  const q = query.trim().toLowerCase();

  // 1. Arjun Rao
  if (q.includes("arjun")) {
    const res = SITE_KNOWLEDGE_BASE.resources[0];
    return {
      answer: `Arjun Rao is our Senior QA Automation Engineer ($${res.hourlyRate}/h) currently at ${res.load}. He has 6.5 hours of open availability tomorrow and is our top-recommended candidate (94% probability match) to unblock the Mobile Release Train.`,
      suggestedAction: "assign_task",
      actionPayload: { person: "Arjun Rao", task: "Mobile Core E2E Automated Testing" },
    };
  }

  // 2. Priya Sharma
  if (q.includes("priya")) {
    const res = SITE_KNOWLEDGE_BASE.resources[1];
    return {
      answer: `Priya Sharma is our Staff Backend Engineer ($${res.hourlyRate}/h) operating at an optimal ${res.load}. She owns the Northstar Core API and Payment Gateway v2.4 microservices in Go and gRPC, with 4.0h buffer available for escalation.`,
      suggestedAction: "open_resources",
    };
  }

  // 3. Marcus Vance
  if (q.includes("marcus")) {
    const res = SITE_KNOWLEDGE_BASE.resources[2];
    return {
      answer: `Marcus Vance is our Cloud DevOps Architect ($${res.hourlyRate}/h) at ${res.load}. He's on-call this Friday for EKS infrastructure. Note: our AI flags reallocating Marcus as high risk (42% match) because pulling him would jeopardize cluster stability.`,
      suggestedAction: "open_resources",
    };
  }

  // 4. Elena Rostova
  if (q.includes("elena")) {
    const res = SITE_KNOWLEDGE_BASE.resources[3];
    return {
      answer: `Elena Rostova is our Senior UI/UX Specialist ($${res.hourlyRate}/h) at ${res.load}, leading Design System 2.0. She has 4 hours open tomorrow; she can verify visual UI acceptance but cannot maintain automated CI/CD pipelines.`,
      suggestedAction: "open_resources",
    };
  }

  // 5. GPU Cluster Alpha
  if (q.includes("gpu") || q.includes("h100") || q.includes("cluster alpha")) {
    const res = SITE_KNOWLEDGE_BASE.resources[4];
    return {
      answer: `GPU Cluster Alpha houses 4x NVIDIA H100 SXM5 GPUs ($${res.hourlyRate}/h) at ${res.load}, accelerating our Monte-Carlo simulations and inference. It has a routine scheduled maintenance cycle in 72 hours with failover ready.`,
      suggestedAction: "open_resources",
    };
  }

  // 6. Test Lab Alpha
  if (q.includes("test lab") || q.includes("device") || q.includes("farm") || q.includes("android") || q.includes("ios")) {
    const res = SITE_KNOWLEDGE_BASE.resources[5];
    return {
      answer: `Test Lab Alpha is our physical device farm with 32 iOS 18 & Android 15 test devices ($${res.hourlyRate}/h) at ${res.load}. It currently has 16 free device slots ready for immediate parallel regression runs.`,
      suggestedAction: "open_resources",
    };
  }

  // 7. Budget / Reserve / Money / Cost
  if (q.includes("budget") || q.includes("reserve") || q.includes("contingency") || q.includes("money") || q.includes("cost") || q.includes("spend")) {
    const res = SITE_KNOWLEDGE_BASE.resources[6];
    return {
      answer: `Our Sprint Contingency Reserve has $1,200 total, with $504 spent (42% utilized) and a healthy $696 buffer remaining. The recommended Balanced Recovery plan requires only $1,200, which is fully authorized within our policy limits.`,
      suggestedAction: "open_scenarios",
    };
  }

  // 8. Redis Cache Cluster
  if (q.includes("redis") || q.includes("cache")) {
    const res = SITE_KNOWLEDGE_BASE.resources[7];
    return {
      answer: `The Shared Redis Cache Cluster ($${res.hourlyRate}/h) is at 84% load on a 64GB cluster. Memory is stable under the 85% safety ceiling, supporting session stores and rate limiting across Northstar microservices.`,
      suggestedAction: "open_resources",
    };
  }

  // 9. Purpose / Where can this website be used / What is this website
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
        "Resource Pulse is an AI engineering operations command center. It predicts cascading release delays before they happen when engineers are absent or overloaded, calculates optimal skill-matched replacements with exact probabilities, and allows 1-click human-in-the-loop executive approval. It is used by CTOs, Engineering Managers, and Tech Leads across FinTech, SaaS, and high-velocity engineering organizations.",
      suggestedAction: "run_simulation",
    };
  }

  // 10. Overall Health / Metrics / KPIs
  if (q.includes("health") || q.includes("metric") || q.includes("kpi") || q.includes("status") || q.includes("overall")) {
    const kpi = SITE_KNOWLEDGE_BASE.organization;
    return {
      answer: `Overall Resource Health is ${kpi.systemHealth} with ${kpi.uptime} system uptime. We have ${kpi.atRiskCapacity}, forecast confidence is at ${kpi.forecastConfidence}, and there are ${kpi.openDecisions}.`,
      suggestedAction: "open_home",
    };
  }

  // 11. Why is the release at risk / Cascading Impact Graph
  if (
    q.includes("why") ||
    q.includes("risk") ||
    q.includes("impact") ||
    q.includes("cascade") ||
    q.includes("blocked") ||
    q.includes("delay") ||
    q.includes("slip")
  ) {
    return {
      answer:
        "A 60% QA bandwidth drop has blocked Mobile Core E2E Testing (+18h), which cascades to delay Payment Gateway v2.4 (+32h). Unmitigated, the Sprint 44 Release Candidate freeze slips by +3.8 calendar days with $4,200 in overtime.",
      suggestedAction: "open_impact",
    };
  }

  // 12. Scenarios / Trade-offs
  if (q.includes("scenario") || q.includes("tradeoff") || q.includes("compare") || q.includes("option") || q.includes("plan")) {
    return {
      answer:
        "We have 4 recovery scenarios: Balanced Recovery (Recommended, +2.4d, $1.2k, -38% risk), Protect Deadline (+4.1d, $3.8k, contractor pod), Minimize Cost (+1.2d, $400), and Utilization Leveling (+2.0d, $950). Would you like to review them?",
      suggestedAction: "open_scenarios",
    };
  }

  // 13. Approvals / Decisions / Governance / Audit Log
  if (
    q.includes("approval") ||
    q.includes("decision") ||
    q.includes("admin") ||
    q.includes("lead") ||
    q.includes("audit") ||
    q.includes("maya")
  ) {
    return {
      answer:
        "There are 2 pending decisions: reallocating Arjun Rao to Mobile Core E2E ($1,200) and an overtime authorization for Payment Gateway ($650). Maya Chen previously approved Kafka Overtime ($801) at 08:30 AM today in the audit log.",
      suggestedAction: "open_approvals",
    };
  }

  // 14. Simulation / What If
  if (q.includes("simulation") || q.includes("simulate") || q.includes("what if") || q.includes("absent")) {
    return {
      answer:
        "Running our absence simulation shows that without intervention, Sprint 44 slips by 3.8 days. Reallocating Arjun Rao recovers 2.4 days with 94% probability, cutting deadline risk by 38%. Opening the live simulation screen now!",
      suggestedAction: "run_simulation",
    };
  }

  // 15. Task Assignment Voice Request
  if (q.includes("assign") || q.includes("allocate") || q.includes("task")) {
    return {
      answer:
        "Task assigned! Arjun Rao has been allocated to Mobile Core E2E Automated Testing with High Priority. The recovery package has been dispatched to the Admin and Team Lead for sign-off.",
      suggestedAction: "assign_task",
      actionPayload: { person: "Arjun Rao", task: "Mobile Core E2E Automated Testing" },
    };
  }

  // 16. Approval Voice Request
  if (q.includes("approve") || q.includes("sign off") || q.includes("confirm")) {
    return {
      answer:
        "Plan approved! The reallocation of Arjun Rao has been verified against skill and budget constraints, and logged into the audit trail for execution.",
      suggestedAction: "approve_plan",
    };
  }

  // 17. Greetings & General conversation
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("who are you")) {
    return {
      answer:
        "Hello! I'm Alex, your AI Operations Copilot for Resource Pulse. I track all 8 resources, live bottlenecks, cascading risks, and multi-scenario tradeoffs. Ask me anything, or speak a command like 'Show resources', 'Why is release at risk?', or 'Run simulation'!",
      suggestedAction: "open_home",
    };
  }

  // Default intelligent human response
  return {
    answer:
      "I'm monitoring all 8 resources across Northstar Ops. Overall resource health is 87.4% with 94.2% forecast confidence. Mobile Core E2E testing has a 12.6h capacity shortfall, and Arjun Rao is our top recovery candidate. How can I assist you?",
    suggestedAction: "open_home",
  };
}

export function computeClientSimulation(req: SimulationAIRequest): SimulationAIResponse {
  const isArjun = req.absentResourceId.includes("01") || req.absentResourceName.includes("Arjun");
  const isPriya = req.absentResourceId.includes("02") || req.absentResourceName.includes("Priya");
  const isMarcus = req.absentResourceId.includes("03") || req.absentResourceName.includes("Marcus");
  const isElena = req.absentResourceId.includes("04") || req.absentResourceName.includes("Elena");

  let summary = {
    timeRecovered: "+2.4 Days",
    riskReduction: "−38%",
    estimatedCost: "$1,200",
    aiConfidence: 94,
    headline: "Optimal Recovery Path Synthesized",
    verdict: "Reallocating Arjun Rao from Support pod avoids critical milestone slip with minimal donor disruption.",
  };

  let absentAnalysis = {
    resourceName: req.absentResourceName || "Arjun Rao",
    capacityDrop: "60% testing bandwidth loss",
    directTaskBlocked: "Mobile Core E2E Automated Test Suite",
    dependentMilestone: "Sprint 44 Release Candidate freeze",
    unmitigatedDelay: "+3.8 Calendar Days",
    unmitigatedCost: "+$4,200 emergency overtime",
  };

  let replacements: ReplacementCandidate[] = [
    {
      id: "CAND-01",
      name: isArjun ? "Arjun Rao" : "Priya Sharma",
      role: isArjun ? "Senior QA Automation Engineer" : "Staff Backend Engineer",
      matchScore: 94,
      probability: 94,
      recommendationStatus: "Recommended",
      skillsMatch: ["Appium", "Jest", "CI/CD Pipeline", "Regression Harness"],
      skillsMissing: [],
      availability: "6.5h open tomorrow",
      donorProject: "Support Pod",
      donorImpact: "Low",
      costDelta: "$1,200 standard shift",
      reasoning: "Exact skill match for test automation. Support pod can buffer non-critical queue for 48h without SLA breach.",
    },
    {
      id: "CAND-02",
      name: "Contractor QA Burst Pod",
      role: "External Verified QA Specialist",
      matchScore: 82,
      probability: 81,
      recommendationStatus: "Alternative",
      skillsMatch: ["General QA", "Manual Test Scripts"],
      skillsMissing: ["Internal E2E Architecture", "Appium Custom Harness"],
      availability: "Available in 4h",
      donorProject: "External Vendor",
      donorImpact: "Low",
      costDelta: "+$3,800 contractor billing",
      reasoning: "Fastest external backfill, but high cost and requires 4 hours of onboarding ramp.",
    },
    {
      id: "CAND-03",
      name: "Elena Rostova",
      role: "Senior UI/UX Specialist",
      matchScore: 65,
      probability: 68,
      recommendationStatus: "Alternative",
      skillsMatch: ["UI Acceptance", "Figma Design Specs"],
      skillsMissing: ["Automated Script Execution", "API Mocking"],
      availability: "4.0h open tomorrow",
      donorProject: "Design System 2.0",
      donorImpact: "Medium",
      costDelta: "$600 internal shift",
      reasoning: "Can verify visual design and manual UI paths, but cannot maintain automated CI pipeline.",
    },
    {
      id: "CAND-04",
      name: "Marcus Vance",
      role: "Cloud DevOps Architect",
      matchScore: 42,
      probability: 42,
      recommendationStatus: "Not Feasible",
      skillsMatch: ["Docker", "Linux"],
      skillsMissing: ["Mobile Testing", "Appium", "Jest"],
      availability: "2.0h limited",
      donorProject: "Cloud Architecture",
      donorImpact: "High",
      costDelta: "$0",
      reasoning: "High-risk swap: pulling Marcus introduces severe infrastructure downtime risk on EKS cluster.",
    },
  ];

  if (isPriya) {
    summary.headline = "Backend Critical Path Reallocation";
    summary.timeRecovered = "+1.8 Days";
    summary.riskReduction = "−42%";
    summary.estimatedCost = "$1,600";
    summary.verdict = "Backfilling Priya with architecture escalation buffers avoids Payment Gateway compliance breach.";
    absentAnalysis.directTaskBlocked = "Payment Gateway v2.4 gRPC Integration";
    absentAnalysis.dependentMilestone = "FinTech Compliance Sign-off";
  } else if (isMarcus) {
    summary.headline = "Infrastructure Auto-Scaling Mitigation";
    summary.timeRecovered = "+1.5 Days";
    summary.riskReduction = "−31%";
    summary.estimatedCost = "$950";
    summary.verdict = "Dedicated on-call rotation prevents Kubernetes EKS cluster degradation during high traffic.";
    absentAnalysis.directTaskBlocked = "Kubernetes Cluster Auto-scaling Group Tuning";
    absentAnalysis.dependentMilestone = "Production Traffic Switch";
  } else if (isElena) {
    summary.headline = "UI/UX Design System Backfill";
    summary.timeRecovered = "+1.4 Days";
    summary.riskReduction = "−25%";
    summary.estimatedCost = "$700";
    summary.verdict = "Frontend engineer absorbs Figma token export while UI testing continues.";
    absentAnalysis.directTaskBlocked = "Design System 2.0 Token Integration";
    absentAnalysis.dependentMilestone = "Mobile Core UI Acceptance Freeze";
  }

  const beforeVsAfter = {
    unmitigated: [
      `Absence causes ${absentAnalysis.directTaskBlocked} to stall (+18h).`,
      `Downstream ${absentAnalysis.dependentMilestone} slips by ${absentAnalysis.unmitigatedDelay}.`,
      `Financial impact: ${absentAnalysis.unmitigatedCost} in unplanned team overtime.`,
      `Final customer launch at critical risk (84% breach probability).`,
    ],
    mitigated: [
      `Immediate shift of ${replacements[0].name} absorbs the workload within 2 hours.`,
      `Blocker cleared: ${absentAnalysis.directTaskBlocked} completes on schedule.`,
      `Net financial savings: $3,000 saved compared to contractor baseline.`,
      `Projected deadline risk drops from 84% to safe 46% (Milestone protected).`,
    ],
  };

  const liveExecutionTrace = [
    `[0.1s] Telemetry: Detected capacity drop for ${req.absentResourceName} in ${req.project}.`,
    `[0.4s] Knowledge Graph: Traced 18 downstream dependencies connected to ${absentAnalysis.directTaskBlocked}.`,
    `[0.8s] Candidate Matrix: Evaluated 8 resources against skill requirements (Appium, CI/CD, Jest).`,
    `[1.2s] Optimization: Evaluated trade-offs for 4 strategies; selected Balanced Recovery.`,
    `[1.6s] Governance: Verified skill match (100%), overtime tolerance, and milestone budget.`,
    `[1.9s] Ready: Actionable decision package prepared for human approval.`,
  ];

  return {
    summary,
    absentAnalysis,
    replacements,
    beforeVsAfter,
    liveExecutionTrace,
    aiModelUsed: "ResourceFlow Hybrid Edge AI Engine",
  };
}
