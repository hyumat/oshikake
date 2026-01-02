import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FREE_PLAN_LIMIT,
  isPro,
  getEffectivePlan,
  canCreateAttendance,
  calculatePlanStatus,
  getCurrentSeasonYear,
} from './billing';

describe('billing utilities', () => {
  describe('FREE_PLAN_LIMIT', () => {
    it('should be 10', () => {
      expect(FREE_PLAN_LIMIT).toBe(10);
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

  describe('getEffectivePlan', () => {
    it('should return free for free plan', () => {
      expect(getEffectivePlan('free', null)).toBe('free');
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
  });

  describe('canCreateAttendance', () => {
    const currentYear = new Date().getFullYear();

    it('should allow pro users to create attendance for any season', () => {
      expect(canCreateAttendance('pro', null, currentYear, 100)).toBe(true);
      expect(canCreateAttendance('pro', null, currentYear - 1, 0)).toBe(true);
    });

    it('should allow free users under limit for current season', () => {
      expect(canCreateAttendance('free', null, currentYear, 0)).toBe(true);
      expect(canCreateAttendance('free', null, currentYear, 5)).toBe(true);
      expect(canCreateAttendance('free', null, currentYear, 9)).toBe(true);
    });

    it('should block free users at limit', () => {
      expect(canCreateAttendance('free', null, currentYear, 10)).toBe(false);
      expect(canCreateAttendance('free', null, currentYear, 15)).toBe(false);
    });

    it('should block free users for past seasons', () => {
      expect(canCreateAttendance('free', null, currentYear - 1, 0)).toBe(false);
    });

    it('should block expired pro users at limit', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(canCreateAttendance('pro', past, currentYear, 10)).toBe(false);
    });
  });

  describe('calculatePlanStatus', () => {
    it('should return correct status for free user with no attendance', () => {
      const status = calculatePlanStatus('free', null, 0);
      expect(status.plan).toBe('free');
      expect(status.effectivePlan).toBe('free');
      expect(status.isPro).toBe(false);
      expect(status.attendanceCount).toBe(0);
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(10);
      expect(status.canCreate).toBe(true);
    });

    it('should return correct status for free user near limit', () => {
      const status = calculatePlanStatus('free', null, 8);
      expect(status.remaining).toBe(2);
      expect(status.canCreate).toBe(true);
    });

    it('should return correct status for free user at limit', () => {
      const status = calculatePlanStatus('free', null, 10);
      expect(status.remaining).toBe(0);
      expect(status.canCreate).toBe(false);
    });

    it('should return correct status for pro user', () => {
      const status = calculatePlanStatus('pro', null, 50);
      expect(status.plan).toBe('pro');
      expect(status.effectivePlan).toBe('pro');
      expect(status.isPro).toBe(true);
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
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(5);
      expect(status.canCreate).toBe(true);
    });
  });
});
