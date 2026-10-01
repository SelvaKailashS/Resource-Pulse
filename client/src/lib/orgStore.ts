import {
  Resource,
  Project,
  Assignment,
  ThresholdSettings,
  DataQualityReport,
  AllocationMatchResult,
  AIInsightItem,
  ForecastPoint,
  ScenarioDefinition,
  ScenarioImpactResult,
  AssetItem,
  InventoryItem,
  ScheduleItem,
  ScheduleConflict,
  CustomResourceType,
  CustomMetric,
  OrganizationSectorConfig,
  UserRole,
} from "@shared/orgTypes";
import { recordTeamMember, recordTaskAssignment } from "./supabase";

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  warningUtilization: 85,
  criticalUtilization: 100,
  underutilizedThreshold: 50,
  standardWeeklyHours: 40,
  currency: "$",
};

const STORAGE_KEYS = {
  RESOURCES: "resourcepulse_enterprise_resources_v2",
  PROJECTS: "resourcepulse_enterprise_projects_v2",
  ASSIGNMENTS: "resourcepulse_enterprise_assignments_v2",
  THRESHOLDS: "resourcepulse_enterprise_thresholds_v2",
  HISTORICAL: "resourcepulse_enterprise_historical_v2",
  SCENARIOS: "resourcepulse_enterprise_scenarios_v2",
  AUDIT: "resourcepulse_audit_log",
  ASSETS: "resourcepulse_enterprise_assets_v2",
  INVENTORY: "resourcepulse_enterprise_inventory_v2",
  SCHEDULE: "resourcepulse_enterprise_schedule_v2",
  CUSTOM_TYPES: "resourcepulse_enterprise_custom_types_v2",
  CUSTOM_METRICS: "resourcepulse_enterprise_custom_metrics_v2",
  SECTOR_CONFIG: "resourcepulse_enterprise_sector_config_v2",
  ROLES: "resourcepulse_enterprise_roles_v2",
};

// Migrate legacy roster into enterprise resources if present, without inventing fake employees
export function loadInitialResources(): Resource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip any corporate demo names if they survived
        const cleaned = parsed.filter(
          (r: any) =>
            r.name !== "Alex Rivera" &&
            r.name !== "Maya Chen" &&
            r.name !== "Arjun Rao" &&
            r.name !== "Jordan Patel" &&
            r.name !== "Marcus Vance"
        );
        return cleaned;
      }
    }

    // Check student resources legacy key
    const legacy = localStorage.getItem("resourcepulse_student_resources");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter(
            (r: any) =>
              r.name !== "Alex Rivera" &&
              r.name !== "Maya Chen" &&
              r.name !== "Arjun Rao" &&
              r.name !== "Jordan Patel"
          )
          .map((r: any, idx: number) => ({
            id: r.id || `RES-${String(idx + 1).padStart(3, "0")}`,
            name: r.name,
            email: r.email,
            phone: r.phone,
            role: r.role || "Team Contributor",
            department: r.department || "Engineering",
            team: r.team || "Core Delivery",
            skills: Array.isArray(r.skills) ? r.skills : ["Operations"],
            experienceYears: r.experienceYears || 3,
            location: r.location || "Remote / HQ",
            employmentType: (r.employmentType || "Full-Time") as any,
            status: ((r.utilization || 50) > 100
              ? "Overallocated"
              : (r.utilization || 50) > 0
              ? "Allocated"
              : "Available") as any,
            weeklyCapacityHours: r.weeklyHours || 40,
            assignedHours: Math.round(((r.weeklyHours || 40) * (r.utilization || 50)) / 100),
            utilization: r.utilization || 50,
            costPerHour: r.costPerHour || 50,
            currentProjects: r.project ? [r.project] : [],
            notes: r.constraints || "",
          }));
        if (cleaned.length > 0) {
          localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(cleaned));
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.error("Error loading resources:", e);
  }
  return [];
}

export function saveResources(resources: Resource[]): void {
  localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));
  // Keep legacy student roster synchronized for existing views
  localStorage.setItem("resourcepulse_student_resources", JSON.stringify(resources));
  // Sync to Supabase in background
  resources.forEach((r) => {
    void recordTeamMember({
      id: r.id,
      name: r.name,
      role: r.role,
      project: r.currentProjects[0] || "Unassigned",
      weeklyHours: r.weeklyCapacityHours,
      utilization: r.utilization,
      status: r.status,
    });
  });
}

export function loadInitialProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading projects:", e);
  }
  return [];
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading assignments:", e);
  }
  return [];
}

export function saveAssignments(assignments: Assignment[]): void {
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
}

export function loadThresholds(): ThresholdSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THRESHOLDS);
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_THRESHOLDS;
}

export function saveThresholds(settings: ThresholdSettings): void {
  localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(settings));
}

// --------------------------------------------------------------------------
// Core Calculation & Analytical Metrics Engine
// --------------------------------------------------------------------------

export interface OrgMetricsSummary {
  hasData: boolean;
  totalResources: number;
  activeResources: number;
  availableCapacityHours: number;
  totalAssignedHours: number;
  avgUtilization: number;
  overallocatedCount: number;
  underutilizedCount: number;
  optimalCount: number;
  totalProjects: number;
  activeProjects: number;
  atRiskProjectsCount: number;
  capacityGapHours: number; // positive = shortage, negative = excess capacity
  totalWeeklyCost: number;
  departmentCount: number;
  departments: Array<{
    name: string;
    resourceCount: number;
    capacityHours: number;
    assignedHours: number;
    utilization: number;
    weeklyCost: number;
  }>;
}

export function computeOrgMetrics(
  resources: Resource[],
  projects: Project[],
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS
): OrgMetricsSummary {
  if (!resources || resources.length === 0) {
    return {
      hasData: false,
      totalResources: 0,
      activeResources: 0,
      availableCapacityHours: 0,
      totalAssignedHours: 0,
      avgUtilization: 0,
      overallocatedCount: 0,
      underutilizedCount: 0,
      optimalCount: 0,
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "In Progress" || p.status === "At Risk").length,
      atRiskProjectsCount: projects.filter((p) => p.status === "At Risk").length,
      capacityGapHours: 0,
      totalWeeklyCost: 0,
      departmentCount: 0,
      departments: [],
    };
  }

  const totalResources = resources.length;
  const activeResources = resources.filter((r) => r.status !== "On Leave" && r.weeklyCapacityHours > 0).length;
  const availableCapacityHours = resources.reduce((sum, r) => sum + (r.weeklyCapacityHours || 0), 0);
  const totalAssignedHours = resources.reduce((sum, r) => sum + (r.assignedHours || 0), 0);
  const avgUtilization =
    availableCapacityHours > 0 ? Math.round((totalAssignedHours / availableCapacityHours) * 100) : 0;

  const overallocatedCount = resources.filter((r) => r.utilization > thresholds.criticalUtilization).length;
  const underutilizedCount = resources.filter((r) => r.utilization < thresholds.underutilizedThreshold).length;
  const optimalCount = totalResources - overallocatedCount - underutilizedCount;

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "In Progress" || p.status === "At Risk").length;
  const atRiskProjectsCount = projects.filter(
    (p) => p.status === "At Risk" || p.assignedHours < p.requiredHours * 0.5
  ).length;

  const requiredHoursAcrossProjects = projects
    .filter((p) => p.status === "In Progress" || p.status === "Planning")
    .reduce((sum, p) => sum + p.requiredHours, 0);

  const capacityGapHours = Math.max(0, requiredHoursAcrossProjects - availableCapacityHours);
  const totalWeeklyCost = resources.reduce((sum, r) => sum + (r.weeklyCapacityHours || 40) * (r.costPerHour || 50), 0);

  // Group by department
  const deptMap = new Map<string, { resourceCount: number; capacityHours: number; assignedHours: number; weeklyCost: number }>();
  resources.forEach((r) => {
    const dept = r.department || "General Operations";
    const cur = deptMap.get(dept) || { resourceCount: 0, capacityHours: 0, assignedHours: 0, weeklyCost: 0 };
    cur.resourceCount += 1;
    cur.capacityHours += r.weeklyCapacityHours || 0;
    cur.assignedHours += r.assignedHours || 0;
    cur.weeklyCost += (r.weeklyCapacityHours || 0) * (r.costPerHour || 0);
    deptMap.set(dept, cur);
  });

  const departments = Array.from(deptMap.entries()).map(([name, stats]) => ({
    name,
    resourceCount: stats.resourceCount,
    capacityHours: stats.capacityHours,
    assignedHours: stats.assignedHours,
    utilization: stats.capacityHours > 0 ? Math.round((stats.assignedHours / stats.capacityHours) * 100) : 0,
    weeklyCost: stats.weeklyCost,
  }));

  return {
    hasData: true,
    totalResources,
    activeResources,
    availableCapacityHours,
    totalAssignedHours,
    avgUtilization,
    overallocatedCount,
    underutilizedCount,
    optimalCount,
    totalProjects,
    activeProjects,
    atRiskProjectsCount,
    capacityGapHours,
    totalWeeklyCost,
    departmentCount: departments.length,
    departments,
  };
}

// --------------------------------------------------------------------------
// Transparent Resource Allocation Match Engine
// --------------------------------------------------------------------------

export function computeAllocationCompatibility(resource: Resource, project: Project): AllocationMatchResult {
  const reqSkills = project.requiredSkills || [];
  const resSkills = resource.skills || [];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  reqSkills.forEach((req) => {
    const matched = resSkills.some((s) => s.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(s.toLowerCase()));
    if (matched) matchedSkills.push(req);
    else missingSkills.push(req);
  });

  const skillMatchScore = reqSkills.length > 0 ? Math.round((matchedSkills.length / reqSkills.length) * 100) : 85;

  const availableHours = Math.max(0, resource.weeklyCapacityHours - resource.assignedHours);
  const remainingProjectHours = Math.max(0, project.requiredHours - project.assignedHours);

  let capacityScore = 100;
  if (remainingProjectHours > 0) {
    capacityScore = Math.min(100, Math.round((availableHours / Math.min(40, remainingProjectHours)) * 100));
  } else if (resource.utilization > 100) {
    capacityScore = 20;
  }

  const availabilityScore = resource.status === "On Leave" ? 0 : resource.status === "Overallocated" ? 35 : resource.status === "Available" ? 100 : 75;

  // Weighted formula: Skills (45%), Availability (30%), Capacity (25%)
  const overallCompatibility = Math.round(skillMatchScore * 0.45 + availabilityScore * 0.3 + capacityScore * 0.25);

  const recommended = overallCompatibility >= 70 && resource.status !== "On Leave";

  let reasoning = "";
  if (recommended) {
    reasoning = `Strong candidate with ${skillMatchScore}% skill alignment and ${availableHours}h open weekly buffer.`;
  } else if (resource.status === "On Leave") {
    reasoning = `Unavailable due to scheduled leave.`;
  } else if (resource.utilization > 100) {
    reasoning = `Currently over-allocated (${resource.utilization}% load). Allocation risks burnout and delivery slip.`;
  } else {
    reasoning = `Missing key skills: ${missingSkills.join(", ") || "domain match"}.`;
  }

  return {
    resourceId: resource.id,
    resourceName: resource.name,
    projectId: project.id,
    projectName: project.name,
    skillMatchScore,
    matchedSkills,
    missingSkills,
    availabilityScore,
    capacityScore,
    overallCompatibility,
    overallScore: overallCompatibility,
    availableHours,
    remainingCapacity: availableHours,
    recommended,
    reasoning,
    explanation: reasoning,
  };
}

// --------------------------------------------------------------------------
// Transparent AI Insights Generator
// --------------------------------------------------------------------------

export function generateTransparentAIInsights(
  resources: Resource[],
  projects: Project[],
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS
): AIInsightItem[] {
  if (resources.length === 0) return [];

  const insights: AIInsightItem[] = [];

  // 1. Critical Over-allocation Insights
  const overallocated = resources.filter((r) => r.utilization > thresholds.criticalUtilization);
  if (overallocated.length > 0) {
    const topOver = overallocated[0];
    insights.push({
      id: "insight-overload-1",
      category: "risk",
      severity: "critical",
      title: `Critical Capacity Overload: ${topOver.name} at ${topOver.utilization}% Load`,
      evidence: `Actual assigned hours: ${topOver.assignedHours}h vs weekly capacity of ${topOver.weeklyCapacityHours}h (${topOver.assignedHours - topOver.weeklyCapacityHours}h deficit). Current project: "${topOver.currentProjects[0] || "Active Sprint"}".`,
      impact: `Persistent overload above ${thresholds.criticalUtilization}% leads directly to technical debt, milestone delivery delays, and employee burnout.`,
      recommendation: `Rebalance tasks or allocate a co-contributor from the Available pool to absorb ${Math.round(topOver.assignedHours - topOver.weeklyCapacityHours)} weekly hours.`,
      confidence: 96,
      relatedEntityId: topOver.id,
      relatedEntityType: "resource",
    });
  }

  // 2. Underutilized Capacity Opportunities
  const underutilized = resources.filter((r) => r.utilization < thresholds.underutilizedThreshold && r.status !== "On Leave");
  if (underutilized.length > 0) {
    const totalIdleHours = underutilized.reduce((sum, r) => sum + (r.weeklyCapacityHours - r.assignedHours), 0);
    insights.push({
      id: "insight-underutil-1",
      category: "workforce",
      severity: "opportunity",
      title: `${underutilized.length} Resources Underutilized (${totalIdleHours} Idle Capacity Hours)`,
      evidence: `Team members (${underutilized.map((r) => r.name).slice(0, 3).join(", ")}${underutilized.length > 3 ? "..." : ""}) are operating at an average of ${Math.round(underutilized.reduce((s, r) => s + r.utilization, 0) / underutilized.length)}% utilization, below the ${thresholds.underutilizedThreshold}% target.`,
      impact: `Organizational cost efficiency is impaired with ${totalIdleHours} hours of available throughput left untapped this cycle.`,
      recommendation: `Assign pending project deliverables or backlog items to these available members to accelerate delivery dates.`,
      confidence: 92,
    });
  }

  // 3. Project Resource Shortage Gaps
  const understaffedProjects = projects.filter((p) => p.assignedHours < p.requiredHours * 0.7 && p.status !== "Completed");
  if (understaffedProjects.length > 0) {
    const p = understaffedProjects[0];
    const gap = p.requiredHours - p.assignedHours;
    insights.push({
      id: "insight-proj-gap-1",
      category: "project",
      severity: "warning",
      title: `Resource Deficit in "${p.name}" (Gap: ${gap}h)`,
      evidence: `Project requires ${p.requiredHours} total hours for target deadline (${p.endDate}), but only ${p.assignedHours} hours have been allocated across ${p.assignedResourceIds.length} assigned resources.`,
      impact: `Milestone completion date may slip by an estimated ${Math.ceil(gap / 30)} to ${Math.ceil(gap / 15)} calendar days if additional capacity is not assigned.`,
      recommendation: `Allocate resources with required skills (${p.requiredSkills.slice(0, 3).join(", ") || "General"}) from low-priority initiatives.`,
      confidence: 88,
      relatedEntityId: p.id,
      relatedEntityType: "project",
    });
  }

  // 4. Department Balance Check
  const metrics = computeOrgMetrics(resources, projects, thresholds);
  const overloadedDept = metrics.departments.find((d) => d.utilization > 90);
  if (overloadedDept) {
    insights.push({
      id: "insight-dept-1",
      category: "trend",
      severity: "warning",
      title: `Department Workload Strain: ${overloadedDept.name} (${overloadedDept.utilization}% Avg Load)`,
      evidence: `${overloadedDept.name} has ${overloadedDept.assignedHours}h assigned out of ${overloadedDept.capacityHours}h total capacity across ${overloadedDept.resourceCount} members.`,
      impact: `Department has minimal buffer for emergent production incidents or urgent change requests.`,
      recommendation: `Cross-train staff from adjacent departments or pace non-critical deliverables.`,
      confidence: 89,
      relatedEntityId: overloadedDept.name,
      relatedEntityType: "department",
    });
  }

  return insights;
}

// --------------------------------------------------------------------------
// Dynamic Forecasting Engine (Strictly from real data)
// --------------------------------------------------------------------------

export function generateDynamicForecast(
  resources: Resource[],
  projects: Project[],
  horizonInput: "7d" | "30d" | "90d" | "180d" | "365d" | number = 30,
  scope?: string
): { points: ForecastPoint[]; confidence: number; rationale: string } {
  if (resources.length === 0) {
    return {
      points: [],
      confidence: 0,
      rationale: "Insufficient organizational data. Import or add resources to generate forecast.",
    };
  }

  const horizonDays = typeof horizonInput === "string" ? parseInt(horizonInput) || 30 : horizonInput;

  const currentCapacity = resources.reduce((sum, r) => sum + r.weeklyCapacityHours, 0);
  const currentAssigned = resources.reduce((sum, r) => sum + r.assignedHours, 0);

  const steps = horizonDays <= 7 ? 7 : horizonDays <= 30 ? 6 : 6;
  const intervalDays = Math.ceil(horizonDays / steps);

  const points: ForecastPoint[] = [];
  const now = new Date();

  // Baseline linear projection with capacity decay & demand seasonality
  for (let i = 0; i <= steps; i++) {
    const d = new Date(now.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
    const dateLabel = d.toLocaleDateString([], { month: "short", day: "numeric" });

    // Active project demand curve based on end dates
    const activeAtDate = projects.filter((p) => {
      const end = p.endDate ? new Date(p.endDate).getTime() : now.getTime() + 60 * 24 * 60 * 60 * 1000;
      return end >= d.getTime();
    });

    const projectedDemand =
      activeAtDate.length > 0
        ? Math.round(activeAtDate.reduce((sum, p) => sum + p.requiredHours / 4, 0))
        : Math.round(currentAssigned * (1 + (i * 0.03 - 0.05)));

    const projectedCapacity = Math.round(currentCapacity * (1 - i * 0.01)); // slight degradation assumption for scheduled leave
    const projectedUtilization = projectedCapacity > 0 ? Math.round((projectedDemand / projectedCapacity) * 100) : 0;

    const variance = (i / steps) * 14;

    points.push({
      date: d.toISOString().split("T")[0],
      label: i === 0 ? "Today" : dateLabel,
      actualCapacity: i === 0 ? currentCapacity : undefined,
      actualDemand: i === 0 ? currentAssigned : undefined,
      actualUtilization: i === 0 ? Math.round((currentAssigned / (currentCapacity || 1)) * 100) : undefined,
      forecastCapacity: projectedCapacity,
      availableCapacityHours: projectedCapacity,
      forecastDemand: projectedDemand,
      demandHours: projectedDemand,
      forecastUtilization: projectedUtilization,
      lowerConfidenceBound: Math.max(30, projectedUtilization - variance),
      upperConfidenceBound: Math.min(140, projectedUtilization + variance),
      confidence: Math.max(60, Math.round(96 - (i / steps) * 18)),
    });
  }

  const confidence = Math.max(65, Math.round(96 - (horizonDays / 365) * 22));
  const rationale = `Forecast models ${resources.length} active resources (${currentCapacity}h weekly capacity) against ${projects.length} planned milestones over the next ${horizonDays} days.`;

  return { points, confidence, rationale };
}

// --------------------------------------------------------------------------
// What-If Scenario Simulation Engine
// --------------------------------------------------------------------------

export function runWhatIfScenario(
  resources: Resource[],
  projects: Project[],
  scenario: ScenarioDefinition
): ScenarioImpactResult {
  const baseline = computeOrgMetrics(resources, projects);

  let simResources = [...resources];
  let simProjects = [...projects];

  const tradeoffs: string[] = [];

  switch (scenario.type) {
    case "add_headcount": {
      const count = scenario.params.headcountDelta || 2;
      const role = scenario.params.headcountRole || "Specialist";
      for (let i = 1; i <= count; i++) {
        simResources.push({
          id: `SIM-HC-${i}`,
          name: `Additional ${role} #${i}`,
          role,
          department: "Engineering",
          employmentType: "Full-Time",
          status: "Available",
          weeklyCapacityHours: 40,
          assignedHours: 15,
          utilization: 38,
          costPerHour: 60,
          skills: [role, "Delivery"],
          currentProjects: [],
        });
      }
      tradeoffs.push(`Added ${count * 40}h weekly available capacity.`);
      tradeoffs.push(`Increases weekly operational expenditure by $${count * 40 * 60}.`);
      break;
    }

    case "resource_absence": {
      const targetId = scenario.params.absentResourceId || resources[0]?.id;
      const days = scenario.params.absenceDays || 10;
      simResources = simResources.map((r) => {
        if (r.id === targetId) {
          return {
            ...r,
            status: "On Leave" as const,
            weeklyCapacityHours: 0,
            utilization: 0,
          };
        }
        return r;
      });
      tradeoffs.push(`Removes resource capacity for ${days} days.`);
      tradeoffs.push(`Remaining teammates must absorb assigned workload to prevent milestone slip.`);
      break;
    }

    case "new_project": {
      const hours = scenario.params.newProjectHours || 200;
      simProjects.push({
        id: `SIM-PROJ-${Date.now()}`,
        name: "New Unplanned Initiative",
        department: "Product",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: scenario.params.newProjectPriority || "High",
        status: "Planning",
        budget: hours * 85,
        actualExpenditure: 0,
        requiredSkills: ["Engineering", "Design"],
        requiredHours: hours,
        assignedHours: 0,
        assignedResourceIds: [],
      });
      tradeoffs.push(`Adds ${hours}h requirement to project demand backlog.`);
      tradeoffs.push(`Requires reallocation or overtime if external contractor is not onboarded.`);
      break;
    }

    case "shift_deadline": {
      const weeks = scenario.params.weeksShift || 2;
      tradeoffs.push(`Shifting delivery window by ${weeks} weeks reduces sprint compression.`);
      break;
    }
  }

  const simulated = computeOrgMetrics(simResources, simProjects);

  const capacityHoursDelta = simulated.availableCapacityHours - baseline.availableCapacityHours;
  const assignedHoursDelta = simulated.totalAssignedHours - baseline.totalAssignedHours;
  const utilizationDelta = simulated.avgUtilization - baseline.avgUtilization;
  const weeklyCostDelta = simulated.totalWeeklyCost - baseline.totalWeeklyCost;

  return {
    scenarioName: scenario.name,
    baselineMetrics: {
      totalCapacityHours: baseline.availableCapacityHours,
      totalAssignedHours: baseline.totalAssignedHours,
      avgUtilization: baseline.avgUtilization,
      totalWeeklyCost: baseline.totalWeeklyCost,
      atRiskProjectsCount: baseline.atRiskProjectsCount,
    },
    scenarioMetrics: {
      totalCapacityHours: simulated.availableCapacityHours,
      totalAssignedHours: simulated.totalAssignedHours,
      avgUtilization: simulated.avgUtilization,
      totalWeeklyCost: simulated.totalWeeklyCost,
      atRiskProjectsCount: simulated.atRiskProjectsCount,
    },
    deltas: {
      capacityHoursDelta,
      assignedHoursDelta,
      utilizationDelta,
      weeklyCostDelta,
      riskDelta: simulated.overallocatedCount < baseline.overallocatedCount ? "Reduced" : "Increased",
    },
    narrativeSummary: `Scenario "${scenario.name}" results in ${
      utilizationDelta < 0 ? `a ${Math.abs(utilizationDelta)}% reduction in capacity strain` : `a ${utilizationDelta}% increase in workload demand`
    }. Weekly cost impact: ${weeklyCostDelta >= 0 ? `+$${weeklyCostDelta}` : `-$${Math.abs(weeklyCostDelta)}`}.`,
    tradeoffs,
  };
}

// --------------------------------------------------------------------------
// Data Quality Evaluation Engine
// --------------------------------------------------------------------------

export function evaluateRawDataQuality(rows: any[], mapping: Record<string, string>): DataQualityReport {
  if (!rows || rows.length === 0) {
    return {
      overallScore: 0,
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      duplicateCount: 0,
      missingValuesCount: 0,
      invalidValuesCount: 0,
      totalRecords: 0,
      issues: [
        {
          severity: "error",
          field: "file",
          message: "Uploaded file contains no rows or unreadable records.",
        },
      ],
    };
  }

  const issues: DataQualityReport["issues"] = [];
  let missingValuesCount = 0;
  let invalidValuesCount = 0;
  const seenNames = new Set<string>();
  let duplicateCount = 0;

  const requiredFields = ["name", "role", "weeklyCapacityHours"];

  rows.forEach((row, idx) => {
    // Check required fields
    requiredFields.forEach((fieldKey) => {
      const sourceCol = Object.keys(mapping).find((key) => mapping[key] === fieldKey);
      const val = sourceCol ? row[sourceCol] : row[fieldKey];

      if (val === undefined || val === null || String(val).trim() === "") {
        missingValuesCount += 1;
        issues.push({
          severity: fieldKey === "name" ? "error" : "warning",
          field: fieldKey,
          message: `Row #${idx + 1} is missing required field "${fieldKey}".`,
          recordIndex: idx,
        });
      }
    });

    // Check duplicate names
    const nameCol = Object.keys(mapping).find((key) => mapping[key] === "name") || "name";
    const nameVal = String(row[nameCol] || "").trim().toLowerCase();
    if (nameVal) {
      if (seenNames.has(nameVal)) {
        duplicateCount += 1;
        issues.push({
          severity: "warning",
          field: "name",
          message: `Duplicate resource name "${row[nameCol]}" detected in row #${idx + 1}.`,
          recordIndex: idx,
        });
      } else {
        seenNames.add(nameVal);
      }
    }

    // Check numeric capacity validity
    const capCol = Object.keys(mapping).find((key) => mapping[key] === "weeklyCapacityHours") || "weeklyCapacityHours";
    const capVal = row[capCol];
    if (capVal !== undefined && capVal !== null && capVal !== "") {
      const num = Number(capVal);
      if (isNaN(num) || num < 0 || num > 168) {
        invalidValuesCount += 1;
        issues.push({
          severity: "error",
          field: "weeklyCapacityHours",
          message: `Row #${idx + 1} has invalid weekly capacity "${capVal}". Must be between 0 and 168 hours.`,
          recordIndex: idx,
        });
      }
    }
  });

  const totalCells = rows.length * Object.keys(mapping).length;
  const completeness = Math.max(0, Math.round(((totalCells - missingValuesCount) / (totalCells || 1)) * 100));
  const accuracy = Math.max(0, Math.round(((rows.length - invalidValuesCount) / (rows.length || 1)) * 100));
  const consistency = Math.max(0, Math.round(((rows.length - duplicateCount) / (rows.length || 1)) * 100));

  const overallScore = Math.max(20, Math.round(completeness * 0.4 + accuracy * 0.4 + consistency * 0.2));

  return {
    overallScore,
    completeness,
    accuracy,
    consistency,
    duplicateCount,
    missingValuesCount,
    invalidValuesCount,
    totalRecords: rows.length,
    issues,
  };
}

// ----------------------------------------------------
// PHYSICAL ASSETS & EQUIPMENT STORE (Section 5, 6, 7, 22)
// ----------------------------------------------------
export function loadInitialAssets(): AssetItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading assets:", e);
  }
  return [];
}

export function saveAssets(assets: AssetItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
  } catch (e) {
    console.error("Error saving assets:", e);
  }
}

// ----------------------------------------------------
// MATERIALS & INVENTORY STORE (Section 5, 6, 8, 9, 10, 14)
// ----------------------------------------------------
export function loadInitialInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading inventory:", e);
  }
  return [];
}

export function saveInventory(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  } catch (e) {
    console.error("Error saving inventory:", e);
  }
}

// ----------------------------------------------------
// UNIVERSAL SCHEDULE & CONFLICT DETECTION (Section 24)
// ----------------------------------------------------
export function loadInitialSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading schedule:", e);
  }
  return [];
}

export function saveSchedule(schedule: ScheduleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  } catch (e) {
    console.error("Error saving schedule:", e);
  }
}

export function detectScheduleConflicts(
  schedule: ScheduleItem[],
  resources: Resource[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Group by resource
  const byResource: Record<string, ScheduleItem[]> = {};
  schedule.forEach((item) => {
    if (!byResource[item.resourceId]) byResource[item.resourceId] = [];
    byResource[item.resourceId].push(item);
  });

  // 1. Double Booking & Time Overlaps
  Object.entries(byResource).forEach(([resId, items]) => {
    const res = resources.find((r) => r.id === resId);
    const resName = res?.name || items[0]?.resourceName || "Resource";

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];

        // Check if on same date or overlapping
        if (a.startTime.slice(0, 10) === b.startTime.slice(0, 10)) {
          conflicts.push({
            id: `CONF-${a.id}-${b.id}`,
            type: "double_booking",
            severity: "Critical",
            resourceId: resId,
            resourceName: resName,
            conflictingItemIds: [a.id, b.id],
            description: `Double booking detected: "${a.title}" and "${b.title}" overlap on ${a.startTime.slice(0, 10)}.`,
            recommendedResolution: `Reassign "${b.title}" to an available peer or reschedule to another window.`,
          });
        }
      }
    }

    // 2. Capacity Overload Conflict (>100% capacity)
    if (res && res.utilization > 100) {
      conflicts.push({
        id: `CAP-OVERLOAD-${res.id}`,
        type: "capacity_overload",
        severity: "Critical",
        resourceId: res.id,
        resourceName: res.name,
        conflictingItemIds: items.map((it) => it.id),
        description: `Capacity threshold exceeded: ${res.name} is allocated at ${res.utilization}% (${res.assignedHours}h / ${res.weeklyCapacityHours}h).`,
        recommendedResolution: `Split tasks or shift secondary deliverable to reduce workload to ≤ 85%.`,
      });
    }
  });

  return conflicts;
}

// ----------------------------------------------------
// CUSTOM RESOURCE TYPES STORE (Section 37)
// ----------------------------------------------------
export function loadCustomResourceTypes(): CustomResourceType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TYPES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading custom types:", e);
  }
  return [
    {
      id: "CRT-3DPRINTER",
      name: "3D Printer / Rapid Prototyper",
      category: "Equipment",
      unitOfMeasure: "Operating Hours",
      costUnit: "$/hour",
    },
    {
      id: "CRT-CLOUDCLUSTER",
      name: "GPU Compute Cluster",
      category: "Computing",
      unitOfMeasure: "Node Hours",
      costUnit: "$/node-hr",
    },
  ];
}

export function saveCustomResourceTypes(types: CustomResourceType[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TYPES, JSON.stringify(types));
  } catch (e) {
    console.error("Error saving custom types:", e);
  }
}

// ----------------------------------------------------
// CUSTOM METRICS & FORMULAS STORE (Section 38)
// ----------------------------------------------------
export function loadCustomMetrics(): CustomMetric[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_METRICS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error loading custom metrics:", e);
  }
  return [
    {
      id: "CM-OEE",
      name: "Overall Equipment Efficiency (OEE)",
      formula: "Availability × Performance × Quality",
      description: "Standard industrial efficiency formula tracking availability and defect-free line throughput.",
      targetValue: 85,
      unit: "%",
      category: "Production",
    },
    {
      id: "CM-SUPPORT-EFF",
      name: "Support Capacity Velocity",
      formula: "Resolved Deliverables / Total Scheduled Hours",
      description: "Tracks throughput velocity across allocated member hours.",
      targetValue: 1.2,
      unit: "deliverables/hr",
      category: "Operations",
    },
  ];
}

export function saveCustomMetrics(metrics: CustomMetric[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_METRICS, JSON.stringify(metrics));
  } catch (e) {
    console.error("Error saving custom metrics:", e);
  }
}

// ----------------------------------------------------
// ORGANIZATION SECTOR & MODULE CONFIG STORE (Section 2)
// ----------------------------------------------------
export function loadSectorConfig(): OrganizationSectorConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SECTOR_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.selectedSectorIds)) return parsed;
    }
  } catch (e) {
    console.error("Error loading sector config:", e);
  }
  return {
    selectedSectorIds: ["it_software"],
    primarySector: "it_software",
    enabledModules: {
      schedule: true,
      assets: true,
      inventory: true,
      predictiveMaintenance: true,
      shiftManagement: true,
      siteAllocation: true,
      workload: true,
      analytics: true,
      forecasting: true,
      scenarios: true,
      pulseAI: true,
    },
  };
}

export function isSectorLocked(): boolean {
  try {
    return localStorage.getItem("resourcepulse_sector_locked") === "true";
  } catch {
    return false;
  }
}

export function lockSectorConfig(sectorId: string, sectorName: string): void {
  try {
    localStorage.setItem("resourcepulse_sector_locked", "true");
    localStorage.setItem("resourcepulse_selected_field", sectorName);
    localStorage.setItem("resourcepulse_primary_sector_id", sectorId);
  } catch (e) {
    console.error("Error locking sector config:", e);
  }
}

export function saveSectorConfig(config: OrganizationSectorConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SECTOR_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error("Error saving sector config:", e);
  }
}

// ----------------------------------------------------
// ROLE MANAGEMENT STORE (Section 33)
// ----------------------------------------------------
export function loadOrganizationRoles(): Array<{
  role: UserRole;
  description: string;
  permissions: string[];
}> {
  return [
    {
      role: "Super Admin",
      description: "Platform-level administration across all organizational partitions and security policies.",
      permissions: ["*"],
    },
    {
      role: "Organization Admin",
      description: "Organization configuration, module enablement, sector settings, and member access.",
      permissions: ["org.configure", "roles.manage", "data.import", "modules.toggle", "audit.view"],
    },
    {
      role: "Resource Manager",
      description: "Resource allocation, capacity planning, schedule balancing, and conflict resolution.",
      permissions: ["resources.create", "resources.edit", "allocation.assign", "schedule.manage"],
    },
    {
      role: "Project Manager",
      description: "Project management, milestone delivery, deliverable tracking, and budget control.",
      permissions: ["projects.create", "projects.edit", "tasks.assign", "milestones.update"],
    },
    {
      role: "Analyst",
      description: "Analytics, forecasting, simulations, custom KPI formulation, and report exports.",
      permissions: ["analytics.view", "forecasting.run", "reports.export", "metrics.create"],
    },
    {
      role: "Employee/User",
      description: "View own resource allocation, assigned deliverables, schedule calendar, and team chat.",
      permissions: ["self.view", "schedule.view", "tasks.update_status", "chat.send"],
    },
    {
      role: "Viewer",
      description: "Read-only access to organizational telemetry and published reports.",
      permissions: ["reports.view", "dashboard.view"],
    },
  ];
}
