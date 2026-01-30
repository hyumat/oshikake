import { describe, expect, it } from 'vitest';
import {
  canShowAds,
  canUseFeature,
  getPlanDisplayName,
  getUserPlan,
  type User,
  type UserPlan,
} from './planHelpers';

describe('planHelpers', () => {
  describe('getUserPlan', () => {
    it('should return "free" for null user', () => {
      expect(getUserPlan(null)).toBe('free');
    });

    it('should return "free" for undefined user', () => {
      expect(getUserPlan(undefined)).toBe('free');
    });

    it('should return plan from user.plan', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        plan: 'plus',
      };
      expect(getUserPlan(user)).toBe('plus');
    });

    it('should return plan from user.entitlements.plan if present', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        plan: 'free',
        entitlements: {
          plan: 'pro',
          features: [],
        },
      };
      expect(getUserPlan(user)).toBe('pro');
    });

    it('should default to "free" if no plan specified', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
      };
      expect(getUserPlan(user)).toBe('free');
    });
  });

  describe('canShowAds', () => {
    it('should return true for free plan', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        plan: 'free',
      };
      expect(canShowAds(user)).toBe(true);
    });

    it('should return true for null user (anonymous)', () => {
      expect(canShowAds(null)).toBe(true);
    });

    it('should return true for undefined user', () => {
      expect(canShowAds(undefined)).toBe(true);
    });

    it('should return false for plus plan', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        plan: 'plus',
      };
      expect(canShowAds(user)).toBe(false);
    });

    it('should return false for pro plan', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        plan: 'pro',
      };
      expect(canShowAds(user)).toBe(false);
    });

    it('should return false for plus plan from entitlements', () => {
      const user: User = {
        openId: 'test-user',
        name: 'Test User',
        entitlements: {
          plan: 'plus',
          features: [],
        },
      };
      expect(canShowAds(user)).toBe(false);
    });
  });

  describe('canUseFeature', () => {
    it('should allow savings feature for all plans', () => {
      const freeUser: User = { openId: '1', name: 'Free', plan: 'free' };
      const plusUser: User = { openId: '2', name: 'Plus', plan: 'plus' };
      const proUser: User = { openId: '3', name: 'Pro', plan: 'pro' };

      expect(canUseFeature(freeUser, 'savings')).toBe(true);
      expect(canUseFeature(plusUser, 'savings')).toBe(true);
      expect(canUseFeature(proUser, 'savings')).toBe(true);
    });

    it('should restrict export feature to plus and pro', () => {
      const freeUser: User = { openId: '1', name: 'Free', plan: 'free' };
      const plusUser: User = { openId: '2', name: 'Plus', plan: 'plus' };
      const proUser: User = { openId: '3', name: 'Pro', plan: 'pro' };

      expect(canUseFeature(freeUser, 'export')).toBe(false);
      expect(canUseFeature(plusUser, 'export')).toBe(true);
      expect(canUseFeature(proUser, 'export')).toBe(true);
    });

    it('should restrict advanced_stats feature to pro only', () => {
      const freeUser: User = { openId: '1', name: 'Free', plan: 'free' };
      const plusUser: User = { openId: '2', name: 'Plus', plan: 'plus' };
      const proUser: User = { openId: '3', name: 'Pro', plan: 'pro' };

      expect(canUseFeature(freeUser, 'advanced_stats')).toBe(false);
      expect(canUseFeature(plusUser, 'advanced_stats')).toBe(false);
      expect(canUseFeature(proUser, 'advanced_stats')).toBe(true);
    });

    it('should allow unknown features for all plans', () => {
      const freeUser: User = { openId: '1', name: 'Free', plan: 'free' };
      const plusUser: User = { openId: '2', name: 'Plus', plan: 'plus' };
      const proUser: User = { openId: '3', name: 'Pro', plan: 'pro' };

      expect(canUseFeature(freeUser, 'unknown_feature')).toBe(true);
      expect(canUseFeature(plusUser, 'unknown_feature')).toBe(true);
      expect(canUseFeature(proUser, 'unknown_feature')).toBe(true);
    });

    it('should handle null user (defaults to free plan)', () => {
      expect(canUseFeature(null, 'export')).toBe(false);
      expect(canUseFeature(null, 'savings')).toBe(true);
    });
  });

  describe('getPlanDisplayName', () => {
    it('should return "Free" for free plan', () => {
      expect(getPlanDisplayName('free')).toBe('Free');
    });

    it('should return "Plus" for plus plan', () => {
      expect(getPlanDisplayName('plus')).toBe('Plus');
    });

    it('should return "Pro" for pro plan', () => {
      expect(getPlanDisplayName('pro')).toBe('Pro');
    });
  });
});
