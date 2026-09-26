import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { activityEvents, dashboardMetrics, recommendations, recoveryScenarios, resourceSignals } from "../drizzle/schema";

async function seed() {
const db = await getDb();
if (!db) throw new Error("DATABASE_URL is not configured");

const [existingMetrics] = await db.select().from(dashboardMetrics).limit(1);
if (!existingMetrics) {
  await db.insert(dashboardMetrics).values({
    resourceHealth: "87.4%",
    resourceHealthDelta: "+4.8%",
    atRiskCapacity: "12.6h",
    atRiskCapacityDelta: "-18.2%",
    forecastConfidence: "94.2%",
    forecastConfidenceDelta: "+2.1%",
    openDecisions: 4,
    urgentDecisions: 2,
  });
}

const signals = [
  { title: "Mobile release train", detail: "QA capacity drops below threshold", severity: "high" as const, horizon: "in 9h", ownersNotified: 3 },
  { title: "Northstar onboarding", detail: "Dependency chain is compressing", severity: "medium" as const, horizon: "in 2d", ownersNotified: 3 },
  { title: "Shared infra pool", detail: "Utilization trending above 82%", severity: "watch" as const, horizon: "in 4d", ownersNotified: 3 },
];
for (const signal of signals) {
  const [existing] = await db.select().from(resourceSignals).where(eq(resourceSignals.title, signal.title)).limit(1);
  if (!existing) await db.insert(resourceSignals).values(signal);
}

const scenarios = [
  { scenarioKey: "balanced", title: "Balanced recovery", subtitle: "Best overall outcome", timeRecovered: "+2.4 days", estimatedCost: "$1.2k", riskReduction: "−38%", blurb: "Rebalances 4 resources while protecting the launch milestone.", feasible: 1 },
  { scenarioKey: "deadline", title: "Protect deadline", subtitle: "Time-first objective", timeRecovered: "+4.1 days", estimatedCost: "$3.8k", riskReduction: "−61%", blurb: "Adds temporary capacity and pulls forward the critical path.", feasible: 1 },
  { scenarioKey: "cost", title: "Minimize cost", subtitle: "Efficiency-first objective", timeRecovered: "+1.2 days", estimatedCost: "$0.4k", riskReduction: "−19%", blurb: "Uses internal capacity and delays two low-priority tasks.", feasible: 1 },
];
for (const scenario of scenarios) {
  const [existing] = await db.select().from(recoveryScenarios).where(eq(recoveryScenarios.scenarioKey, scenario.scenarioKey)).limit(1);
  if (!existing) await db.insert(recoveryScenarios).values(scenario);
}

const [existingRecommendation] = await db.select().from(recommendations).where(eq(recommendations.title, "Give QA a safe landing")).limit(1);
if (!existingRecommendation) {
  await db.insert(recommendations).values({
    title: "Give QA a safe landing",
    recommendation: "Move Arjun Rao from Support pod to the release train for one test cycle. This is the highest-confidence recovery path that protects the milestone without adding external capacity.",
    confidence: 94,
    expectedOutcome: "−2.4 days",
    expectedOutcomeLabel: "milestone slip avoided",
    riskChange: "−38%",
    riskChangeLabel: "deadline risk reduced",
    status: "pending",
    recommendedResource: "Arjun Rao",
    skillMatch: "mobile QA",
    availability: "6.5h tomorrow",
    sourceProjectImpact: "low",
  });
}

const [existingActivity] = await db.select().from(activityEvents).limit(1);
if (!existingActivity) {
  await db.insert(activityEvents).values([
    { eventType: "signal", title: "QA availability changed", detail: "14m ago · Source: PeopleOps" },
    { eventType: "prediction", title: "Forecast updated", detail: "32m ago · 7-day horizon" },
    { eventType: "decision", title: "Scenario approved", detail: "1h ago · Platform team" },
  ]);
}

console.log("Resource Pulse starter data is ready.");
process.exitCode = 0;
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
