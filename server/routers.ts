import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { createCheckoutSession } from "./billing";
import {
  addCashEntry,
  approveRecommendation,
  completeOnboarding,
  consumeEmailVerification,
  deleteAccount,
  getAccountProfile,
  getCashSummary,
  getDashboardSnapshot,
  getBetaEnrollment,
  getNotifications,
  issueAccountToken,
  markNotificationRead,
  submitBetaFeedback,
  joinBeta,
  listWorkspaceUsers,
  setUserRole,
  updatePreferences,
} from "./db";
import { runAISimulation, askAICopilot, splitTaskWithAI } from "./aiService";

const preferenceInput = z.object({
  emailAlerts: z.boolean(),
  inAppAlerts: z.boolean(),
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
  reducedMotion: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async () => ({ success: true, message: "If that account exists, a reset link will be sent." })),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(20) }))
      .mutation(({ input }) => consumeEmailVerification(input.token)),
  }),
  dashboard: router({
    snapshot: publicProcedure.query(() => getDashboardSnapshot()),
  }),
  recommendations: router({
    approve: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => approveRecommendation(input.id, ctx.user.id)),
  }),
  account: router({
    profile: protectedProcedure.query(({ ctx }) => getAccountProfile(ctx.user.id)),
    completeOnboarding: protectedProcedure
      .input(z.object({ privacyAccepted: z.boolean() }))
      .mutation(({ ctx, input }) => completeOnboarding(ctx.user.id, input.privacyAccepted)),
    updatePreferences: protectedProcedure
      .input(preferenceInput)
      .mutation(({ ctx, input }) => updatePreferences(ctx.user.id, input)),
    requestVerification: protectedProcedure.mutation(({ ctx }) => issueAccountToken(ctx.user.id, "email_verification")),
    requestPasswordReset: protectedProcedure.mutation(({ ctx }) => issueAccountToken(ctx.user.id, "password_reset")),
    delete: protectedProcedure
      .input(z.object({ confirmation: z.literal("DELETE") }))
      .mutation(async ({ ctx }) => deleteAccount(ctx.user.id)),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.id)),
  }),
  cash: router({
    summary: protectedProcedure.query(({ ctx }) => getCashSummary(ctx.user.id)),
    add: protectedProcedure
      .input(z.object({ project: z.string().min(1).max(160), direction: z.enum(["inflow", "outflow"]), amountCents: z.number().int().positive(), description: z.string().min(1).max(240), occurredAt: z.coerce.date() }))
      .mutation(({ ctx, input }) => addCashEntry(ctx.user.id, input)),
  }),
  beta: router({
    status: protectedProcedure.query(({ ctx }) => getBetaEnrollment(ctx.user.id)),
    join: protectedProcedure.mutation(({ ctx }) => joinBeta(ctx.user.id)),
    submitFeedback: protectedProcedure
      .input(z.object({ productArea: z.string().min(1).max(80), rating: z.number().int().min(1).max(5), notes: z.string().max(500).optional() }))
      .mutation(({ ctx, input }) => submitBetaFeedback(ctx.user.id, input)),
  }),
  simulation: router({
    runAI: publicProcedure
      .input(
        z.object({
          absentResourceId: z.string().default("MEM-01"),
          absentResourceName: z.string().default("Team Member"),
          role: z.string().default("Specialist"),
          project: z.string().default("Core Deliverable"),
          bufferDays: z.number().optional().default(3),
          budgetCeiling: z.number().optional().default(3500),
          availableTeammates: z.array(z.any()).optional(),
        })
      )
      .query(async ({ input }) => runAISimulation(input)),
    ask: publicProcedure
      .input(
        z.object({
          query: z.string(),
          teamContext: z
            .object({
              teamName: z.string().optional(),
              field: z.string().optional(),
              members: z.array(z.any()).optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input }) => askAICopilot(input.query, input.teamContext)),
    splitTask: publicProcedure
      .input(
        z.object({
          goal: z.string(),
          documentContent: z.string().optional(),
          fileType: z.string().optional(),
          fileName: z.string().optional(),
          imageDataUrl: z.string().optional(),
          teamMembers: z.array(z.any()),
          deadline: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => splitTaskWithAI(input)),
  }),
  billing: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getAccountProfile(ctx.user.id);
      return { stripeCustomerId: profile.user?.stripeCustomerId ?? null, stripeSubscriptionId: profile.user?.stripeSubscriptionId ?? null, configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID) };
    }),
    startCheckout: protectedProcedure.mutation(async ({ ctx }) => {
      const origin = ctx.req.headers.origin ?? "http://localhost:3000";
      const profile = await getAccountProfile(ctx.user.id);
      if (!profile.user) throw new Error("Account profile not found");
      return createCheckoutSession(profile.user, origin);
    }),
  }),
  admin: router({
    members: adminProcedure.query(() => listWorkspaceUsers()),
    setRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "viewer", "operator", "admin"]), permissionSet: z.string().max(500) }))
      .mutation(({ input }) => setUserRole(input.userId, input.role, input.permissionSet)),
  }),
});

export type AppRouter = typeof appRouter;
