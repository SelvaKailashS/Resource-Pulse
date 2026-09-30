export type EmploymentType = "Full-Time" | "Part-Time" | "Contractor" | "Intern";

export type ResourceStatus = "Available" | "Allocated" | "Overallocated" | "On Leave";

export type ProjectPriority = "Critical" | "High" | "Medium" | "Low";

export type ProjectStatus = "Planning" | "In Progress" | "At Risk" | "Completed" | "On Hold";

export interface Resource {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department: string;
  team?: string;
  skills: string[];
  experienceYears?: number;
  location?: string;
  employmentType: EmploymentType;
  status: ResourceStatus;
  weeklyCapacityHours: number;
  assignedHours: number;
  utilization: number; // percentage (assigned / weeklyCapacity) * 100
  costPerHour: number;
  currentProjects: string[];
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  department: string;
  startDate: string;
  endDate: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  budget: number;
  allocatedBudget?: number;
  actualExpenditure: number;
  requiredSkills: string[];
  requiredHours: number;
  assignedHours: number;
  assignedResourceIds: string[];
  description?: string;
  milestones?: Array<{
    id: string;
    title: string;
    dueDate: string;
    completed: boolean;
  }>;
}

export interface Assignment {
  id: string;
  resourceId: string;
  projectId: string;
  assignedHours: number;
  startDate: string;
  endDate: string;
  role?: string;
  allocationPercentage?: number;
  status?: string;
}

export interface ThresholdSettings {
  warningUtilization: number; // default: 85%
  criticalUtilization: number; // default: 100%
  underutilizedThreshold: number; // default: 50%
  standardWeeklyHours: number; // default: 40h
  currency: string; // default: '$'
}

export interface DataQualityIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  recordId?: string;
  recordIndex?: number;
  suggestedFix?: string;
}

export interface DataQualityReport {
  overallScore: number; // 0 - 100%
  completeness: number; // % of required fields present
  completenessScore?: number;
  accuracy: number; // % of valid formats/values
  accuracyScore?: number;
  consistency: number; // % without conflicting types
  duplicateCount: number;
  missingValuesCount: number;
  invalidValuesCount: number;
  totalRecords: number;
  validRowsCount?: number;
  issues: DataQualityIssue[];
}

export interface AllocationMatchResult {
  resourceId: string;
  resourceName: string;
  projectId: string;
  projectName: string;
  skillMatchScore: number; // 0-100%
  matchedSkills: string[];
  missingSkills: string[];
  availabilityScore: number; // 0-100%
  capacityScore: number; // 0-100%
  overallCompatibility: number; // weighted 0-100%
  overallScore: number; // alias
  availableHours: number;
  remainingCapacity?: number;
  recommended: boolean;
  reasoning: string;
  explanation?: string;
}

export interface AIInsightItem {
  id: string;
  category: "workforce" | "project" | "trend" | "risk" | string;
  title: string;
  headline?: string;
  evidence: string;
  impact: string;
  recommendation: string;
  confidence: number; // 0-100%
  confidenceScore?: number;
  severity: "critical" | "warning" | "opportunity" | "info" | "High" | "Medium" | "Low";
  relatedEntityId?: string;
  relatedEntityType?: "resource" | "project" | "department";
}

export interface ForecastPoint {
  date: string;
  label: string;
  actualCapacity?: number;
  actualDemand?: number;
  actualUtilization?: number;
  forecastCapacity: number;
  availableCapacityHours?: number; // alias
  forecastDemand: number;
  demandHours?: number; // alias
  forecastUtilization: number;
  lowerConfidenceBound: number;
  upperConfidenceBound: number;
  confidence?: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  type: "add_headcount" | "shift_deadline" | "resource_absence" | "new_project";
  params: {
    headcountDelta?: number;
    headcountRole?: string;
    targetProjectId?: string;
    weeksShift?: number;
    absentResourceId?: string;
    absenceDays?: number;
    newProjectHours?: number;
    newProjectPriority?: ProjectPriority;
  };
}

export interface ScenarioImpactResult {
  scenarioName: string;
  baselineMetrics: {
    totalCapacityHours: number;
    totalAssignedHours: number;
    avgUtilization: number;
    totalWeeklyCost: number;
    atRiskProjectsCount: number;
  };
  scenarioMetrics: {
    totalCapacityHours: number;
    totalAssignedHours: number;
    avgUtilization: number;
    totalWeeklyCost: number;
    atRiskProjectsCount: number;
  };
  deltas: {
    capacityHoursDelta: number;
    assignedHoursDelta: number;
    utilizationDelta: number;
    weeklyCostDelta: number;
    riskDelta: string;
  };
  narrativeSummary: string;
  tradeoffs: string[];
}
