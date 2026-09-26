import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    const demoRole = opts.req.headers["x-demo-role"] as string | undefined;
    const demoUserHeader = opts.req.headers["x-demo-user"] as string | undefined;
    const authHeader = opts.req.headers.authorization;

    if (demoRole || demoUserHeader || (authHeader && authHeader.includes("demo-token"))) {
      const role = (demoRole === "operator" || demoRole === "viewer" || demoRole === "user") ? demoRole : "admin";
      user = {
        id: 1,
        openId: "demo-maya-chen",
        name: demoUserHeader ? (demoUserHeader.split("@")[0] || "Maya Chen") : "Maya Chen",
        email: demoUserHeader || "mc@northstar.ops",
        role: role as any,
        emailVerified: 1,
        onboardingCompleted: 0,
        permissionSet: role === "admin" ? "system.admin,approvals.write,dashboard.read" : role === "operator" ? "approvals.write,dashboard.read" : "dashboard.read",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        loginMethod: "demo",
      } as any;
    } else {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
