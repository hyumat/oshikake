import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getStripeClient, getPriceConfigs, getPriceId } from "../stripeClient";
import { getUserById, updateUserStripeInfo, logEvent, getUserEntitlement, countUserAttendances } from "../db";
import { Plan as BillingPlan } from "../../shared/billing";

const planSchema = z.enum(["plus", "pro"]);
const cycleSchema = z.enum(["monthly", "yearly"]);

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({
      plan: planSchema,
      cycle: cycleSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = await getUserById(userId);
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const stripe = await getStripeClient();
      const priceConfigs = await getPriceConfigs();
      const priceId = getPriceId(input.plan, input.cycle, priceConfigs);

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Price not found for ${input.plan} ${input.cycle}`,
        });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || undefined,
          metadata: {
            userId: userId.toString(),
          },
        });
        customerId = customer.id;
        await updateUserStripeInfo(userId, { stripeCustomerId: customerId });
      }

      const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:5000";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            plan: input.plan,
          },
        },
      });

      await logEvent("checkout_session_created", userId, {
        plan: input.plan,
        cycle: input.cycle,
        sessionId: session.id,
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);

    if (!user?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account found",
      });
    }

    const stripe = await getStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:5000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/account`,
    });

    await logEvent("portal_session_created", userId);

    return { url: portalSession.url };
  }),

  getPrices: publicProcedure.query(async () => {
    try {
      const priceConfigs = await getPriceConfigs();
      return priceConfigs.map((p) => ({
        plan: p.plan,
        cycle: p.cycle,
        amount: p.amount,
        currency: p.currency,
      }));
    } catch (error) {
      console.warn("[Billing] Failed to fetch prices:", error);
      return [];
    }
  }),

  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);

    if (!user?.stripeSubscriptionId || !user.stripeCustomerId) {
      return { subscription: null };
    }

    try {
      const stripe = await getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      return {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      };
    } catch (error) {
      console.warn("[Billing] Failed to fetch subscription:", error);
      return { subscription: null };
    }
  }),

  // Issue #106: Get user's plan status for UI restrictions
  getPlanStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const attendanceCount = await countUserAttendances(user.openId);

    // Try to get entitlement from entitlements table first
    const entitlement = await getUserEntitlement(user.openId);

    if (entitlement) {
      return {
        plan: entitlement.plan as BillingPlan,
        planExpiresAt: entitlement.planExpiresAt ? entitlement.planExpiresAt.toISOString() : null,
        attendanceCount,
      };
    }

    // Fallback to users table
    return {
      plan: (user.plan || 'free') as BillingPlan,
      planExpiresAt: user.planExpiresAt ? user.planExpiresAt.toISOString() : null,
      attendanceCount,
    };
  }),
});
