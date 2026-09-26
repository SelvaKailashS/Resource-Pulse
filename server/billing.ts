import Stripe from "stripe";
import type { User } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured. Add payment credentials in Settings → Payment.");
  return new Stripe(secretKey);
}

export async function createCheckoutSession(user: User, origin: string) {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("No Stripe price is configured yet. Add STRIPE_PRICE_ID before starting checkout.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    client_reference_id: String(user.id),
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: String(user.id),
      customer_email: user.email ?? "",
      customer_name: user.name ?? "",
    },
    success_url: `${origin}/?billing=success`,
    cancel_url: `${origin}/?billing=cancelled`,
  });
  return { url: session.url } as const;
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("Stripe webhook secret is not configured");
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return { verified: true } as const;
  }

  const db = await getDb();
  if (!db) return { received: true } as const;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
    if (Number.isInteger(userId) && userId > 0) {
      await db.update(users).set({ stripeCustomerId: typeof session.customer === "string" ? session.customer : null, stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null, updatedAt: new Date() }).where(eq(users.id, userId));
    }
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    await db.update(users).set({ stripeSubscriptionId: subscription.id, updatedAt: new Date() }).where(eq(users.stripeCustomerId, customerId));
  }
  console.log(`[Webhook] Processed ${event.type} ${event.id}`);
  return { received: true } as const;
}
