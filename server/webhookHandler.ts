import Stripe from 'stripe';
import { getStripeClient, getWebhookSecret } from './stripeClient';
import { getUserByStripeCustomerId, updateUserStripeInfo, logEvent } from './db';
import { Plan } from '../shared/billing';

const processedEvents = new Set<string>();

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
  const stripe = await getStripeClient();
  const webhookSecret = await getWebhookSecret();
  
  let event: Stripe.Event;
  
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', {
        error: err.message,
        type: err.type,
        time: new Date().toISOString(),
      });
      throw new Error('Webhook signature verification failed');
    }
  } else {
    console.warn('[Webhook] No webhook secret configured, skipping signature verification');
    event = JSON.parse(rawBody.toString()) as Stripe.Event;
  }

  if (processedEvents.has(event.id)) {
    console.log(`[Webhook] Duplicate event ignored: ${event.id} (${event.type})`);
    return { received: true };
  }
  
  processedEvents.add(event.id);
  
  if (processedEvents.size > 1000) {
    const eventsArray = Array.from(processedEvents);
    eventsArray.slice(0, 500).forEach(id => processedEvents.delete(id));
  }

  console.log(`[Webhook] Processing event: ${event.id} (${event.type}) at ${new Date().toISOString()}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  
  if (!customerId || !subscriptionId) {
    console.warn('[Webhook] Missing customer or subscription ID in checkout session');
    return;
  }

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[Webhook] No user found for customer: ${customerId}`);
    return;
  }

  const stripe = await getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });

  const plan = getPlanFromSubscription(subscription);
  const periodEnd = new Date((subscription as any).current_period_end * 1000);

  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: subscriptionId,
    plan,
    planExpiresAt: periodEnd,
  });

  await logEvent('subscription_created', user.id, {
    subscriptionId,
    plan,
    periodEnd: periodEnd.toISOString(),
  });

  console.log(`[Webhook] User ${user.id} subscribed to ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);
  
  if (!user) {
    console.warn(`[Webhook] No user found for customer: ${customerId}`);
    return;
  }

  const plan = getPlanFromSubscription(subscription);
  const periodEnd = new Date((subscription as any).current_period_end * 1000);
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: subscription.id,
    plan: isActive ? plan : 'free',
    planExpiresAt: isActive ? periodEnd : null,
  });

  await logEvent('subscription_updated', user.id, {
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: isActive ? plan : 'free',
    periodEnd: periodEnd.toISOString(),
  });

  console.log(`[Webhook] User ${user.id} subscription updated: ${plan} (${subscription.status})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);
  
  if (!user) {
    console.warn(`[Webhook] No user found for customer: ${customerId}`);
    return;
  }

  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: null,
    plan: 'free',
    planExpiresAt: null,
  });

  await logEvent('subscription_deleted', user.id, {
    subscriptionId: subscription.id,
  });

  console.log(`[Webhook] User ${user.id} subscription deleted, reverted to free`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) return;
  
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  const stripe = await getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });

  const plan = getPlanFromSubscription(subscription);
  const periodEnd = new Date((subscription as any).current_period_end * 1000);

  await updateUserStripeInfo(user.id, {
    plan,
    planExpiresAt: periodEnd,
  });

  await logEvent('payment_succeeded', user.id, {
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
  });

  console.log(`[Webhook] Payment succeeded for user ${user.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await getUserByStripeCustomerId(customerId);
  
  if (!user) return;

  await logEvent('payment_failed', user.id, {
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  });

  console.log(`[Webhook] Payment failed for user ${user.id}`);
}

function getPlanFromSubscription(subscription: Stripe.Subscription): Plan {
  const item = subscription.items.data[0];
  if (!item) return 'free';

  const price = item.price;
  const product = price.product as Stripe.Product;
  
  if (product && typeof product !== 'string' && product.metadata?.plan) {
    const planMeta = product.metadata.plan;
    if (planMeta === 'plus' || planMeta === 'pro') {
      return planMeta;
    }
  }

  return 'free';
}
