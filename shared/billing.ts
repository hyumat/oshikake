/**
 * Billing utilities for plan management
 * Issue #44: 無料プラン制限（10件まで）
 * Issue #50: 実効プラン値をAPIで統一（期限切れでもPro表示されない）
 * Issue #59: シーズン跨ぎでリセットされない
 */

export const FREE_PLAN_LIMIT = 10;

export type Plan = 'free' | 'pro';

export interface PlanStatus {
  plan: Plan;
  effectivePlan: Plan;
  isPro: boolean;
  seasonYear: number;
  attendanceCount: number;
  limit: number;
  remaining: number;
  canCreate: boolean;
}

export function getCurrentSeasonYear(): number {
  return new Date().getFullYear();
}

export function isPro(plan: Plan, planExpiresAt: Date | null): boolean {
  if (plan !== 'pro') return false;
  if (planExpiresAt && planExpiresAt < new Date()) return false;
  return true;
}

export function getEffectivePlan(plan: Plan, planExpiresAt: Date | null): Plan {
  return isPro(plan, planExpiresAt) ? 'pro' : 'free';
}

export function canCreateAttendance(
  plan: Plan,
  planExpiresAt: Date | null,
  seasonYear: number,
  currentCount: number
): boolean {
  if (isPro(plan, planExpiresAt)) return true;
  const currentSeasonYear = getCurrentSeasonYear();
  if (seasonYear !== currentSeasonYear) return false;
  return currentCount < FREE_PLAN_LIMIT;
}

export function calculatePlanStatus(
  plan: Plan,
  planExpiresAt: Date | null,
  attendanceCount: number
): PlanStatus {
  const userIsPro = isPro(plan, planExpiresAt);
  const effectivePlan = getEffectivePlan(plan, planExpiresAt);
  const seasonYear = getCurrentSeasonYear();
  const limit = userIsPro ? Infinity : FREE_PLAN_LIMIT;
  const remaining = userIsPro ? Infinity : Math.max(0, FREE_PLAN_LIMIT - attendanceCount);
  const canCreate = userIsPro || attendanceCount < FREE_PLAN_LIMIT;

  return {
    plan,
    effectivePlan,
    isPro: userIsPro,
    seasonYear,
    attendanceCount,
    limit,
    remaining,
    canCreate,
  };
}
