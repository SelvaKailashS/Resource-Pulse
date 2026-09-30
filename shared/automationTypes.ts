// Universal Event, Rule, and Automation Models for ResourcePulse
// Fully sector-agnostic supporting all 21+ industries and custom sectors.

export type EventSeverity = "critical" | "high" | "medium" | "low" | "info";

export type UniversalResourceKind =
  | "person"
  | "machine"
  | "vehicle"
  | "equipment"
  | "inventory item"
  | "material"
  | "facility"
  | "room"
  | "budget"
  | "project"
  | "task"
  | "energy source"
  | "production line"
  | "shipment"
  | "appointment"
  | "asset"
  | "software"
  | "custom resource"
  | string;

export type UniversalEventType =
  | "deadline_approaching"
  | "deadline_risk"
  | "deadline_missed"
  | "project_delayed"
  | "task_overdue"
  | "resource_overloaded"
  | "resource_underutilized"
  | "resource_unavailable"
  | "resource_failure"
  | "machine_failure"
  | "equipment_failure"
  | "vehicle_failure"
  | "maintenance_due"
  | "maintenance_overdue"
  | "inventory_low"
  | "inventory_critical"
  | "budget_threshold"
  | "budget_exceeded"
  | "capacity_threshold"
  | "schedule_conflict"
  | "staff_unavailable"
  | "employee_absence"
  | "shipment_delayed"
  | "delivery_risk"
  | "appointment_change"
  | "production_delay"
  | "production_failure"
  | "quality_anomaly"
  | "energy_spike"
  | "unusual_activity"
  | "ai_anomaly"
  | "forecast_risk"
  | "security_alert"
  | "custom_event"
  | string;

export interface EventResourceTarget {
  type: UniversalResourceKind;
  id: string;
  name: string;
  location?: string;
  category?: string;
}

export interface EventTriggerMetadata {
  metric: string;
  operator: "<" | "<=" | ">" | ">=" | "==" | "!=" | "equals" | "contains";
  threshold: number | string;
  actualValue: number | string;
}

export interface EventRecipient {
  name: string;
  email: string;
  role?: string;
  phone?: string;
}

export interface EventAIAnalysis {
  analysis: string;
  recommendation: string;
  confidence: number; // 0.0 to 1.0
  impact?: string;
  finding?: string;
  evidence?: string;
}

export interface AutomationEvent {
  eventId: string;
  organizationId: string;
  eventType: UniversalEventType;
  severity: EventSeverity;
  sector: string;
  resource: EventResourceTarget;
  title: string;
  description: string;
  trigger?: EventTriggerMetadata;
  recipient?: EventRecipient;
  data?: Record<string, any>;
  ai?: EventAIAnalysis;
  source: string;
  timestamp: string; // ISO-8601
  deduplicationKey?: string;
  testEvent?: boolean;
}

// Rule Model
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "in";

export interface RuleCondition {
  field: string; // e.g. "severity", "trigger.actualValue", "data.daysRemaining", "data.progress", "sector", "resource.type"
  operator: ConditionOperator;
  value: any;
}

export type ActionType =
  | "make_webhook"
  | "email"
  | "dashboard_alert"
  | "ai_analyze"
  | "create_task"
  | "request_approval";

export interface RuleAction {
  type: ActionType;
  target?: string;
  params?: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  sector?: string; // sector filter, or "*" for all
  trigger: {
    eventType: UniversalEventType;
  };
  conditionLogic?: "AND" | "OR";
  conditions: RuleCondition[];
  actions: RuleAction[];
  cooldownMinutes: number;
  recipient?: EventRecipient;
  requiresApproval?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type DeliveryStatus =
  | "delivered"
  | "failed"
  | "pending_retry"
  | "permanently_failed"
  | "suppressed_cooldown"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "simulated";

export interface AutomationLog {
  id: string;
  eventId: string;
  ruleId?: string;
  ruleName?: string;
  eventType: string;
  severity: EventSeverity;
  sector: string;
  resourceName: string;
  resourceType: string;
  title: string;
  recipientName?: string;
  recipientEmail?: string;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  makeStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  timestamp: string;
  eventPayload: AutomationEvent;
  testEvent?: boolean;
  approvalStatus?: {
    required: boolean;
    state: "pending" | "approved" | "rejected";
    actionBy?: string;
    actionAt?: string;
    notes?: string;
  };
}

export interface AutomationStats {
  activeAutomations: number;
  eventsToday: number;
  emailsSent: number;
  criticalAlerts: number;
  failedAutomations: number;
  pendingApprovals: number;
  webhookConfigured: boolean;
  webhookEndpointMasked?: string;
}
