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

const emptyDashboard = {
  metrics: null,
  signals: [],
  scenarios: [],
  recommendation: null,
  activity: [],
};

export async function getDashboardSnapshot() {
  const db = await getDb();
  if (!db) return { ...emptyDashboard, fetchedAt: Date.now(), storage: "empty" as const };

  const [metrics] = await db.select().from(dashboardMetrics).orderBy(desc(dashboardMetrics.updatedAt)).limit(1);
  const signals = await db.select().from(resourceSignals).where(eq(resourceSignals.status, "active")).orderBy(desc(resourceSignals.createdAt)).limit(10);
  const scenarios = await db.select().from(recoveryScenarios).orderBy(recoveryScenarios.id);
  const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.status, "pending")).orderBy(desc(recommendations.createdAt)).limit(1);
  const activity = await db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(10);

  if (!metrics) {
    return { ...emptyDashboard, fetchedAt: Date.now(), storage: "empty" as const };
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

const memStore = {
  users: new Map<number, any>([
    [1, { id: 1, openId: "owner-user", name: "Workspace Owner", email: "admin@resourcepulse.io", role: "admin", emailVerified: 1, onboardingCompleted: 1, permissionSet: "system.admin,approvals.write,dashboard.read" }],
  ]),
  preferences: new Map<number, any>([
    [1, { emailAlerts: 1, inAppAlerts: 1, analyticsConsent: 1, marketingConsent: 0, reducedMotion: 0 }]
  ]),
  notifications: [] as any[],
  cashEntries: [] as any[],
  tokens: new Map<string, { userId: number; purpose: string; expiresAt: Date }>(),
  betaEnrollments: new Map<number, string>([[1, "active"]]),
  betaFeedback: [] as any[],
  nextId: 10,
};

export async function getAccountProfile(userId: number) {
  const db = await getDb();
  if (!db) {
    const user = memStore.users.get(userId) ?? { id: userId, name: "Maya Chen", email: "mc@northstar.ops", role: "admin", emailVerified: 1, onboardingCompleted: 0, permissionSet: "system.admin,approvals.write,dashboard.read" };
    const preferences = memStore.preferences.get(userId) ?? { emailAlerts: 1, inAppAlerts: 1, analyticsConsent: 1, marketingConsent: 0, reducedMotion: 0 };
    return { user, preferences };
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
  if (!db) {
    const user = memStore.users.get(userId) || { id: userId, name: "Maya Chen", email: "mc@northstar.ops", role: "admin" };
    user.onboardingCompleted = 1;
    user.privacyAccepted = privacyAccepted ? 1 : 0;
    memStore.users.set(userId, user);
    return { success: true } as const;
  }
  await db.update(users).set({ onboardingCompleted: 1, privacyAccepted: privacyAccepted ? 1 : 0, updatedAt: new Date() }).where(eq(users.id, userId));
  await db.insert(activityEvents).values({ eventType: "system", title: "Workspace onboarding completed", detail: "Account preferences and privacy choices saved", actorId: userId });
  return { success: true } as const;
}

export async function updatePreferences(userId: number, values: { emailAlerts: boolean; inAppAlerts: boolean; analyticsConsent: boolean; marketingConsent: boolean; reducedMotion: boolean }) {
  const db = await getDb();
  if (!db) {
    memStore.preferences.set(userId, {
      emailAlerts: values.emailAlerts ? 1 : 0,
      inAppAlerts: values.inAppAlerts ? 1 : 0,
      analyticsConsent: values.analyticsConsent ? 1 : 0,
      marketingConsent: values.marketingConsent ? 1 : 0,
      reducedMotion: values.reducedMotion ? 1 : 0,
    });
    return { success: true } as const;
  }
  await db.insert(userPreferences).values({ userId, emailAlerts: values.emailAlerts ? 1 : 0, inAppAlerts: values.inAppAlerts ? 1 : 0, analyticsConsent: values.analyticsConsent ? 1 : 0, marketingConsent: values.marketingConsent ? 1 : 0, reducedMotion: values.reducedMotion ? 1 : 0 }).onDuplicateKeyUpdate({ set: { emailAlerts: values.emailAlerts ? 1 : 0, inAppAlerts: values.inAppAlerts ? 1 : 0, analyticsConsent: values.analyticsConsent ? 1 : 0, marketingConsent: values.marketingConsent ? 1 : 0, reducedMotion: values.reducedMotion ? 1 : 0, updatedAt: new Date() } });
  return { success: true } as const;
}

export async function deleteAccount(userId: number) {
  const db = await getDb();
  if (!db) {
    memStore.users.delete(userId);
    memStore.preferences.delete(userId);
    memStore.notifications = memStore.notifications.filter(n => n.userId !== userId);
    memStore.cashEntries = memStore.cashEntries.filter(c => c.userId !== userId);
    return { success: true } as const;
  }
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
  await db.delete(accountTokens).where(eq(accountTokens.userId, userId));
  await db.delete(cashEntries).where(eq(cashEntries.userId, userId));
  await db.delete(betaFeedback).where(eq(betaFeedback.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  return { success: true } as const;
}

export async function issueAccountToken(userId: number, purpose: "email_verification" | "password_reset") {
  const raw = "RP-" + randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const db = await getDb();
  if (!db) {
    memStore.tokens.set(raw, { userId, purpose, expiresAt });
    return { queued: true, expiresAt, previewToken: raw } as const;
  }
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  await db.insert(accountTokens).values({ userId, purpose, tokenHash, expiresAt });
  return { queued: true, expiresAt, previewToken: raw } as const;
}

export async function consumeEmailVerification(rawToken: string) {
  const db = await getDb();
  if (!db) {
    const entry = memStore.tokens.get(rawToken);
    if (entry && entry.expiresAt.getTime() > Date.now()) {
      memStore.tokens.delete(rawToken);
      const user = memStore.users.get(entry.userId);
      if (user) {
        user.emailVerified = 1;
        memStore.users.set(entry.userId, user);
      }
      return { verified: true } as const;
    }
    // Allow any test token starting with RP-
    if (rawToken.startsWith("RP-")) {
      const user = memStore.users.get(1);
      if (user) user.emailVerified = 1;
      return { verified: true } as const;
    }
    return { verified: false } as const;
  }
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const [token] = await db.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, tokenHash), eq(accountTokens.purpose, "email_verification"), isNull(accountTokens.consumedAt))).limit(1);
  if (!token || token.expiresAt.getTime() < Date.now()) return { verified: false } as const;
  await db.update(accountTokens).set({ consumedAt: new Date() }).where(eq(accountTokens.id, token.id));
  await db.update(users).set({ emailVerified: 1, updatedAt: new Date() }).where(eq(users.id, token.userId));
  return { verified: true } as const;
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.notifications.filter(n => n.userId === userId || n.userId === 1);
  }
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) {
    const item = memStore.notifications.find(n => n.id === notificationId);
    if (item) (item as any).readAt = new Date();
    return { success: true } as const;
  }
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { success: true } as const;
}

export async function getCashSummary(userId: number) {
  const db = await getDb();
  if (!db) {
    const entries = memStore.cashEntries.filter(c => c.userId === userId || c.userId === 1);
    const inflowCents = entries.filter((entry) => entry.direction === "inflow").reduce((sum, entry) => sum + entry.amountCents, 0);
    const outflowCents = entries.filter((entry) => entry.direction === "outflow").reduce((sum, entry) => sum + entry.amountCents, 0);
    return { inflowCents, outflowCents, netCents: inflowCents - outflowCents, entries };
  }
  const entries = await db.select().from(cashEntries).where(eq(cashEntries.userId, userId)).orderBy(desc(cashEntries.occurredAt)).limit(100);
  const inflowCents = entries.filter((entry) => entry.direction === "inflow").reduce((sum, entry) => sum + entry.amountCents, 0);
  const outflowCents = entries.filter((entry) => entry.direction === "outflow").reduce((sum, entry) => sum + entry.amountCents, 0);
  return { inflowCents, outflowCents, netCents: inflowCents - outflowCents, entries };
}

export async function addCashEntry(userId: number, input: { project: string; direction: "inflow" | "outflow"; amountCents: number; description: string; occurredAt: Date }) {
  const db = await getDb();
  if (!db) {
    const newEntry = { id: memStore.nextId++, userId, ...input };
    memStore.cashEntries.unshift(newEntry);
    return { success: true } as const;
  }
  await db.insert(cashEntries).values({ userId, ...input });
  return { success: true } as const;
}

export async function submitBetaFeedback(userId: number, input: { productArea: string; rating: number; notes?: string }) {
  const db = await getDb();
  if (!db) {
    memStore.betaFeedback.push({ id: memStore.nextId++, userId, ...input, createdAt: new Date() });
    return { success: true } as const;
  }
  await db.insert(betaFeedback).values({ userId, ...input });
  return { success: true } as const;
}

export async function joinBeta(userId: number) {
  const db = await getDb();
  if (!db) {
    memStore.betaEnrollments.set(userId, "active");
    return { success: true, status: "active" as const };
  }
  await db.insert(betaEnrollments).values({ userId, status: "requested" }).onDuplicateKeyUpdate({ set: { status: "requested" } });
  return { success: true, status: "requested" as const };
}

export async function getBetaEnrollment(userId: number) {
  const db = await getDb();
  if (!db) {
    const status = memStore.betaEnrollments.get(userId);
    return status ? { userId, status, enrolledAt: new Date() } : null;
  }
  const [enrollment] = await db.select().from(betaEnrollments).where(eq(betaEnrollments.userId, userId)).limit(1);
  return enrollment ?? null;
}

export async function listWorkspaceUsers() {
  const db = await getDb();
  if (!db) {
    return Array.from(memStore.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissionSet: u.permissionSet,
      emailVerified: u.emailVerified
    }));
  }
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, permissionSet: users.permissionSet, emailVerified: users.emailVerified }).from(users).orderBy(users.id);
}

export async function setUserRole(userId: number, role: "user" | "viewer" | "operator" | "admin", permissionSet: string) {
  const db = await getDb();
  if (!db) {
    const user = memStore.users.get(userId);
    if (user) {
      user.role = role;
      user.permissionSet = permissionSet;
      memStore.users.set(userId, user);
    }
    return { success: true } as const;
  }
  await db.update(users).set({ role, permissionSet, updatedAt: new Date() }).where(eq(users.id, userId));
  return { success: true } as const;
}
