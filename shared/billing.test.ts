import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FREE_PLAN_LIMIT,
  isPro,
  isPlus,
  getEffectivePlan,
  canCreateAttendance,
  calculatePlanStatus,
  getCurrentSeasonYear,
  getPlanLimit,
  getEntitlements,
  canUseFeature,
  shouldShowAds,
  getPlanDisplayName,
} from './billing';

describe('billing utilities', () => {
  describe('Plan Limits', () => {
    it('FREE_PLAN_LIMIT should be 7', () => {
      expect(FREE_PLAN_LIMIT).toBe(7);
    });

    it('Plus plan should have unlimited records', () => {
      expect(getPlanLimit('plus', null)).toBe(Infinity);
    });

    it('Pro plan should have unlimited records', () => {
      expect(getPlanLimit('pro', null)).toBe(Infinity);
    });
  });

  describe('getCurrentSeasonYear', () => {
    it('should return current year', () => {
      const year = getCurrentSeasonYear();
      expect(year).toBe(new Date().getFullYear());
    });
  });

  describe('isPro', () => {
    it('should return false for free plan', () => {
      expect(isPro('free', null)).toBe(false);
    });

    it('should return false for plus plan', () => {
      expect(isPro('plus', null)).toBe(false);
    });

    it('should return true for pro plan without expiry', () => {
      expect(isPro('pro', null)).toBe(true);
    });

    it('should return true for pro plan with future expiry', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(isPro('pro', future)).toBe(true);
    });

    it('should return false for expired pro plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(isPro('pro', past)).toBe(false);
    });
  });

  describe('isPlus', () => {
    it('should return false for free plan', () => {
      expect(isPlus('free', null)).toBe(false);
    });

    it('should return true for plus plan without expiry', () => {
      expect(isPlus('plus', null)).toBe(true);
    });

    it('should return false for pro plan', () => {
      expect(isPlus('pro', null)).toBe(false);
    });

    it('should return false for expired plus plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(isPlus('plus', past)).toBe(false);
    });
  });

  describe('getEffectivePlan', () => {
    it('should return free for free plan', () => {
      expect(getEffectivePlan('free', null)).toBe('free');
    });

    it('should return plus for active plus plan', () => {
      expect(getEffectivePlan('plus', null)).toBe('plus');
    });

    it('should return pro for active pro plan', () => {
      expect(getEffectivePlan('pro', null)).toBe('pro');
    });

    it('should return pro for pro plan with future expiry', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(getEffectivePlan('pro', future)).toBe('pro');
    });

    it('should return free for expired pro plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(getEffectivePlan('pro', past)).toBe('free');
    });

    it('should return free for expired plus plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(getEffectivePlan('plus', past)).toBe('free');
    });
  });

  describe('canCreateAttendance', () => {
    it('should allow pro users to create attendance regardless of count', () => {
      expect(canCreateAttendance('pro', null, 100)).toBe(true);
      expect(canCreateAttendance('pro', null, 0)).toBe(true);
    });

    it('should allow plus users to create attendance regardless of count (unlimited)', () => {
      expect(canCreateAttendance('plus', null, 0)).toBe(true);
      expect(canCreateAttendance('plus', null, 15)).toBe(true);
      expect(canCreateAttendance('plus', null, 100)).toBe(true);
      expect(canCreateAttendance('plus', null, 1000)).toBe(true);
    });

    it('should allow free users under limit', () => {
      expect(canCreateAttendance('free', null, 0)).toBe(true);
      expect(canCreateAttendance('free', null, 5)).toBe(true);
      expect(canCreateAttendance('free', null, 6)).toBe(true);
    });

    it('should block free users at limit', () => {
      expect(canCreateAttendance('free', null, 7)).toBe(false);
      expect(canCreateAttendance('free', null, 10)).toBe(false);
    });

    it('should block expired pro users at limit', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(canCreateAttendance('pro', past, 7)).toBe(false);
    });

    it('should block expired plus users at free limit', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(canCreateAttendance('plus', past, 7)).toBe(false);
    });
  });

  describe('calculatePlanStatus', () => {
    it('should return correct status for free user with no attendance', () => {
      const status = calculatePlanStatus('free', null, 0);
      expect(status.plan).toBe('free');
      expect(status.effectivePlan).toBe('free');
      expect(status.isPro).toBe(false);
      expect(status.isPlus).toBe(false);
      expect(status.attendanceCount).toBe(0);
      expect(status.limit).toBe(7);
      expect(status.remaining).toBe(7);
      expect(status.canCreate).toBe(true);
    });

    it('should return correct status for free user near limit', () => {
      const status = calculatePlanStatus('free', null, 5);
      expect(status.remaining).toBe(2);
      expect(status.canCreate).toBe(true);
    });

    it('should return correct status for free user at limit', () => {
      const status = calculatePlanStatus('free', null, 7);
      expect(status.remaining).toBe(0);
      expect(status.canCreate).toBe(false);
    });

    it('should return correct status for plus user (unlimited)', () => {
      const status = calculatePlanStatus('plus', null, 15);
      expect(status.plan).toBe('plus');
      expect(status.effectivePlan).toBe('plus');
      expect(status.isPro).toBe(false);
      expect(status.isPlus).toBe(true);
      expect(status.limit).toBe(Infinity);
      expect(status.remaining).toBe(Infinity);
      expect(status.canCreate).toBe(true);
    });

    it('should allow plus user to create even with many records', () => {
      const status = calculatePlanStatus('plus', null, 1000);
      expect(status.remaining).toBe(Infinity);
      expect(status.canCreate).toBe(true);
    });

    it('should return correct status for pro user', () => {
      const status = calculatePlanStatus('pro', null, 50);
      expect(status.plan).toBe('pro');
      expect(status.effectivePlan).toBe('pro');
      expect(status.isPro).toBe(true);
      expect(status.isPlus).toBe(false);
      expect(status.limit).toBe(Infinity);
      expect(status.remaining).toBe(Infinity);
      expect(status.canCreate).toBe(true);
    });

    it('should return effectivePlan as free for expired pro user', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const status = calculatePlanStatus('pro', past, 5);
      expect(status.plan).toBe('pro');
      expect(status.effectivePlan).toBe('free');
      expect(status.isPro).toBe(false);
      expect(status.isPlus).toBe(false);
      expect(status.limit).toBe(7);
      expect(status.remaining).toBe(2);
      expect(status.canCreate).toBe(true);
    });

    it('should return effectivePlan as free for expired plus user', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const status = calculatePlanStatus('plus', past, 5);
      expect(status.plan).toBe('plus');
      expect(status.effectivePlan).toBe('free');
      expect(status.isPro).toBe(false);
      expect(status.isPlus).toBe(false);
      expect(status.limit).toBe(7);
      expect(status.remaining).toBe(2);
      expect(status.canCreate).toBe(true);
    });

    it('should include entitlements in plan status', () => {
      const status = calculatePlanStatus('pro', null, 50);
      expect(status.entitlements).toBeDefined();
      expect(status.entitlements.effectivePlan).toBe('pro');
      expect(status.entitlements.canAddAttendance).toBe(true);
    });
  });

  describe('getEntitlements', () => {
    it('should return correct entitlements for free user', () => {
      const entitlements = getEntitlements('free', null, 5);
      expect(entitlements.effectivePlan).toBe('free');
      expect(entitlements.maxAttendances).toBe(7);
      expect(entitlements.canAddAttendance).toBe(true);
      expect(entitlements.canExport).toBe(false);
      expect(entitlements.canMultiSeason).toBe(false);
      expect(entitlements.canAdvancedStats).toBe(false);
      expect(entitlements.canPrioritySupport).toBe(false);
    });

    it('should block attendance for free user at limit', () => {
      const entitlements = getEntitlements('free', null, 7);
      expect(entitlements.canAddAttendance).toBe(false);
    });

    it('should return correct entitlements for plus user', () => {
      const entitlements = getEntitlements('plus', null, 100);
      expect(entitlements.effectivePlan).toBe('plus');
      expect(entitlements.maxAttendances).toBe(null);
      expect(entitlements.canAddAttendance).toBe(true);
      expect(entitlements.canExport).toBe(true);
      expect(entitlements.canMultiSeason).toBe(false);
      expect(entitlements.canAdvancedStats).toBe(false);
      expect(entitlements.canPrioritySupport).toBe(false);
    });

    it('should return correct entitlements for pro user', () => {
      const entitlements = getEntitlements('pro', null, 1000);
      expect(entitlements.effectivePlan).toBe('pro');
      expect(entitlements.maxAttendances).toBe(null);
      expect(entitlements.canAddAttendance).toBe(true);
      expect(entitlements.canExport).toBe(true);
      expect(entitlements.canMultiSeason).toBe(true);
      expect(entitlements.canAdvancedStats).toBe(true);
      expect(entitlements.canPrioritySupport).toBe(true);
    });

    it('should treat expired pro as free', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const entitlements = getEntitlements('pro', past, 5);
      expect(entitlements.effectivePlan).toBe('free');
      expect(entitlements.maxAttendances).toBe(7);
      expect(entitlements.canExport).toBe(false);
      expect(entitlements.canMultiSeason).toBe(false);
    });

    it('should treat expired plus as free', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const entitlements = getEntitlements('plus', past, 5);
      expect(entitlements.effectivePlan).toBe('free');
      expect(entitlements.maxAttendances).toBe(7);
      expect(entitlements.canExport).toBe(false);
    });
  });

  describe('canUseFeature', () => {
    it('should allow savings for all plans', () => {
      expect(canUseFeature('free', null, 'savings')).toBe(true);
      expect(canUseFeature('plus', null, 'savings')).toBe(true);
      expect(canUseFeature('pro', null, 'savings')).toBe(true);
    });

    it('should allow export only for plus and pro', () => {
      expect(canUseFeature('free', null, 'export')).toBe(false);
      expect(canUseFeature('plus', null, 'export')).toBe(true);
      expect(canUseFeature('pro', null, 'export')).toBe(true);
    });

    it('should allow advancedStats only for pro', () => {
      expect(canUseFeature('free', null, 'advancedStats')).toBe(false);
      expect(canUseFeature('plus', null, 'advancedStats')).toBe(false);
      expect(canUseFeature('pro', null, 'advancedStats')).toBe(true);
    });

    it('should treat expired pro as free', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(canUseFeature('pro', past, 'export')).toBe(false);
      expect(canUseFeature('pro', past, 'advancedStats')).toBe(false);
    });
  });

  describe('shouldShowAds', () => {
    it('should show ads for free plan', () => {
      expect(shouldShowAds('free', null)).toBe(true);
    });

    it('should not show ads for plus plan', () => {
      expect(shouldShowAds('plus', null)).toBe(false);
    });

    it('should not show ads for pro plan', () => {
      expect(shouldShowAds('pro', null)).toBe(false);
    });

    it('should show ads for expired paid plans', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(shouldShowAds('plus', past)).toBe(true);
      expect(shouldShowAds('pro', past)).toBe(true);
    });
  });

  describe('getPlanDisplayName', () => {
    it('should return correct display names', () => {
      expect(getPlanDisplayName('free')).toBe('Free');
      expect(getPlanDisplayName('plus')).toBe('Plus');
      expect(getPlanDisplayName('pro')).toBe('Pro');
    });
  });
});
