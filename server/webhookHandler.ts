/**
 * Stripe Webhook Handler with Idempotency
 * Issue #116: Webhook冪等性とentitlements正規化
 */

import Stripe from 'stripe';
import { getStripeClient, getWebhookSecret } from './stripeClient';
import {
  getUserByStripeCustomerId,
  isWebhookProcessed,
  recordWebhookEvent,
  updateWebhookEventStatus,
  upsertEntitlement,
  syncEntitlementToUser,
  logEvent
} from './db';
import { Plan } from '../shared/billing';

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
  const stripe = await getStripeClient();
  const webhookSecret = await getWebhookSecret();

  let event: Stripe.Event;

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }
  } else {
    console.warn('[Webhook] No webhook secret configured, skipping signature verification');
    event = JSON.parse(rawBody.toString()) as Stripe.Event;
  }

  const eventId = event.id;
  const eventType = event.type;

  console.log(`[Webhook] Received event: ${eventType} (ID: ${eventId})`);

  // ==================== 冪等性チェック ====================
  const alreadyProcessed = await isWebhookProcessed(eventId);
  if (alreadyProcessed) {
    console.log(`[Webhook] Event ${eventId} already processed, skipping`);
    return { received: true };
  }

  // Webhookイベントを記録（処理前）
  await recordWebhookEvent({
    eventId,
    eventType,
    payload: JSON.stringify(event),
    status: 'success', // 初期値
  });

  try {
    // イベント処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, eventId);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, eventId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, eventId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, eventId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, eventId);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // 処理成功
    await updateWebhookEventStatus(eventId, 'success');
    console.log(`[Webhook] Event ${eventId} processed successfully`);

  } catch (error) {
    // 処理失敗
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateWebhookEventStatus(eventId, 'failed', errorMessage);
    console.error(`[Webhook] Event ${eventId} processing failed:`, error);
    throw error;
  }

  return { received: true };
}

/**
 * Checkout完了時の処理
 *
 * 状態遷移:
 * - free → trialing (トライアル付きプランの場合)
 * - free → active (通常プランの場合)
 *
 * @param session - Stripe Checkout Session
 * @param eventId - Webhook Event ID (冪等性・トレーサビリティ用)
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
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
  const status = mapSubscriptionStatus(subscription.status);

  console.log(`[Webhook][${eventId}] Checkout completed for user ${user.openId}: plan=${plan}, status=${status}`);

  // ==================== Entitlements更新（唯一の真実） ====================
  await upsertEntitlement(user.openId, {
    plan,
    planExpiresAt: periodEnd,
    stripeSubscriptionId: subscriptionId,
    status,
  });

  // 後方互換性のためusersテーブルを同期
  await syncEntitlementToUser(user.openId);

  await logEvent('subscription_created', user.id, {
    eventId,
    subscriptionId,
    plan,
    status,
    periodEnd: periodEnd.toISOString(),
  });

  console.log(`[Webhook][${eventId}] User ${user.openId} subscribed to ${plan} (status: ${status})`);
}

/**
 * Subscription更新時の処理
 *
 * 状態遷移:
 * - trialing → active (トライアル終了、初回決済成功)
 * - active → past_due (決済失敗)
 * - past_due → active (決済リトライ成功)
 * - active → canceled (ユーザーがキャンセル)
 * - any → inactive (その他の状態)
 *
 * @param subscription - Stripe Subscription
 * @param eventId - Webhook Event ID (冪等性・トレーサビリティ用)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, eventId: string) {
  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Webhook] No user found for customer: ${customerId}`);
    return;
  }

  const plan = getPlanFromSubscription(subscription);
  const periodEnd = new Date((subscription as any).current_period_end * 1000);
  const status = mapSubscriptionStatus(subscription.status);
  const isActive = status === 'active' || status === 'trialing';

  console.log(`[Webhook][${eventId}] Subscription updated for user ${user.openId}: plan=${plan}, status=${status}, active=${isActive}`);

  // ==================== Entitlements更新（唯一の真実） ====================
  await upsertEntitlement(user.openId, {
    plan: isActive ? plan : 'free',
    planExpiresAt: isActive ? periodEnd : null,
    stripeSubscriptionId: subscription.id,
    status,
  });

  // 後方互換性のためusersテーブルを同期
  await syncEntitlementToUser(user.openId);

  await logEvent('subscription_updated', user.id, {
    eventId,
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: isActive ? plan : 'free',
    periodEnd: periodEnd.toISOString(),
  });

  console.log(`[Webhook][${eventId}] User ${user.openId} subscription updated: ${plan} (${subscription.status})`);
}

/**
 * Subscription削除時の処理
 *
 * 状態遷移:
 * - any → canceled (plan: free)
 *
 * トリガー:
 * - ユーザーがサブスクリプションをキャンセル
 * - 決済リトライ失敗による自動キャンセル
 *
 * @param subscription - Stripe Subscription
 * @param eventId - Webhook Event ID (冪等性・トレーサビリティ用)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string) {
  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.warn(`[Webhook] No user found for customer: ${customerId}`);
    return;
  }

  console.log(`[Webhook][${eventId}] Subscription deleted for user ${user.openId}`);

  // ==================== Entitlements更新（唯一の真実） ====================
  await upsertEntitlement(user.openId, {
    plan: 'free',
    planExpiresAt: null,
    stripeSubscriptionId: null,
    status: 'canceled',
  });

  // 後方互換性のためusersテーブルを同期
  await syncEntitlementToUser(user.openId);

  await logEvent('subscription_deleted', user.id, {
    eventId,
    subscriptionId: subscription.id,
  });

  console.log(`[Webhook][${eventId}] User ${user.openId} subscription deleted, reverted to free`);
}

/**
 * Invoice決済成功時の処理
 *
 * 状態遷移:
 * - past_due → active (リトライ成功)
 * - active → active (次回期間の延長)
 *
 * トリガー:
 * - 定期課金の決済成功
 * - 決済リトライの成功
 *
 * @param invoice - Stripe Invoice
 * @param eventId - Webhook Event ID (冪等性・トレーサビリティ用)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
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
  const status = mapSubscriptionStatus(subscription.status);

  console.log(`[Webhook][${eventId}] Payment succeeded for user ${user.openId}: amount=${invoice.amount_paid}`);

  // ==================== Entitlements更新（唯一の真実） ====================
  await upsertEntitlement(user.openId, {
    plan,
    planExpiresAt: periodEnd,
    stripeSubscriptionId: subscriptionId,
    status,
  });

  // 後方互換性のためusersテーブルを同期
  await syncEntitlementToUser(user.openId);

  await logEvent('payment_succeeded', user.id, {
    eventId,
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    plan,
    periodEnd: periodEnd.toISOString(),
  });

  console.log(`[Webhook][${eventId}] Payment succeeded for user ${user.openId}`);
}

/**
 * Invoice決済失敗時の処理
 *
 * 状態遷移:
 * - active → past_due
 *
 * トリガー:
 * - 定期課金の決済失敗
 *
 * 備考:
 * - Stripeの設定により、数回リトライ後にsubscription.deletedが発火
 * - past_due状態では、ユーザーはプラン機能を利用可能（猶予期間）
 *
 * @param invoice - Stripe Invoice
 * @param eventId - Webhook Event ID (冪等性・トレーサビリティ用)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventId: string) {
  const customerId = invoice.customer as string;
  const user = await getUserByStripeCustomerId(customerId);

  if (!user) return;

  console.log(`[Webhook][${eventId}] Payment failed for user ${user.openId}: attempt=${invoice.attempt_count}`);

  // payment_failedの場合、statusをpast_dueに更新
  const subscriptionId = (invoice as any).subscription as string;
  if (subscriptionId) {
    await upsertEntitlement(user.openId, {
      status: 'past_due',
    });

    // 後方互換性のためusersテーブルを同期
    await syncEntitlementToUser(user.openId);
  }

  await logEvent('payment_failed', user.id, {
    eventId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  });

  console.log(`[Webhook][${eventId}] Payment failed for user ${user.openId}`);
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

/**
 * Stripe subscription statusをentitlements statusにマッピング
 */
function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'inactive';
  }
}
