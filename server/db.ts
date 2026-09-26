import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accountTokens,
  activityEvents,
  betaEnrollments,
  betaFeedback,
  cashEntries,
  dashboardMetrics,
  InsertUser,
  notifications,
  recommendations,
  recoveryScenarios,
  resourceSignals,
  userPreferences,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const fallbackDashboard = {
  metrics: { resourceHealth: "87.4%", resourceHealthDelta: "+4.8%", atRiskCapacity: "12.6h", atRiskCapacityDelta: "-18.2%", forecastConfidence: "94.2%", forecastConfidenceDelta: "+2.1%", openDecisions: 4, urgentDecisions: 2 },
  signals: [
    { id: 1, title: "Mobile release train", detail: "QA capacity drops below threshold", severity: "high", horizon: "in 9h", status: "active", ownersNotified: 3 },
    { id: 2, title: "Northstar onboarding", detail: "Dependency chain is compressing", severity: "medium", horizon: "in 2d", status: "active", ownersNotified: 3 },
    { id: 3, title: "Shared infra pool", detail: "Utilization trending above 82%", severity: "watch", horizon: "in 4d", status: "active", ownersNotified: 3 },
  ],
  scenarios: [
    { id: 1, scenarioKey: "balanced", title: "Balanced recovery", subtitle: "Best overall outcome", timeRecovered: "+2.4 days", estimatedCost: "$1.2k", riskReduction: "−38%", blurb: "Rebalances 4 resources while protecting the launch milestone.", feasible: 1 },
    { id: 2, scenarioKey: "deadline", title: "Protect deadline", subtitle: "Time-first objective", timeRecovered: "+4.1 days", estimatedCost: "$3.8k", riskReduction: "−61%", blurb: "Adds temporary capacity and pulls forward the critical path.", feasible: 1 },
    { id: 3, scenarioKey: "cost", title: "Minimize cost", subtitle: "Efficiency-first objective", timeRecovered: "+1.2 days", estimatedCost: "$0.4k", riskReduction: "−19%", blurb: "Uses internal capacity and delays two low-priority tasks.", feasible: 1 },
  ],
  recommendation: { id: 1, title: "Give QA a safe landing", recommendation: "Move Arjun Rao from Support pod to the release train for one test cycle. This is the highest-confidence recovery path that protects the milestone without adding external capacity.", confidence: 94, expectedOutcome: "−2.4 days", expectedOutcomeLabel: "milestone slip avoided", riskChange: "−38%", riskChangeLabel: "deadline risk reduced", status: "pending", recommendedResource: "Arjun Rao", skillMatch: "mobile QA", availability: "6.5h tomorrow", sourceProjectImpact: "low" },
  activity: [
    { id: 1, eventType: "signal", title: "QA availability changed", detail: "14m ago · Source: PeopleOps" },
    { id: 2, eventType: "prediction", title: "Forecast updated", detail: "32m ago · 7-day horizon" },
    { id: 3, eventType: "decision", title: "Scenario approved", detail: "1h ago · Platform team" },
  ],
};

export async function getDashboardSnapshot() {
  const db = await getDb();
  if (!db) return { ...fallbackDashboard, fetchedAt: Date.now(), storage: "fallback" as const };

  const [metrics] = await db.select().from(dashboardMetrics).orderBy(desc(dashboardMetrics.updatedAt)).limit(1);
  const signals = await db.select().from(resourceSignals).where(eq(resourceSignals.status, "active")).orderBy(desc(resourceSignals.createdAt)).limit(10);
  const scenarios = await db.select().from(recoveryScenarios).orderBy(recoveryScenarios.id);
  const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.status, "pending")).orderBy(desc(recommendations.createdAt)).limit(1);
  const activity = await db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(10);

  if (!metrics || signals.length === 0 || scenarios.length === 0 || !recommendation) {
    return { ...fallbackDashboard, fetchedAt: Date.now(), storage: "starter" as const };
  }

  return { metrics, signals, scenarios, recommendation, activity, fetchedAt: Date.now(), storage: "database" as const };
}

export async function approveRecommendation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const now = new Date();
  await db.update(recommendations).set({ status: "approved", approvedBy: userId, approvedAt: now, updatedAt: now }).where(and(eq(recommendations.id, id), eq(recommendations.status, "pending")));
  await db.insert(activityEvents).values({ eventType: "decision", title: "Recommendation approved", detail: "Approved recovery plan queued for execution", actorId: userId });
  await db.insert(notifications).values({ userId, type: "approval", title: "Recovery plan approved", body: "Your decision was recorded and queued for the next execution window." });
  return { success: true, approvedAt: now } as const;
}

export async function getAccountProfile(userId: number) {
  const db = await getDb();
  if (!db) {
    return { user: null, preferences: { emailAlerts: 1, inAppAlerts: 1, analyticsConsent: 0, marketingConsent: 0, reducedMotion: 0 } };
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return {
    user,
    preferences: preferences ?? { emailAlerts: 1, inAppAlerts: 1, analyticsConsent: 0, marketingConsent: 0, reducedMotion: 0 },
  };
}

export async function completeOnboarding(userId: number, privacyAccepted: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(users).set({ onboardingCompleted: 1, privacyAccepted: privacyAccepted ? 1 : 0, updatedAt: new Date() }).where(eq(users.id, userId));
  await db.insert(activityEvents).values({ eventType: "system", title: "Workspace onboarding completed", detail: "Account preferences and privacy choices saved", actorId: userId });
  return { success: true } as const;
}

export async function updatePreferences(userId: number, values: { emailAlerts: boolean; inAppAlerts: boolean; analyticsConsent: boolean; marketingConsent: boolean; reducedMotion: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(userPreferences).values({ userId, emailAlerts: values.emailAlerts ? 1 : 0, inAppAlerts: values.inAppAlerts ? 1 : 0, analyticsConsent: values.analyticsConsent ? 1 : 0, marketingConsent: values.marketingConsent ? 1 : 0, reducedMotion: values.reducedMotion ? 1 : 0 }).onDuplicateKeyUpdate({ set: { emailAlerts: values.emailAlerts ? 1 : 0, inAppAlerts: values.inAppAlerts ? 1 : 0, analyticsConsent: values.analyticsConsent ? 1 : 0, marketingConsent: values.marketingConsent ? 1 : 0, reducedMotion: values.reducedMotion ? 1 : 0, updatedAt: new Date() } });
  return { success: true } as const;
}

export async function deleteAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
  await db.delete(accountTokens).where(eq(accountTokens.userId, userId));
  await db.delete(cashEntries).where(eq(cashEntries.userId, userId));
  await db.delete(betaFeedback).where(eq(betaFeedback.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  return { success: true } as const;
}

export async function issueAccountToken(userId: number, purpose: "email_verification" | "password_reset") {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(accountTokens).values({ userId, purpose, tokenHash, expiresAt });
  return { queued: true, expiresAt, previewToken: ENV.isProduction ? undefined : raw } as const;
}

export async function consumeEmailVerification(rawToken: string) {
  const db = await getDb();
  if (!db) return { verified: false } as const;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const [token] = await db.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, tokenHash), eq(accountTokens.purpose, "email_verification"), isNull(accountTokens.consumedAt))).limit(1);
  if (!token || token.expiresAt.getTime() < Date.now()) return { verified: false } as const;
  await db.update(accountTokens).set({ consumedAt: new Date() }).where(eq(accountTokens.id, token.id));
  await db.update(users).set({ emailVerified: 1, updatedAt: new Date() }).where(eq(users.id, token.userId));
  return { verified: true } as const;
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { success: true } as const;
}

export async function getCashSummary(userId: number) {
  const db = await getDb();
  if (!db) return { inflowCents: 0, outflowCents: 0, netCents: 0, entries: [] };
  const entries = await db.select().from(cashEntries).where(eq(cashEntries.userId, userId)).orderBy(desc(cashEntries.occurredAt)).limit(100);
  const inflowCents = entries.filter((entry) => entry.direction === "inflow").reduce((sum, entry) => sum + entry.amountCents, 0);
  const outflowCents = entries.filter((entry) => entry.direction === "outflow").reduce((sum, entry) => sum + entry.amountCents, 0);
  return { inflowCents, outflowCents, netCents: inflowCents - outflowCents, entries };
}

export async function addCashEntry(userId: number, input: { project: string; direction: "inflow" | "outflow"; amountCents: number; description: string; occurredAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(cashEntries).values({ userId, ...input });
  return { success: true } as const;
}

export async function submitBetaFeedback(userId: number, input: { productArea: string; rating: number; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(betaFeedback).values({ userId, ...input });
  return { success: true } as const;
}

export async function joinBeta(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(betaEnrollments).values({ userId, status: "requested" }).onDuplicateKeyUpdate({ set: { status: "requested" } });
  return { success: true, status: "requested" as const };
}

export async function getBetaEnrollment(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [enrollment] = await db.select().from(betaEnrollments).where(eq(betaEnrollments.userId, userId)).limit(1);
  return enrollment ?? null;
}

export async function listWorkspaceUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, permissionSet: users.permissionSet, emailVerified: users.emailVerified }).from(users).orderBy(users.id);
}

export async function setUserRole(userId: number, role: "user" | "viewer" | "operator" | "admin", permissionSet: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(users).set({ role, permissionSet, updatedAt: new Date() }).where(eq(users.id, userId));
  return { success: true } as const;
}
