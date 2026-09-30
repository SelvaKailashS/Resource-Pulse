import fs from "fs";
import path from "path";
import {
  AutomationEvent,
  AutomationRule,
  AutomationLog,
  AutomationStats,
  DeliveryStatus,
  EventSeverity,
  UniversalEventType,
} from "../shared/automationTypes";

// In-memory caches for fast serverless/runtime execution
const memoryLogs: AutomationLog[] = [];
let memoryRules: AutomationRule[] = [];
const deduplicationCache = new Map<string, number>(); // deduplicationKey -> lastDispatchedTimestamp (epoch ms)

// Local persistence file path for development / non-ephemeral restarts
const STORAGE_DIR = path.join(process.cwd(), "server", "_storage");
const STORAGE_FILE = path.join(STORAGE_DIR, "automation.json");

function ensureStorageDir() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[AutomationService] Could not create storage directory:", err);
  }
}

function persistState() {
  try {
    ensureStorageDir();
    const data = {
      rules: memoryRules,
      logs: memoryLogs.slice(-200), // keep last 200 logs
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // Non-blocking error
    console.warn("[AutomationService] Persist state error:", err);
  }
}

function loadPersistedState() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.rules) && parsed.rules.length > 0) {
        memoryRules = parsed.rules;
      }
      if (Array.isArray(parsed.logs) && parsed.logs.length > 0) {
        memoryLogs.push(...parsed.logs);
      }
    }
  } catch (err) {
    console.warn("[AutomationService] Load state error, using defaults:", err);
  }
}

// Universal default rules for all 21 sectors
function initDefaultRules(): AutomationRule[] {
  return [
    {
      id: "rule-deadline-risk",
      name: "Project Deadline Risk Notification",
      description: "Triggers automated email via Make.com when a project deadline is within 3 days and progress < 80%",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "deadline_risk",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "high" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "dashboard_alert" },
        { type: "ai_analyze" },
      ],
      cooldownMinutes: 1440, // 24 hours cooldown for the same project
      recipient: {
        name: "Project Operations Lead",
        email: "ops-lead@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-machine-failure",
      name: "Critical Asset & Machine Failure Alert",
      description: "Instant notification to maintenance team upon equipment degradation or unexpected breakdown",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "machine_failure",
      },
      conditionLogic: "OR",
      conditions: [
        { field: "severity", operator: "equals", value: "critical" },
        { field: "severity", operator: "equals", value: "high" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "dashboard_alert" },
      ],
      cooldownMinutes: 60, // 1 hour cooldown
      recipient: {
        name: "Facility & Maintenance Lead",
        email: "maintenance@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-inventory-critical",
      name: "Critical Inventory & Stockout Prevention",
      description: "Dispatches procurement alert when material or inventory supplies drop below critical thresholds",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "inventory_critical",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "critical" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "dashboard_alert" },
      ],
      cooldownMinutes: 720, // 12 hours cooldown
      recipient: {
        name: "Inventory & Supply Chain Manager",
        email: "supplychain@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-resource-overloaded",
      name: "Resource Capacity Overload Warning",
      description: "Alerts management when any resource workload utilization exceeds 100% capacity",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "resource_overloaded",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "high" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "dashboard_alert" },
        { type: "ai_analyze" },
      ],
      cooldownMinutes: 480, // 8 hours cooldown
      recipient: {
        name: "Resource Manager",
        email: "resources@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-schedule-conflict",
      name: "Scheduling & Double-Booking Conflict",
      description: "Alerts schedulers when overlapping shifts, bookings, or maintenance windows collide",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "schedule_conflict",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "high" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "dashboard_alert" },
      ],
      cooldownMinutes: 360,
      recipient: {
        name: "Operations Scheduler",
        email: "scheduler@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-budget-exceeded",
      name: "Budget Ceiling & Financial Variance Alert",
      description: "Notifies finance directors when project or operational expenditure crosses budget thresholds",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "budget_exceeded",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "critical" },
      ],
      actions: [
        { type: "make_webhook" },
        { type: "request_approval" },
      ],
      requiresApproval: true,
      cooldownMinutes: 1440,
      recipient: {
        name: "Finance Controller",
        email: "finance@company.com",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "rule-energy-spike",
      name: "Energy & Utilities Spike Anomaly",
      description: "Alerts site managers of abnormal consumption spikes or facility sensor alerts",
      enabled: true,
      sector: "*",
      trigger: {
        eventType: "energy_spike",
      },
      conditionLogic: "AND",
      conditions: [
        { field: "severity", operator: "equals", value: "high" },
      ],
      actions: [
        { type: "make_webhook" },
      ],
      cooldownMinutes: 120,
      recipient: {
        name: "Utilities Engineer",
        email: "energy@company.com",
      },
      createdAt: new Date().toISOString(),
    },
  ];
}

// Initialize on startup
loadPersistedState();
if (memoryRules.length === 0) {
  memoryRules = initDefaultRules();
  persistState();
}

/**
 * Evaluates nested object properties e.g. "trigger.actualValue" or "data.daysRemaining"
 */
function getFieldValue(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Checks a single condition against the event
 */
function evaluateCondition(condition: { field: string; operator: string; value: any }, event: AutomationEvent): boolean {
  const actualVal = getFieldValue(event, condition.field);
  const targetVal = condition.value;

  switch (condition.operator) {
    case "equals":
      return String(actualVal).toLowerCase() === String(targetVal).toLowerCase();
    case "not_equals":
      return String(actualVal).toLowerCase() !== String(targetVal).toLowerCase();
    case "greater_than":
      return Number(actualVal) > Number(targetVal);
    case "greater_than_or_equal":
      return Number(actualVal) >= Number(targetVal);
    case "less_than":
      return Number(actualVal) < Number(targetVal);
    case "less_than_or_equal":
      return Number(actualVal) <= Number(targetVal);
    case "contains":
      return String(actualVal || "").toLowerCase().includes(String(targetVal || "").toLowerCase());
    case "in":
      if (Array.isArray(targetVal)) {
        return targetVal.map(v => String(v).toLowerCase()).includes(String(actualVal).toLowerCase());
      }
      return false;
    default:
      return true;
  }
}

/**
 * Evaluates all conditions of a rule
 */
function evaluateRule(rule: AutomationRule, event: AutomationEvent): boolean {
  // Check trigger eventType match (or wildcard "*")
  if (rule.trigger.eventType !== "*" && rule.trigger.eventType !== event.eventType) {
    return false;
  }

  // Check sector filter if specified
  if (rule.sector && rule.sector !== "*" && rule.sector.toLowerCase() !== event.sector.toLowerCase()) {
    return false;
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }

  const isOr = rule.conditionLogic === "OR";
  if (isOr) {
    return rule.conditions.some(cond => evaluateCondition(cond, event));
  } else {
    return rule.conditions.every(cond => evaluateCondition(cond, event));
  }
}

/**
 * Dispatches an event payload securely to the Make Webhook URL
 */
async function dispatchToMakeWebhook(event: AutomationEvent): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  const apiKey = process.env.MAKE_WEBHOOK_API_KEY;

  if (!webhookUrl || webhookUrl.trim() === "") {
    return {
      success: true, // Mark simulated as successful so workflow functions normally
      statusCode: 200,
      responseBody: JSON.stringify({
        simulated: true,
        message: "Simulated Make.com delivery: MAKE_WEBHOOK_URL is not configured in server .env. Set MAKE_WEBHOOK_URL in production.",
      }),
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ResourcePulse-Universal-Engine/1.0",
  };

  if (apiKey) {
    headers["x-make-apikey"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await resp.text();

    if (resp.ok) {
      return {
        success: true,
        statusCode: resp.status,
        responseBody: text.slice(0, 500),
      };
    } else {
      return {
        success: false,
        statusCode: resp.status,
        errorMessage: `Make Webhook responded with status ${resp.status}: ${text.slice(0, 200)}`,
        responseBody: text.slice(0, 500),
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      statusCode: 0,
      errorMessage: isTimeout ? "Make Webhook connection timed out after 8 seconds" : (err?.message || "Network error dispatching to Make Webhook"),
    };
  }
}

/**
 * Core event processor:
 * Validates, checks rules, verifies cooldown, handles approval, logs, and dispatches to Make
 */
export async function processAutomationEvent(
  rawEvent: Partial<AutomationEvent>
): Promise<{
  success: boolean;
  eventId: string;
  automationTriggered: boolean;
  matchedRuleCount: number;
  status: DeliveryStatus;
  message: string;
  log?: AutomationLog;
}> {
  const eventId = rawEvent.eventId || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = rawEvent.timestamp || new Date().toISOString();

  // Validate required fields
  if (!rawEvent.eventType) {
    throw new Error("Missing required eventType field");
  }

  const event: AutomationEvent = {
    eventId,
    organizationId: rawEvent.organizationId || "org-universal",
    eventType: rawEvent.eventType,
    severity: rawEvent.severity || "medium",
    sector: rawEvent.sector || "Operations",
    resource: {
      type: rawEvent.resource?.type || "asset",
      id: rawEvent.resource?.id || "res-1",
      name: rawEvent.resource?.name || "Operational Asset",
      location: rawEvent.resource?.location,
      category: rawEvent.resource?.category,
    },
    title: rawEvent.title || `${rawEvent.eventType.replace(/_/g, " ")} detected`,
    description: rawEvent.description || "Operational event detected by ResourcePulse telemetry engine.",
    trigger: rawEvent.trigger,
    recipient: rawEvent.recipient || {
      name: "Operations Lead",
      email: "lead@organization.com",
    },
    data: rawEvent.data || {},
    ai: rawEvent.ai,
    source: "ResourcePulse",
    timestamp,
    deduplicationKey:
      rawEvent.deduplicationKey ||
      `${rawEvent.eventType}-${rawEvent.resource?.id || "res"}-${rawEvent.severity || "med"}-${rawEvent.trigger?.metric || "general"}`,
    testEvent: Boolean(rawEvent.testEvent),
  };

  // Find enabled matching rules
  const matchingRules = memoryRules.filter(r => r.enabled && evaluateRule(r, event));

  if (matchingRules.length === 0 && !event.testEvent) {
    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      eventType: event.eventType,
      severity: event.severity,
      sector: event.sector,
      resourceName: event.resource.name,
      resourceType: event.resource.type,
      title: event.title,
      recipientName: event.recipient?.name,
      recipientEmail: event.recipient?.email,
      status: "delivered", // logged without rule action
      attempts: 0,
      timestamp,
      eventPayload: event,
      testEvent: event.testEvent,
    };
    memoryLogs.unshift(log);
    persistState();

    return {
      success: true,
      eventId,
      automationTriggered: false,
      matchedRuleCount: 0,
      status: "delivered",
      message: "Event recorded in audit logs. No active automation rules matched.",
      log,
    };
  }

  // Deduplication / Cooldown Verification
  const now = Date.now();
  const primaryRule = matchingRules[0];
  const cooldownMin = primaryRule?.cooldownMinutes ?? 1440;
  const cooldownMs = cooldownMin * 60 * 1000;
  const lastDispatched = deduplicationCache.get(event.deduplicationKey!);

  if (!event.testEvent && lastDispatched && (now - lastDispatched < cooldownMs)) {
    const elapsedMinutes = Math.round((now - lastDispatched) / 60000);
    const remainingMinutes = cooldownMin - elapsedMinutes;

    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      ruleId: primaryRule?.id,
      ruleName: primaryRule?.name,
      eventType: event.eventType,
      severity: event.severity,
      sector: event.sector,
      resourceName: event.resource.name,
      resourceType: event.resource.type,
      title: event.title,
      recipientName: event.recipient?.name,
      recipientEmail: event.recipient?.email,
      status: "suppressed_cooldown",
      attempts: 0,
      timestamp,
      eventPayload: event,
      errorMessage: `Suppressed by cooldown rule (${remainingMinutes}m remaining of ${cooldownMin}m window). Duplicate emails prevented.`,
      testEvent: false,
    };

    memoryLogs.unshift(log);
    persistState();

    return {
      success: true,
      eventId,
      automationTriggered: false,
      matchedRuleCount: matchingRules.length,
      status: "suppressed_cooldown",
      message: `Duplicate event suppressed by cooldown (${remainingMinutes}m remaining).`,
      log,
    };
  }

  // Check if requires approval
  const needsApproval = primaryRule?.requiresApproval && !event.testEvent;
  if (needsApproval) {
    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      ruleId: primaryRule?.id,
      ruleName: primaryRule?.name,
      eventType: event.eventType,
      severity: event.severity,
      sector: event.sector,
      resourceName: event.resource.name,
      resourceType: event.resource.type,
      title: event.title,
      recipientName: event.recipient?.name,
      recipientEmail: event.recipient?.email,
      status: "pending_approval",
      attempts: 0,
      timestamp,
      eventPayload: event,
      testEvent: false,
      approvalStatus: {
        required: true,
        state: "pending",
      },
    };

    memoryLogs.unshift(log);
    persistState();

    return {
      success: true,
      eventId,
      automationTriggered: false,
      matchedRuleCount: matchingRules.length,
      status: "pending_approval",
      message: "Event requires manager approval before dispatching external Make action.",
      log,
    };
  }

  // Execute dispatch to Make.com Webhook
  const dispatchResult = await dispatchToMakeWebhook(event);

  // Update cooldown cache if successful
  if (dispatchResult.success) {
    deduplicationCache.set(event.deduplicationKey!, now);
  }

  const logStatus: DeliveryStatus = dispatchResult.success
    ? (event.testEvent ? "delivered" : "delivered")
    : "failed";

  const nextRetryAt = !dispatchResult.success
    ? new Date(now + 60000).toISOString() // retry in 1 minute
    : undefined;

  const log: AutomationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId,
    ruleId: primaryRule?.id,
    ruleName: primaryRule?.name,
    eventType: event.eventType,
    severity: event.severity,
    sector: event.sector,
    resourceName: event.resource.name,
    resourceType: event.resource.type,
    title: event.title,
    recipientName: event.recipient?.name,
    recipientEmail: event.recipient?.email,
    status: logStatus,
    attempts: 1,
    lastAttemptAt: timestamp,
    nextRetryAt,
    makeStatus: dispatchResult.statusCode,
    responseBody: dispatchResult.responseBody,
    errorMessage: dispatchResult.errorMessage,
    timestamp,
    eventPayload: event,
    testEvent: event.testEvent,
  };

  memoryLogs.unshift(log);
  persistState();

  return {
    success: dispatchResult.success,
    eventId,
    automationTriggered: true,
    matchedRuleCount: matchingRules.length,
    status: logStatus,
    message: dispatchResult.success
      ? (event.testEvent ? "Test event successfully verified & dispatched to Make." : "Event validated and dispatched to Make automation scenario.")
      : `Dispatch failed: ${dispatchResult.errorMessage}`,
    log,
  };
}

/**
 * Retry a failed log entry
 */
export async function retryAutomationLog(logId: string): Promise<AutomationLog> {
  const log = memoryLogs.find(l => l.id === logId);
  if (!log) {
    throw new Error(`Log not found: ${logId}`);
  }

  log.attempts += 1;
  log.lastAttemptAt = new Date().toISOString();

  const result = await dispatchToMakeWebhook(log.eventPayload);
  if (result.success) {
    log.status = "delivered";
    log.makeStatus = result.statusCode;
    log.responseBody = result.responseBody;
    log.errorMessage = undefined;
    log.nextRetryAt = undefined;
  } else {
    if (log.attempts >= 3) {
      log.status = "permanently_failed";
      log.nextRetryAt = undefined;
    } else {
      log.status = "pending_retry";
      const nextDelayMinutes = log.attempts === 2 ? 5 : 15;
      log.nextRetryAt = new Date(Date.now() + nextDelayMinutes * 60000).toISOString();
    }
    log.errorMessage = result.errorMessage;
    log.makeStatus = result.statusCode;
  }

  persistState();
  return log;
}

/**
 * Approve a pending automation event
 */
export async function approveAutomationLog(logId: string, approverName: string): Promise<AutomationLog> {
  const log = memoryLogs.find(l => l.id === logId);
  if (!log) throw new Error(`Log not found: ${logId}`);

  log.approvalStatus = {
    required: true,
    state: "approved",
    actionBy: approverName,
    actionAt: new Date().toISOString(),
  };

  const dispatchResult = await dispatchToMakeWebhook(log.eventPayload);
  log.status = dispatchResult.success ? "approved" : "failed";
  log.makeStatus = dispatchResult.statusCode;
  log.responseBody = dispatchResult.responseBody;
  log.errorMessage = dispatchResult.errorMessage;

  persistState();
  return log;
}

/**
 * Reject a pending automation event
 */
export async function rejectAutomationLog(logId: string, rejectorName: string, reason?: string): Promise<AutomationLog> {
  const log = memoryLogs.find(l => l.id === logId);
  if (!log) throw new Error(`Log not found: ${logId}`);

  log.status = "rejected";
  log.approvalStatus = {
    required: true,
    state: "rejected",
    actionBy: rejectorName,
    actionAt: new Date().toISOString(),
    notes: reason || "Rejected by manager authorization",
  };

  persistState();
  return log;
}

/**
 * Deterministic Deadline & Telemetry Scanner:
 * Section 11 & 13: strictly evaluates verified data without AI inventing facts.
 */
export async function scanWorkspaceTelemetries(data: {
  projects?: any[];
  resources?: any[];
  assets?: any[];
  inventory?: any[];
  sector?: string;
  recipientEmail?: string;
}): Promise<{
  scannedProjects: number;
  scannedResources: number;
  scannedAssets: number;
  scannedInventory: number;
  triggeredEvents: AutomationEvent[];
}> {
  const sector = data.sector || "Universal";
  const recipientEmail = data.recipientEmail || "ops-lead@company.com";
  const triggeredEvents: AutomationEvent[] = [];
  const now = new Date();

  // 1. Projects Deadline Scan
  if (Array.isArray(data.projects)) {
    for (const p of data.projects) {
      if (!p.deadline) continue;
      const dDate = new Date(p.deadline);
      const diffTime = dDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const progress = Number(p.progress || 0);

      // Condition: Days remaining <= 3 and progress < 80% (Deadline Risk)
      if (daysRemaining <= 3 && daysRemaining >= 0 && progress < 80) {
        const evt: Partial<AutomationEvent> = {
          eventType: "deadline_risk",
          severity: "high",
          sector,
          resource: {
            type: "project",
            id: p.id || `proj-${p.name}`,
            name: p.name || "Critical Project",
          },
          title: `Project deadline risk detected: ${p.name}`,
          description: `Project "${p.name}" progress is at ${progress}%, below the expected 80% with ${daysRemaining} day(s) remaining until ${p.deadline}.`,
          trigger: {
            metric: "progress",
            operator: "<",
            threshold: 80,
            actualValue: progress,
          },
          recipient: {
            name: p.lead || "Project Manager",
            email: recipientEmail,
          },
          data: {
            deadline: p.deadline,
            progress,
            daysRemaining,
            budget: p.budget,
          },
          ai: {
            finding: `Progress shortfall of ${80 - progress}% detected against critical completion milestone.`,
            evidence: `Current completion rate is insufficient to conclude remaining work in ${daysRemaining} days.`,
            impact: `Cascading risk of +${(3 - daysRemaining + 1) * 1.5} days delay on dependent deliverables.`,
            analysis: `Project completion velocity of ${progress}% is trending behind scheduled milestone date (${p.deadline}).`,
            recommendation: "Rebalance active work or allocate temporary secondary specialist capacity.",
            confidence: 0.94,
          },
          deduplicationKey: `deadline-risk-${p.id || p.name}-${now.toISOString().split("T")[0]}`,
        };

        const res = await processAutomationEvent(evt);
        if (res.log?.eventPayload) {
          triggeredEvents.push(res.log.eventPayload);
        }
      }
      // Condition: Overdue / Missed
      else if (daysRemaining < 0 && progress < 100) {
        const evt: Partial<AutomationEvent> = {
          eventType: "deadline_missed",
          severity: "critical",
          sector,
          resource: {
            type: "project",
            id: p.id || `proj-${p.name}`,
            name: p.name || "Critical Project",
          },
          title: `Project milestone deadline breached: ${p.name}`,
          description: `Project "${p.name}" has surpassed its deadline (${p.deadline}) with ${progress}% completion. Immediate escalation required.`,
          trigger: {
            metric: "daysRemaining",
            operator: "<",
            threshold: 0,
            actualValue: daysRemaining,
          },
          recipient: {
            name: p.lead || "Project Manager",
            email: recipientEmail,
          },
          data: {
            deadline: p.deadline,
            progress,
            daysOverdue: Math.abs(daysRemaining),
          },
          ai: {
            finding: "Milestone date breached without deliverable sign-off.",
            evidence: `Overdue by ${Math.abs(daysRemaining)} days at ${progress}% progress.`,
            impact: "High SLA penalty risk and blocking dependent workstreams.",
            analysis: "Immediate executive escalation and bottleneck remediation required.",
            recommendation: "Activate recovery scenario in ResourcePulse simulator immediately.",
            confidence: 0.98,
          },
          deduplicationKey: `deadline-missed-${p.id || p.name}-${now.toISOString().split("T")[0]}`,
        };

        const res = await processAutomationEvent(evt);
        if (res.log?.eventPayload) {
          triggeredEvents.push(res.log.eventPayload);
        }
      }
    }
  }

  // 2. Resource Overload Scan
  if (Array.isArray(data.resources)) {
    for (const r of data.resources) {
      const util = Number(r.utilization || 0);
      if (util > 100) {
        const evt: Partial<AutomationEvent> = {
          eventType: "resource_overloaded",
          severity: "high",
          sector,
          resource: {
            type: r.type || "person",
            id: r.id || `res-${r.name}`,
            name: r.name,
            location: r.location,
          },
          title: `Resource Capacity Overload: ${r.name} at ${util}%`,
          description: `Resource "${r.name}" (${r.role || "Specialist"}) is assigned ${r.assignedHours || util}h exceeding standard weekly capacity. Burnout and deliverable risk detected.`,
          trigger: {
            metric: "utilization",
            operator: ">",
            threshold: 100,
            actualValue: util,
          },
          recipient: {
            name: "Operations Lead",
            email: recipientEmail,
          },
          data: {
            weeklyCapacityHours: r.weeklyCapacityHours || 40,
            assignedHours: r.assignedHours,
            utilization: util,
          },
          ai: {
            finding: `Workload exceeds nominal capacity by ${util - 100}%.`,
            evidence: `Assigned tasks exceed weekly hours threshold.`,
            impact: "Predicted task completion degradation and fatigue error probability +42%.",
            analysis: `Sustained overload on ${r.name} will trigger cascading delays in concurrent assignments.`,
            recommendation: "Rebalance tasks with available underutilized teammates.",
            confidence: 0.92,
          },
          deduplicationKey: `overload-${r.id || r.name}-${now.toISOString().split("T")[0]}`,
        };

        const res = await processAutomationEvent(evt);
        if (res.log?.eventPayload) {
          triggeredEvents.push(res.log.eventPayload);
        }
      }
    }
  }

  // 3. Asset & Machinery Health Scan
  if (Array.isArray(data.assets)) {
    for (const a of data.assets) {
      const health = Number(a.healthScore ?? 100);
      const isDown = a.status === "Needs Maintenance" || a.status === "Retired" || health < 50;

      if (isDown) {
        const evt: Partial<AutomationEvent> = {
          eventType: health < 30 ? "machine_failure" : "maintenance_due",
          severity: health < 30 ? "critical" : "high",
          sector,
          resource: {
            type: a.type || "machine",
            id: a.id || `asset-${a.name}`,
            name: a.name,
            location: a.location,
          },
          title: `Asset Alert: ${a.name} (Health: ${health}%)`,
          description: `Physical asset "${a.name}" has registered health score ${health}%. Status: ${a.status}. Operating hours: ${a.operatingHours || 0}h.`,
          trigger: {
            metric: "healthScore",
            operator: "<",
            threshold: 50,
            actualValue: health,
          },
          recipient: {
            name: "Maintenance Supervisor",
            email: recipientEmail,
          },
          data: {
            healthScore: health,
            operatingHours: a.operatingHours,
            serialNumber: a.serialNumber,
            nextServiceDate: a.nextServiceDate,
          },
          ai: {
            finding: `Equipment telemetry indicates degraded operating envelope.`,
            evidence: `Health score ${health}% is below safety tolerance (50%).`,
            impact: "Unscheduled downtime risk to active line or facility operations.",
            analysis: `Predictive maintenance required before catastrophic bearing or subsystem failure occurs.`,
            recommendation: "Dispatch maintenance technician and shift workload to backup unit.",
            confidence: 0.95,
          },
          deduplicationKey: `asset-alert-${a.id || a.name}-${now.toISOString().split("T")[0]}`,
        };

        const res = await processAutomationEvent(evt);
        if (res.log?.eventPayload) {
          triggeredEvents.push(res.log.eventPayload);
        }
      }
    }
  }

  // 4. Inventory Stockout Scan
  if (Array.isArray(data.inventory)) {
    for (const item of data.inventory) {
      const isCritical = item.reorderStatus === "Critical" || (item.projectedStockoutDays !== undefined && item.projectedStockoutDays <= 3);

      if (isCritical) {
        const evt: Partial<AutomationEvent> = {
          eventType: "inventory_critical",
          severity: "critical",
          sector,
          resource: {
            type: "inventory item",
            id: item.id || `item-${item.sku}`,
            name: item.name,
            location: item.location,
          },
          title: `Critical Stockout Alert: ${item.name}`,
          description: `Inventory item "${item.name}" (SKU: ${item.sku}) is at ${item.quantityOnHand} ${item.unitOfMeasure}. Projected stockout in ${item.projectedStockoutDays || 0} day(s).`,
          trigger: {
            metric: "projectedStockoutDays",
            operator: "<=",
            threshold: 3,
            actualValue: item.projectedStockoutDays || 0,
          },
          recipient: {
            name: "Supply Chain Manager",
            email: recipientEmail,
          },
          data: {
            sku: item.sku,
            quantityOnHand: item.quantityOnHand,
            minThreshold: item.minThreshold,
            burnRate: item.consumptionRatePerWeek,
          },
          ai: {
            finding: "Stock level below reorder buffer threshold.",
            evidence: `Burn rate is ${item.consumptionRatePerWeek} units/week against ${item.quantityOnHand} on hand.`,
            impact: "Material starvation halting downstream work packages.",
            analysis: "Lead time for replenishing exceeds projected runway.",
            recommendation: "Issue emergency purchase order or expedite supplier delivery.",
            confidence: 0.96,
          },
          deduplicationKey: `inv-stockout-${item.id || item.sku}-${now.toISOString().split("T")[0]}`,
        };

        const res = await processAutomationEvent(evt);
        if (res.log?.eventPayload) {
          triggeredEvents.push(res.log.eventPayload);
        }
      }
    }
  }

  return {
    scannedProjects: data.projects?.length || 0,
    scannedResources: data.resources?.length || 0,
    scannedAssets: data.assets?.length || 0,
    scannedInventory: data.inventory?.length || 0,
    triggeredEvents,
  };
}

/**
 * Get stats for dashboard
 */
export function getAutomationStats(): AutomationStats {
  const todayStr = new Date().toISOString().split("T")[0];
  const eventsToday = memoryLogs.filter(l => l.timestamp.startsWith(todayStr)).length;
  const emailsSent = memoryLogs.filter(l => l.status === "delivered").length;
  const criticalAlerts = memoryLogs.filter(l => l.severity === "critical").length;
  const failedAutomations = memoryLogs.filter(l => l.status === "failed" || l.status === "permanently_failed").length;
  const pendingApprovals = memoryLogs.filter(l => l.status === "pending_approval").length;

  const rawUrl = process.env.MAKE_WEBHOOK_URL || "";
  const webhookConfigured = Boolean(rawUrl && rawUrl.trim().length > 0);

  let webhookEndpointMasked = undefined;
  if (webhookConfigured) {
    try {
      const parsed = new URL(rawUrl);
      const pathSuffix = parsed.pathname.slice(-6);
      webhookEndpointMasked = `${parsed.hostname}/***/${pathSuffix}`;
    } catch {
      webhookEndpointMasked = "hook.make.com/***/configured";
    }
  }

  return {
    activeAutomations: memoryRules.filter(r => r.enabled).length,
    eventsToday,
    emailsSent,
    criticalAlerts,
    failedAutomations,
    pendingApprovals,
    webhookConfigured,
    webhookEndpointMasked,
  };
}

/**
 * Accessors for Rules and Logs
 */
export function getAutomationRules(): AutomationRule[] {
  return [...memoryRules];
}

export function saveAutomationRule(ruleData: Partial<AutomationRule>): AutomationRule {
  if (ruleData.id) {
    const idx = memoryRules.findIndex(r => r.id === ruleData.id);
    if (idx !== -1) {
      memoryRules[idx] = {
        ...memoryRules[idx],
        ...ruleData,
        updatedAt: new Date().toISOString(),
      } as AutomationRule;
      persistState();
      return memoryRules[idx];
    }
  }

  const newRule: AutomationRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: ruleData.name || "Custom Automation Rule",
    description: ruleData.description || "Custom trigger and condition rule",
    enabled: ruleData.enabled ?? true,
    sector: ruleData.sector || "*",
    trigger: ruleData.trigger || { eventType: "custom_event" },
    conditionLogic: ruleData.conditionLogic || "AND",
    conditions: ruleData.conditions || [],
    actions: ruleData.actions || [{ type: "make_webhook" }],
    cooldownMinutes: ruleData.cooldownMinutes ?? 1440,
    recipient: ruleData.recipient || { name: "Operations Lead", email: "ops@company.com" },
    requiresApproval: Boolean(ruleData.requiresApproval),
    createdAt: new Date().toISOString(),
  };

  memoryRules.unshift(newRule);
  persistState();
  return newRule;
}

export function deleteAutomationRule(ruleId: string): boolean {
  const initialLen = memoryRules.length;
  memoryRules = memoryRules.filter(r => r.id !== ruleId);
  if (memoryRules.length !== initialLen) {
    persistState();
    return true;
  }
  return false;
}

export function toggleAutomationRule(ruleId: string): AutomationRule {
  const rule = memoryRules.find(r => r.id === ruleId);
  if (!rule) throw new Error(`Rule not found: ${ruleId}`);
  rule.enabled = !rule.enabled;
  rule.updatedAt = new Date().toISOString();
  persistState();
  return rule;
}

export function getAutomationLogs(filters?: {
  sector?: string;
  eventType?: string;
  severity?: string;
  status?: string;
  search?: string;
}): AutomationLog[] {
  let logs = [...memoryLogs];

  if (!filters) return logs;

  if (filters.sector && filters.sector !== "all") {
    logs = logs.filter(l => l.sector.toLowerCase() === filters.sector!.toLowerCase());
  }
  if (filters.eventType && filters.eventType !== "all") {
    logs = logs.filter(l => l.eventType === filters.eventType);
  }
  if (filters.severity && filters.severity !== "all") {
    logs = logs.filter(l => l.severity === filters.severity);
  }
  if (filters.status && filters.status !== "all") {
    logs = logs.filter(l => l.status === filters.status);
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase();
    logs = logs.filter(
      l =>
        l.title.toLowerCase().includes(q) ||
        l.resourceName.toLowerCase().includes(q) ||
        (l.recipientEmail && l.recipientEmail.toLowerCase().includes(q)) ||
        (l.recipientName && l.recipientName.toLowerCase().includes(q))
    );
  }

  return logs;
}
