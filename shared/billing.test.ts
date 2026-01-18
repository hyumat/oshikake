import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FREE_PLAN_LIMIT,
  FREE_STATS_DAYS,
  isPro,
  isPlus,
  getEffectivePlan,
  canCreateAttendance,
  calculatePlanStatus,
  getCurrentSeasonYear,
  getPlanLimit,
  getEntitlements,
  getStatsDateLimit,
  getPlanLimitMessage,
  getStatsLimitMessage,
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
      expect(canCreateAttendance('free', null, 15)).toBe(false);
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
      const status = calculatePlanStatus('free', null, 6);
      expect(status.remaining).toBe(1);
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
      expect(entitlements.canSeeMyPastPlans).toBe(false);
      expect(entitlements.canSeeCommunityTrends).toBe(false);
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
      expect(entitlements.canSeeMyPastPlans).toBe(true);
      expect(entitlements.canSeeCommunityTrends).toBe(false);
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
      expect(entitlements.canSeeMyPastPlans).toBe(true);
      expect(entitlements.canSeeCommunityTrends).toBe(true);
    });

    it('should treat expired pro as free', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const entitlements = getEntitlements('pro', past, 5);
      expect(entitlements.effectivePlan).toBe('free');
      expect(entitlements.maxAttendances).toBe(7);
      expect(entitlements.canExport).toBe(false);
      expect(entitlements.canMultiSeason).toBe(false);
      expect(entitlements.canSeeMyPastPlans).toBe(false);
      expect(entitlements.canSeeCommunityTrends).toBe(false);
    });

    it('should treat expired plus as free', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const entitlements = getEntitlements('plus', past, 5);
      expect(entitlements.effectivePlan).toBe('free');
      expect(entitlements.maxAttendances).toBe(7);
      expect(entitlements.canExport).toBe(false);
      expect(entitlements.canSeeMyPastPlans).toBe(false);
      expect(entitlements.canSeeCommunityTrends).toBe(false);
    });
  });

  describe('getStatsDateLimit', () => {
    it('should return 365 days limit for free plan', () => {
      const limit = getStatsDateLimit('free', null);
      expect(limit).not.toBeNull();

      const now = new Date();
      const expectedLimit = new Date();
      expectedLimit.setDate(expectedLimit.getDate() - FREE_STATS_DAYS);

      // Allow 1 second difference for test execution time
      const diff = Math.abs((limit!.getTime() - expectedLimit.getTime()) / 1000);
      expect(diff).toBeLessThan(1);
    });

    it('should return null for plus plan (unlimited)', () => {
      const limit = getStatsDateLimit('plus', null);
      expect(limit).toBeNull();
    });

    it('should return null for pro plan (unlimited)', () => {
      const limit = getStatsDateLimit('pro', null);
      expect(limit).toBeNull();
    });

    it('should return 365 days limit for expired pro plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const limit = getStatsDateLimit('pro', past);
      expect(limit).not.toBeNull();
    });

    it('should return 365 days limit for expired plus plan', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const limit = getStatsDateLimit('plus', past);
      expect(limit).not.toBeNull();
    });
  });

  describe('getPlanLimitMessage', () => {
    it('should return null for plus users', () => {
      const message = getPlanLimitMessage('plus', null, 5);
      expect(message).toBeNull();
    });

    it('should return null for pro users', () => {
      const message = getPlanLimitMessage('pro', null, 5);
      expect(message).toBeNull();
    });

    it('should return null for free users well under limit', () => {
      const message = getPlanLimitMessage('free', null, 3);
      expect(message).toBeNull();
    });

    it('should return warning for free users near limit', () => {
      const message = getPlanLimitMessage('free', null, 5);
      expect(message).toContain('あと2件で上限に達します');
      expect(message).toContain('7件まで');
    });

    it('should return warning for free users at limit-1', () => {
      const message = getPlanLimitMessage('free', null, 6);
      expect(message).toContain('あと1件で上限に達します');
    });

    it('should return limit reached message for free users at limit', () => {
      const message = getPlanLimitMessage('free', null, 7);
      expect(message).toContain('上限（7件）に達しました');
      expect(message).toContain('アップグレード');
    });

    it('should return limit reached message for free users over limit', () => {
      const message = getPlanLimitMessage('free', null, 10);
      expect(message).toContain('上限（7件）に達しました');
    });
  });

  describe('getStatsLimitMessage', () => {
    it('should return null for plus users', () => {
      const message = getStatsLimitMessage('plus', null);
      expect(message).toBeNull();
    });

    it('should return null for pro users', () => {
      const message = getStatsLimitMessage('pro', null);
      expect(message).toBeNull();
    });

    it('should return message for free users', () => {
      const message = getStatsLimitMessage('free', null);
      expect(message).toContain('過去365日間の集計のみ表示');
      expect(message).toContain('Plus/Proプラン');
    });

    it('should return message for expired pro users', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const message = getStatsLimitMessage('pro', past);
      expect(message).toContain('過去365日間の集計のみ表示');
    });

    it('should return message for expired plus users', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const message = getStatsLimitMessage('plus', past);
      expect(message).toContain('過去365日間の集計のみ表示');
    });
  });
});
