import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "viewer", "operator", "admin"]).default("user").notNull(),
  permissionSet: text("permissionSet"),
  emailVerified: int("emailVerified").default(0).notNull(),
  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  privacyAccepted: int("privacyAccepted").default(0).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const dashboardMetrics = mysqlTable("dashboard_metrics", {
  id: int("id").autoincrement().primaryKey(),
  resourceHealth: varchar("resourceHealth", { length: 32 }).notNull(),
  resourceHealthDelta: varchar("resourceHealthDelta", { length: 32 }).notNull(),
  atRiskCapacity: varchar("atRiskCapacity", { length: 32 }).notNull(),
  atRiskCapacityDelta: varchar("atRiskCapacityDelta", { length: 32 }).notNull(),
  forecastConfidence: varchar("forecastConfidence", { length: 32 }).notNull(),
  forecastConfidenceDelta: varchar("forecastConfidenceDelta", { length: 32 }).notNull(),
  openDecisions: int("openDecisions").notNull(),
  urgentDecisions: int("urgentDecisions").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const resourceSignals = mysqlTable("resource_signals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail").notNull(),
  severity: mysqlEnum("severity", ["high", "medium", "watch"]).notNull(),
  horizon: varchar("horizon", { length: 40 }).notNull(),
  status: mysqlEnum("status", ["active", "resolved"]).default("active").notNull(),
  ownersNotified: int("ownersNotified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const recoveryScenarios = mysqlTable("recovery_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  scenarioKey: varchar("scenarioKey", { length: 40 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  subtitle: varchar("subtitle", { length: 160 }).notNull(),
  timeRecovered: varchar("timeRecovered", { length: 32 }).notNull(),
  estimatedCost: varchar("estimatedCost", { length: 32 }).notNull(),
  riskReduction: varchar("riskReduction", { length: 32 }).notNull(),
  blurb: text("blurb").notNull(),
  feasible: int("feasible").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  recommendation: text("recommendation").notNull(),
  confidence: int("confidence").notNull(),
  expectedOutcome: varchar("expectedOutcome", { length: 64 }).notNull(),
  expectedOutcomeLabel: varchar("expectedOutcomeLabel", { length: 120 }).notNull(),
  riskChange: varchar("riskChange", { length: 32 }).notNull(),
  riskChangeLabel: varchar("riskChangeLabel", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  recommendedResource: varchar("recommendedResource", { length: 120 }).notNull(),
  skillMatch: varchar("skillMatch", { length: 120 }).notNull(),
  availability: varchar("availability", { length: 120 }).notNull(),
  sourceProjectImpact: varchar("sourceProjectImpact", { length: 80 }).notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const activityEvents = mysqlTable("activity_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", ["signal", "prediction", "decision", "system"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: varchar("detail", { length: 240 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  actorId: int("actorId"),
});

export const accountTokens = mysqlTable("account_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  purpose: mysqlEnum("purpose", ["email_verification", "password_reset"]).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailAlerts: int("emailAlerts").default(1).notNull(),
  inAppAlerts: int("inAppAlerts").default(1).notNull(),
  analyticsConsent: int("analyticsConsent").default(0).notNull(),
  marketingConsent: int("marketingConsent").default(0).notNull(),
  reducedMotion: int("reducedMotion").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["signal", "approval", "billing", "system"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: varchar("body", { length: 300 }).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const cashEntries = mysqlTable("cash_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  project: varchar("project", { length: 160 }).notNull(),
  direction: mysqlEnum("direction", ["inflow", "outflow"]).notNull(),
  amountCents: int("amountCents").notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const betaFeedback = mysqlTable("beta_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productArea: varchar("productArea", { length: 80 }).notNull(),
  rating: int("rating").notNull(),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const betaEnrollments = mysqlTable("beta_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["requested", "active", "paused"]).default("requested").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DashboardMetrics = typeof dashboardMetrics.$inferSelect;
export type ResourceSignal = typeof resourceSignals.$inferSelect;
export type RecoveryScenario = typeof recoveryScenarios.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CashEntry = typeof cashEntries.$inferSelect;
