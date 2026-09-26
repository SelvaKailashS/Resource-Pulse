import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user?: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("dashboard.snapshot", () => {
  it("returns the operational snapshot contract", async () => {
    const snapshot = await appRouter.createCaller(createContext()).dashboard.snapshot();

    expect(snapshot.metrics).toMatchObject({
      resourceHealth: expect.any(String),
      atRiskCapacity: expect.any(String),
      forecastConfidence: expect.any(String),
    });
    expect(snapshot.signals.length).toBeGreaterThan(0);
    expect(snapshot.scenarios.length).toBeGreaterThan(0);
    expect(snapshot.recommendation).toMatchObject({
      title: expect.any(String),
      confidence: expect.any(Number),
      status: expect.any(String),
    });
    expect(snapshot.fetchedAt).toEqual(expect.any(Number));
  });
});

describe("recommendations.approve", () => {
  it("rejects approval attempts without admin permission", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.recommendations.approve({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
