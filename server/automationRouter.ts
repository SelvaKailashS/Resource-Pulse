import { Router, Request, Response } from "express";
import {
  processAutomationEvent,
  getAutomationLogs,
  retryAutomationLog,
  approveAutomationLog,
  rejectAutomationLog,
  getAutomationRules,
  saveAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  scanWorkspaceTelemetries,
  getAutomationStats,
} from "./automationService";
import { AutomationEvent } from "../shared/automationTypes";

export const automationRouter = Router();

/**
 * Section 1 & 7: Core POST /api/automation/events
 * Browser -> POST /api/automation/events -> ResourcePulse backend -> validate auth -> validate event -> check duplicate/cooldown -> POST JSON to Make webhook -> Make -> Email
 */
automationRouter.post("/events", async (req: Request, res: Response) => {
  try {
    const rawEvent = req.body as Partial<AutomationEvent>;

    // 1. Basic validation
    if (!rawEvent || typeof rawEvent !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid payload: request body must be a JSON object",
      });
    }

    if (!rawEvent.eventType || typeof rawEvent.eventType !== "string") {
      return res.status(400).json({
        success: false,
        error: "Validation failed: 'eventType' is required and must be a string",
      });
    }

    // 2. Validate recipient email format if provided
    if (rawEvent.recipient?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEvent.recipient.email)) {
        return res.status(400).json({
          success: false,
          error: `Validation failed: invalid recipient email address "${rawEvent.recipient.email}"`,
        });
      }
    }

    // 3. Process event through universal engine
    const result = await processAutomationEvent(rawEvent);

    return res.status(200).json({
      success: result.success,
      eventId: result.eventId,
      automationTriggered: result.automationTriggered,
      matchedRuleCount: result.matchedRuleCount,
      status: result.status,
      message: result.message,
      logId: result.log?.id,
    });
  } catch (err: any) {
    console.error("[AutomationRouter] Error processing event:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error processing automation event",
    });
  }
});

/**
 * GET /api/automation/logs: Retrieve filtered automation audit trail
 */
automationRouter.get("/logs", (req: Request, res: Response) => {
  try {
    const { sector, eventType, severity, status, search } = req.query;
    const logs = getAutomationLogs({
      sector: sector ? String(sector) : undefined,
      eventType: eventType ? String(eventType) : undefined,
      severity: severity ? String(severity) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/logs/:id/retry: Manual retry
 */
automationRouter.post("/logs/:id/retry", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedLog = await retryAutomationLog(id);
    return res.json({ success: true, log: updatedLog });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/logs/:id/approve: Manager approval
 */
automationRouter.post("/logs/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approver = req.body?.approverName || "Authorized Manager";
    const updatedLog = await approveAutomationLog(id, approver);
    return res.json({ success: true, log: updatedLog });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/logs/:id/reject: Manager rejection
 */
automationRouter.post("/logs/:id/reject", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rejector = req.body?.rejectorName || "Authorized Manager";
    const reason = req.body?.reason;
    const updatedLog = await rejectAutomationLog(id, rejector, reason);
    return res.json({ success: true, log: updatedLog });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

/**
 * GET /api/automation/rules: List all automation rules
 */
automationRouter.get("/rules", (_req: Request, res: Response) => {
  try {
    const rules = getAutomationRules();
    return res.json({ success: true, rules });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/rules: Create or update rule
 */
automationRouter.post("/rules", (req: Request, res: Response) => {
  try {
    const ruleData = req.body;
    if (!ruleData.name || !ruleData.trigger?.eventType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: rule name and trigger eventType are required",
      });
    }
    const rule = saveAutomationRule(ruleData);
    return res.json({ success: true, rule });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * DELETE /api/automation/rules/:id: Delete rule
 */
automationRouter.delete("/rules/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteAutomationRule(id);
    return res.json({ success: deleted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/rules/:id/toggle: Enable/disable rule
 */
automationRouter.post("/rules/:id/toggle", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = toggleAutomationRule(id);
    return res.json({ success: true, rule });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/scan-deadlines: Deterministic scanning of workspace projects/resources
 */
automationRouter.post("/scan-deadlines", async (req: Request, res: Response) => {
  try {
    const scanData = req.body || {};
    const result = await scanWorkspaceTelemetries(scanData);
    return res.json({
      success: true,
      scannedProjects: result.scannedProjects,
      scannedResources: result.scannedResources,
      scannedAssets: result.scannedAssets,
      scannedInventory: result.scannedInventory,
      triggeredCount: result.triggeredEvents.length,
      triggeredEvents: result.triggeredEvents,
    });
  } catch (err: any) {
    console.error("[AutomationRouter] Error scanning deadlines:", err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/automation/test: Send a test event (Section 25)
 */
automationRouter.post("/test", async (req: Request, res: Response) => {
  try {
    const { testType, sector, recipientEmail } = req.body || {};
    const targetEmail = recipientEmail || "ops-lead@company.com";
    const targetSector = sector || "Operations";

    let testEvent: Partial<AutomationEvent>;

    switch (testType) {
      case "machine":
        testEvent = {
          eventType: "machine_failure",
          severity: "critical",
          sector: targetSector,
          resource: {
            type: "machine",
            id: "mach-test-204",
            name: "Robotic Assembly Cell M-204",
            location: "Bay 4, Main Facility",
          },
          title: "Critical Machine Failure Alert [TEST]",
          description: "Thermal sensor detected main spindle bearing failure. Emergency shutdown triggered to prevent tool collision.",
          trigger: {
            metric: "temperature",
            operator: ">",
            threshold: 85,
            actualValue: 104,
          },
          recipient: {
            name: "Facility Manager",
            email: targetEmail,
          },
          data: {
            bearingTemp: 104,
            operatingHours: 4210,
            vibrationRMS: 4.8,
          },
          ai: {
            finding: "Bearing degradation exceeded ISO vibration and thermal limits.",
            evidence: "Temperature peaked at 104°C (tolerance: 85°C).",
            impact: "Assembly line halted. Cascading delivery delay of +4.2h on current batch.",
            analysis: "Thermal telemetry indicates imminent spindle seizure.",
            recommendation: "Deploy replacement bearing cartridge and re-route queue to Cell M-205.",
            confidence: 0.99,
          },
          testEvent: true,
        };
        break;

      case "inventory":
        testEvent = {
          eventType: "inventory_critical",
          severity: "critical",
          sector: targetSector,
          resource: {
            type: "inventory item",
            id: "sku-titanium-12",
            name: "Grade 5 Titanium Bar Stock",
            location: "Warehouse Rack B-12",
          },
          title: "Critical Inventory Stockout Alert [TEST]",
          description: "Material stock level (8 units) is below minimum threshold (25 units). Projected stockout in 2 days.",
          trigger: {
            metric: "projectedStockoutDays",
            operator: "<=",
            threshold: 3,
            actualValue: 2,
          },
          recipient: {
            name: "Supply Chain Manager",
            email: targetEmail,
          },
          data: {
            quantityOnHand: 8,
            minThreshold: 25,
            projectedStockoutDays: 2,
          },
          ai: {
            finding: "Supply depletion rate exceeds supplier standard lead time (5 days).",
            evidence: "8 units remaining with burn rate of 28 units/week.",
            impact: "Fabrication milestone paused in 48 hours without replenishment.",
            analysis: "Production starvation imminent without expedited procurement.",
            recommendation: "Issue emergency purchase order with priority air freight.",
            confidence: 0.97,
          },
          testEvent: true,
        };
        break;

      case "deadline":
      default:
        testEvent = {
          eventType: "deadline_risk",
          severity: "high",
          sector: targetSector,
          resource: {
            type: "project",
            id: "proj-test-core",
            name: "Production Line Upgrade",
          },
          title: "Project deadline risk detected [TEST]",
          description: "Project progress is below expected velocity. Current progress 62% against 80% threshold with 3 days remaining.",
          trigger: {
            metric: "progress",
            operator: "<",
            threshold: 80,
            actualValue: 62,
          },
          recipient: {
            name: "Project Lead",
            email: targetEmail,
          },
          data: {
            deadline: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            progress: 62,
            daysRemaining: 3,
          },
          ai: {
            finding: "Deliverable completion rate lagging behind target milestone by 18%.",
            evidence: "Work velocity at 62% completion with 72h until deadline.",
            impact: "Cascading delay of +3.5 days on downstream phase integration.",
            analysis: "Current progress indicates a possible deadline risk without resource rebalancing.",
            recommendation: "Review resource allocation and shift secondary tasks to parallel team members.",
            confidence: 0.91,
          },
          testEvent: true,
        };
        break;
    }

    const result = await processAutomationEvent(testEvent);
    return res.json({
      success: result.success,
      eventId: result.eventId,
      status: result.status,
      message: result.message,
      eventPayload: testEvent,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * GET /api/automation/status: Dashboard statistics & webhook health
 */
automationRouter.get("/status", (_req: Request, res: Response) => {
  try {
    const stats = getAutomationStats();
    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
