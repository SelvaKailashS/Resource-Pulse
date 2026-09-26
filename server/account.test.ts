import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const member = {
  id: 42,
  openId: "member",
  email: "member@example.com",
  name: "Member",
  loginMethod: "manus",
  role: "user" as const,
  permissionSet: "dashboard.read",
  emailVerified: 0,
  onboardingCompleted: 0,
  privacyAccepted: 0,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("account lifecycle access", () => {
  it("requires authentication for account profile", async () => {
    const caller = appRouter.createCaller(context(undefined));
    await expect(caller.account.profile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires admin permission for approval decisions", async () => {
    const caller = appRouter.createCaller(context(member));
    await expect(caller.recommendations.approve({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
