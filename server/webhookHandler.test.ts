/**
 * Tests for Webhook Handler
 * Issue #116: Webhook冪等性とentitlements正規化
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';

// Mock modules
vi.mock('./stripeClient', () => ({
  getStripeClient: vi.fn(),
  getWebhookSecret: vi.fn(),
}));

vi.mock('./db', () => ({
  getUserByStripeCustomerId: vi.fn(),
  isWebhookProcessed: vi.fn(),
  recordWebhookEvent: vi.fn(),
  updateWebhookEventStatus: vi.fn(),
  upsertEntitlement: vi.fn(),
  syncEntitlementToUser: vi.fn(),
  logEvent: vi.fn(),
}));

import { handleStripeWebhook } from './webhookHandler';
import { getStripeClient, getWebhookSecret } from './stripeClient';
import {
  getUserByStripeCustomerId,
  isWebhookProcessed,
  recordWebhookEvent,
  updateWebhookEventStatus,
  upsertEntitlement,
  syncEntitlementToUser,
  logEvent,
} from './db';

describe('Stripe Webhook Handler', () => {
  let mockStripeClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockStripeClient = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    };

    vi.mocked(getStripeClient).mockResolvedValue(mockStripeClient as any);
    vi.mocked(getWebhookSecret).mockResolvedValue('whsec_test_secret');
    vi.mocked(isWebhookProcessed).mockResolvedValue(false);
    vi.mocked(recordWebhookEvent).mockResolvedValue({
      id: 1,
      eventId: 'evt_test',
      eventType: 'test.event',
      processedAt: new Date(),
      payload: '{}',
      status: 'success',
      errorMessage: null,
    });
    vi.mocked(updateWebhookEventStatus).mockResolvedValue(undefined);
    vi.mocked(upsertEntitlement).mockResolvedValue({
      id: 1,
      userId: 'user_123',
      plan: 'plus',
      planExpiresAt: new Date(),
      stripeSubscriptionId: 'sub_123',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(syncEntitlementToUser).mockResolvedValue(undefined);
    vi.mocked(logEvent).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Idempotency', () => {
    it('should skip processing if event already processed', async () => {
      const rawBody = Buffer.from(JSON.stringify({
        id: 'evt_already_processed',
        type: 'checkout.session.completed',
        data: { object: {} },
      }));
      const signature = 'test_signature';

      const mockEvent: Stripe.Event = {
        id: 'evt_already_processed',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: {} as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(isWebhookProcessed).mockResolvedValue(true);

      const result = await handleStripeWebhook(rawBody, signature);

      expect(result).toEqual({ received: true });
      expect(isWebhookProcessed).toHaveBeenCalledWith('evt_already_processed');
      expect(recordWebhookEvent).not.toHaveBeenCalled();
      expect(upsertEntitlement).not.toHaveBeenCalled();
    });

    it('should record webhook event before processing', async () => {
      const rawBody = Buffer.from(JSON.stringify({
        id: 'evt_new',
        type: 'checkout.session.completed',
        data: { object: {} },
      }));
      const signature = 'test_signature';

      const mockEvent: Stripe.Event = {
        id: 'evt_new',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: {
          object: {
            customer: 'cus_123',
            subscription: null,
          } as any,
        },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null);

      await handleStripeWebhook(rawBody, signature);

      expect(recordWebhookEvent).toHaveBeenCalledWith({
        eventId: 'evt_new',
        eventType: 'checkout.session.completed',
        payload: JSON.stringify(mockEvent),
        status: 'success',
      });
    });

    it('should update webhook status to success after processing', async () => {
      const rawBody = Buffer.from(JSON.stringify({
        id: 'evt_success',
        type: 'checkout.session.completed',
        data: { object: {} },
      }));
      const signature = 'test_signature';

      const mockEvent: Stripe.Event = {
        id: 'evt_success',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: {
          object: {
            customer: 'cus_123',
            subscription: null,
          } as any,
        },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null);

      await handleStripeWebhook(rawBody, signature);

      expect(updateWebhookEventStatus).toHaveBeenCalledWith('evt_success', 'success');
    });

    it('should update webhook status to failed on error', async () => {
      const rawBody = Buffer.from(JSON.stringify({
        id: 'evt_fail',
        type: 'checkout.session.completed',
        data: { object: {} },
      }));
      const signature = 'test_signature';

      const mockEvent: Stripe.Event = {
        id: 'evt_fail',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123',
          } as any,
        },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const error = new Error('Database error');
      mockStripeClient.subscriptions.retrieve.mockRejectedValue(error);

      await expect(handleStripeWebhook(rawBody, signature)).rejects.toThrow('Database error');

      expect(updateWebhookEventStatus).toHaveBeenCalledWith('evt_fail', 'failed', 'Database error');
    });
  });

  describe('Signature Verification', () => {
    it('should verify webhook signature when secret is configured', async () => {
      const rawBody = Buffer.from('test_payload');
      const signature = 'test_signature';
      const mockEvent: Stripe.Event = {
        id: 'evt_sig',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: {} as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null);

      await handleStripeWebhook(rawBody, signature);

      expect(mockStripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        'whsec_test_secret'
      );
    });

    it('should throw error on signature verification failure', async () => {
      const rawBody = Buffer.from('test_payload');
      const signature = 'invalid_signature';

      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      await expect(handleStripeWebhook(rawBody, signature)).rejects.toThrow(
        'Webhook signature verification failed'
      );
    });

    it('should skip verification if no webhook secret configured', async () => {
      vi.mocked(getWebhookSecret).mockResolvedValue('');

      const rawBody = Buffer.from(JSON.stringify({
        id: 'evt_no_secret',
        type: 'checkout.session.completed',
        data: { object: {} },
      }));
      const signature = 'test_signature';

      vi.mocked(getUserByStripeCustomerId).mockResolvedValue(null);

      await handleStripeWebhook(rawBody, signature);

      expect(mockStripeClient.webhooks.constructEvent).not.toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed', () => {
    it('should create entitlement for new subscription', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

      const mockEvent: Stripe.Event = {
        id: 'evt_checkout',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123',
          } as any,
        },
        request: null,
      };

      const mockSubscription: any = {
        id: 'sub_123',
        status: 'active',
        current_period_end: periodEnd,
        items: {
          data: [
            {
              price: {
                product: {
                  metadata: { plan: 'plus' },
                },
              },
            },
          ],
        },
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockStripeClient.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        plan: 'plus',
        planExpiresAt: new Date(periodEnd * 1000),
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      });

      expect(syncEntitlementToUser).toHaveBeenCalledWith('user_123');
      expect(logEvent).toHaveBeenCalledWith('subscription_created', 1, expect.any(Object));
    });

    it('should skip if customer or subscription missing', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_incomplete',
        object: 'event',
        type: 'checkout.session.completed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: {
          object: {
            customer: null,
            subscription: null,
          } as any,
        },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('should update entitlement on subscription update (active)', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const mockSubscription: any = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_end: periodEnd,
        items: {
          data: [
            {
              price: {
                product: {
                  metadata: { plan: 'pro' },
                },
              },
            },
          ],
        },
      };

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_update',
        object: 'event',
        type: 'customer.subscription.updated',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: mockSubscription as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        plan: 'pro',
        planExpiresAt: new Date(periodEnd * 1000),
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      });

      expect(syncEntitlementToUser).toHaveBeenCalledWith('user_123');
    });

    it('should downgrade to free when subscription becomes inactive', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const mockSubscription: any = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'canceled',
        current_period_end: periodEnd,
        items: {
          data: [
            {
              price: {
                product: {
                  metadata: { plan: 'plus' },
                },
              },
            },
          ],
        },
      };

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_cancel',
        object: 'event',
        type: 'customer.subscription.updated',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: mockSubscription as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        plan: 'free',
        planExpiresAt: null,
        stripeSubscriptionId: 'sub_123',
        status: 'canceled',
      });
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should revert to free plan on subscription deletion', async () => {
      const mockSubscription: any = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'canceled',
      };

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_delete',
        object: 'event',
        type: 'customer.subscription.deleted',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: mockSubscription as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        plan: 'free',
        planExpiresAt: null,
        stripeSubscriptionId: null,
        status: 'canceled',
      });

      expect(syncEntitlementToUser).toHaveBeenCalledWith('user_123');
      expect(logEvent).toHaveBeenCalledWith('subscription_deleted', 1, expect.any(Object));
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('should update entitlement on successful payment', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const mockInvoice: any = {
        id: 'in_123',
        customer: 'cus_123',
        subscription: 'sub_123',
        amount_paid: 1000,
      };

      const mockSubscription: any = {
        id: 'sub_123',
        status: 'active',
        current_period_end: periodEnd,
        items: {
          data: [
            {
              price: {
                product: {
                  metadata: { plan: 'plus' },
                },
              },
            },
          ],
        },
      };

      const mockEvent: Stripe.Event = {
        id: 'evt_payment_success',
        object: 'event',
        type: 'invoice.payment_succeeded',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: mockInvoice as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockStripeClient.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        plan: 'plus',
        planExpiresAt: new Date(periodEnd * 1000),
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      });

      expect(logEvent).toHaveBeenCalledWith('payment_succeeded', 1, expect.objectContaining({
        eventId: 'evt_payment_success',
        amount: 1000,
      }));
    });
  });

  describe('invoice.payment_failed', () => {
    it('should update status to past_due on payment failure', async () => {
      const mockInvoice: any = {
        id: 'in_123',
        customer: 'cus_123',
        subscription: 'sub_123',
        attempt_count: 2,
      };

      const mockEvent: Stripe.Event = {
        id: 'evt_payment_fail',
        object: 'event',
        type: 'invoice.payment_failed',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: mockInvoice as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);
      vi.mocked(getUserByStripeCustomerId).mockResolvedValue({
        id: 1,
        openId: 'user_123',
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await handleStripeWebhook(rawBody, 'sig');

      expect(upsertEntitlement).toHaveBeenCalledWith('user_123', {
        status: 'past_due',
      });

      expect(syncEntitlementToUser).toHaveBeenCalledWith('user_123');
      expect(logEvent).toHaveBeenCalledWith('payment_failed', 1, expect.objectContaining({
        eventId: 'evt_payment_fail',
        attemptCount: 2,
      }));
    });
  });

  describe('Unhandled Events', () => {
    it('should log unhandled event types without error', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_unknown',
        object: 'event',
        type: 'customer.created' as any,
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        api_version: '2024-01-01',
        data: { object: {} as any },
        request: null,
      };

      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      const result = await handleStripeWebhook(rawBody, 'sig');

      expect(result).toEqual({ received: true });
      expect(updateWebhookEventStatus).toHaveBeenCalledWith('evt_unknown', 'success');
    });
  });
});
