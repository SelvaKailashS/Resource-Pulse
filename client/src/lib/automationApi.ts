import {
  AutomationEvent,
  AutomationRule,
  AutomationLog,
  AutomationStats,
} from "@shared/automationTypes";

const API_BASE = "/api/automation";

export async function dispatchAutomationEvent(event: Partial<AutomationEvent>): Promise<{
  success: boolean;
  eventId?: string;
  automationTriggered?: boolean;
  matchedRuleCount?: number;
  status?: string;
  message?: string;
  logId?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to reach automation backend",
    };
  }
}

export async function fetchAutomationLogs(filters?: {
  sector?: string;
  eventType?: string;
  severity?: string;
  status?: string;
  search?: string;
}): Promise<AutomationLog[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.sector) params.set("sector", filters.sector);
    if (filters?.eventType) params.set("eventType", filters.eventType);
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);

    const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.error("fetchAutomationLogs failed:", err);
    return [];
  }
}

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  try {
    const res = await fetch(`${API_BASE}/rules`);
    const data = await res.json();
    return data.rules || [];
  } catch (err) {
    console.error("fetchAutomationRules failed:", err);
    return [];
  }
}

export async function saveAutomationRule(ruleData: Partial<AutomationRule>): Promise<AutomationRule | null> {
  try {
    const res = await fetch(`${API_BASE}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ruleData),
    });
    const data = await res.json();
    return data.rule || null;
  } catch (err) {
    console.error("saveAutomationRule failed:", err);
    return null;
  }
}

export async function deleteAutomationRule(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rules/${id}`, { method: "DELETE" });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("deleteAutomationRule failed:", err);
    return false;
  }
}

export async function toggleAutomationRule(id: string): Promise<AutomationRule | null> {
  try {
    const res = await fetch(`${API_BASE}/rules/${id}/toggle`, { method: "POST" });
    const data = await res.json();
    return data.rule || null;
  } catch (err) {
    console.error("toggleAutomationRule failed:", err);
    return null;
  }
}

export async function retryAutomationLog(id: string): Promise<AutomationLog | null> {
  try {
    const res = await fetch(`${API_BASE}/logs/${id}/retry`, { method: "POST" });
    const data = await res.json();
    return data.log || null;
  } catch (err) {
    console.error("retryAutomationLog failed:", err);
    return null;
  }
}

export async function approveAutomationLog(id: string, approverName: string): Promise<AutomationLog | null> {
  try {
    const res = await fetch(`${API_BASE}/logs/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverName }),
    });
    const data = await res.json();
    return data.log || null;
  } catch (err) {
    console.error("approveAutomationLog failed:", err);
    return null;
  }
}

export async function rejectAutomationLog(id: string, rejectorName: string, reason?: string): Promise<AutomationLog | null> {
  try {
    const res = await fetch(`${API_BASE}/logs/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectorName, reason }),
    });
    const data = await res.json();
    return data.log || null;
  } catch (err) {
    console.error("rejectAutomationLog failed:", err);
    return null;
  }
}

export async function scanDeadlinesAndTelemetry(data: {
  projects?: any[];
  resources?: any[];
  assets?: any[];
  inventory?: any[];
  sector?: string;
  recipientEmail?: string;
}): Promise<{
  success: boolean;
  scannedProjects: number;
  scannedResources: number;
  scannedAssets: number;
  scannedInventory: number;
  triggeredCount: number;
  triggeredEvents: AutomationEvent[];
}> {
  try {
    const res = await fetch(`${API_BASE}/scan-deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      scannedProjects: 0,
      scannedResources: 0,
      scannedAssets: 0,
      scannedInventory: 0,
      triggeredCount: 0,
      triggeredEvents: [],
    };
  }
}

export async function sendTestAutomationEvent(
  testType: "deadline" | "machine" | "inventory",
  options?: { sector?: string; recipientEmail?: string }
): Promise<{
  success: boolean;
  eventId?: string;
  status?: string;
  message?: string;
  eventPayload?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testType, ...options }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to trigger test event",
    };
  }
}

export async function fetchAutomationStats(): Promise<AutomationStats | null> {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    return data.stats || null;
  } catch (err) {
    console.error("fetchAutomationStats failed:", err);
    return null;
  }
}
