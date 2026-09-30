export type EmploymentType = "Full-Time" | "Part-Time" | "Contractor" | "Intern";

export type ResourceStatus = "Available" | "Allocated" | "Overallocated" | "On Leave" | "Maintenance" | "Reserved" | "Retired";

export type ResourceType =
  | "People"
  | "Equipment"
  | "Machine"
  | "Vehicle"
  | "Material"
  | "Facility"
  | "Budget"
  | "Software"
  | "Custom";

export type ResourceLifecycleStatus =
  | "Created"
  | "Available"
  | "Assigned"
  | "In Use"
  | "Unavailable"
  | "Maintenance"
  | "Reserved"
  | "Retired"
  | "Archived";

export type ProjectPriority = "Critical" | "High" | "Medium" | "Low";

export type ProjectStatus = "Planning" | "In Progress" | "At Risk" | "Completed" | "On Hold";

export interface Resource {
  id: string;
  name: string;
  type?: ResourceType;
  category?: string;
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
  lifecycleStatus?: ResourceLifecycleStatus;
  weeklyCapacityHours: number;
  assignedHours: number;
  utilization: number; // percentage (assigned / weeklyCapacity) * 100
  costPerHour: number;
  currentProjects: string[];
  assignedWork?: string[];
  owner?: string;
  futureAvailability?: string;
  maintenanceStatus?: {
    lastMaintained?: string;
    nextMaintenanceDue?: string;
    operatingHours?: number;
    failureCount?: number;
    healthScore?: number;
  };
  notes?: string;
  customFields?: Record<string, any>;
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

export type UserRole =
  | "Super Admin"
  | "Organization Admin"
  | "Resource Manager"
  | "Project Manager"
  | "Analyst"
  | "Employee/User"
  | "Viewer";

export interface CustomResourceType {
  id: string;
  name: string;
  category: string;
  icon?: string;
  unitOfMeasure: string; // e.g. "Hours", "Units", "Licenses", "Miles"
  costUnit: string; // e.g. "$/hr", "$/unit", "$/month"
  customFields?: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "date";
    required?: boolean;
  }>;
}

export interface CustomMetric {
  id: string;
  name: string;
  formula: string; // e.g. "Production Output / Available Production Capacity"
  description: string;
  targetValue?: number;
  unit?: string;
  category?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  type: "Machine" | "Equipment" | "Vehicle" | "Facility" | "Server" | "Tool" | "Hardware";
  category: string;
  serialNumber?: string;
  location: string;
  status: "In Use" | "Available" | "Maintenance" | "Reserved" | "Retired";
  operatingHours: number;
  maxHours?: number;
  healthScore: number; // 0-100%
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  assignedProjectId?: string;
  assignedOperatorId?: string;
  costPerHour: number;
  oee?: number; // Overall Equipment Effectiveness %
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "Raw Material" | "Consumable" | "Spare Part" | "Fuel" | "Chemical" | "Supplies" | "Equipment";
  currentStock: number;
  minimumThreshold: number;
  unit: string; // "kg", "tons", "liters", "units", "meters"
  unitCost: number;
  location: string;
  reorderStatus: "Normal" | "Low Stock" | "Critical" | "Reordered";
  consumptionRatePerWeek: number;
  projectedStockoutDays: number;
  assignedProjectId?: string;
  notes?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  resourceId: string;
  resourceName: string;
  projectId?: string;
  projectName?: string;
  startTime: string; // YYYY-MM-DD or ISO
  endTime: string;
  type: "Task" | "Shift" | "Maintenance" | "Milestone" | "Meeting" | "Time Off";
  status: "Confirmed" | "Tentative" | "Conflict";
  location?: string;
  hours?: number;
}

export interface ScheduleConflict {
  id: string;
  type: "double_booking" | "capacity_overload" | "leave_overlap" | "maintenance_window";
  severity: "Critical" | "Warning";
  resourceId: string;
  resourceName: string;
  conflictingItemIds: string[];
  description: string;
  recommendedResolution: string;
}

export interface OrganizationSectorConfig {
  selectedSectorIds: string[];
  customIndustryName?: string;
  primarySector: string;
  enabledModules: {
    schedule: boolean;
    assets: boolean;
    inventory: boolean;
    predictiveMaintenance: boolean;
    shiftManagement: boolean;
    siteAllocation: boolean;
    workload: boolean;
    analytics: boolean;
    forecasting: boolean;
    scenarios: boolean;
    pulseAI: boolean;
  };
}

export * from "./automationTypes";
