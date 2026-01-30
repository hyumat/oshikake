/**
 * Billing utilities for plan management
 * Issue #44: 無料プラン制限
 * Issue #50: 実効プラン値をAPIで統一（期限切れでもPro表示されない）
 * Issue #55: 3プラン対応（Free/Plus/Pro）
 * Issue #59: シーズン跨ぎでリセットされない
 * Issue #69: Plus/Pro両方を無制限に統一
 * Issue #67: Feature Gate / Entitlements一元管理
 * Issue #198: Free上限を7件に統一
 */

export const FREE_PLAN_LIMIT = 7;

export type Plan = 'free' | 'plus' | 'pro';

export interface Entitlements {
  effectivePlan: Plan;
  maxAttendances: number | null;
  canAddAttendance: boolean;
  canExport: boolean;
  canMultiSeason: boolean;
  canAdvancedStats: boolean;
  canPrioritySupport: boolean;
}

export interface PlanStatus {
  plan: Plan;
  effectivePlan: Plan;
  isPro: boolean;
  isPlus: boolean;
  seasonYear: number;
  attendanceCount: number;
  limit: number;
  remaining: number;
  canCreate: boolean;
  entitlements: Entitlements;
}

export function getCurrentSeasonYear(): number {
  return new Date().getFullYear();
}

export function isPaidPlan(plan: Plan, planExpiresAt: Date | null): boolean {
  if (plan === 'free') return false;
  if (planExpiresAt && planExpiresAt < new Date()) return false;
  return true;
}

export function isPro(plan: Plan, planExpiresAt: Date | null): boolean {
  if (plan !== 'pro') return false;
  if (planExpiresAt && planExpiresAt < new Date()) return false;
  return true;
}

export function isPlus(plan: Plan, planExpiresAt: Date | null): boolean {
  if (plan !== 'plus') return false;
  if (planExpiresAt && planExpiresAt < new Date()) return false;
  return true;
}

export function getEffectivePlan(plan: Plan, planExpiresAt: Date | null): Plan {
  if (!isPaidPlan(plan, planExpiresAt)) return 'free';
  return plan;
}

export function getPlanLimit(plan: Plan, planExpiresAt: Date | null): number {
  const effective = getEffectivePlan(plan, planExpiresAt);
  if (effective === 'pro' || effective === 'plus') return Infinity;
  return FREE_PLAN_LIMIT;
}

export function canCreateAttendance(
  plan: Plan,
  planExpiresAt: Date | null,
  currentCount: number
): boolean {
  const limit = getPlanLimit(plan, planExpiresAt);
  return currentCount < limit;
}

export function getEntitlements(
  plan: Plan,
  planExpiresAt: Date | null,
  currentAttendanceCount: number
): Entitlements {
  const effective = getEffectivePlan(plan, planExpiresAt);
  const limit = getPlanLimit(plan, planExpiresAt);
  const maxAttendances = limit === Infinity ? null : limit;
  const canAddAttendance = currentAttendanceCount < limit;
  
  return {
    effectivePlan: effective,
    maxAttendances,
    canAddAttendance,
    canExport: effective === 'plus' || effective === 'pro',
    canMultiSeason: effective === 'pro',
    canAdvancedStats: effective === 'pro',
    canPrioritySupport: effective === 'pro',
  };
}

export function calculatePlanStatus(
  plan: Plan,
  planExpiresAt: Date | null,
  attendanceCount: number
): PlanStatus {
  const userIsPro = isPro(plan, planExpiresAt);
  const userIsPlus = isPlus(plan, planExpiresAt);
  const effectivePlan = getEffectivePlan(plan, planExpiresAt);
  const seasonYear = getCurrentSeasonYear();
  const limit = getPlanLimit(plan, planExpiresAt);
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - attendanceCount);
  const canCreate = attendanceCount < limit;
  const entitlements = getEntitlements(plan, planExpiresAt, attendanceCount);

  return {
    plan,
    effectivePlan,
    isPro: userIsPro,
    isPlus: userIsPlus,
    seasonYear,
    attendanceCount,
    limit,
    remaining,
    canCreate,
    entitlements,
  };
}

export type Feature =
  | 'savings'
  | 'export'
  | 'advancedStats'
  | 'multiSeason'
  | 'prioritySupport'
  | 'noAds'
  | 'pastSelf';

const FEATURE_ACCESS: Record<Feature, Plan[]> = {
  savings: ['free', 'plus', 'pro'],
  export: ['plus', 'pro'],
  advancedStats: ['pro'],
  multiSeason: ['pro'],
  prioritySupport: ['pro'],
  noAds: ['plus', 'pro'],
  pastSelf: ['plus', 'pro'],
};

export function canUseFeature(
  plan: Plan,
  planExpiresAt: Date | null,
  feature: Feature
): boolean {
  const effective = getEffectivePlan(plan, planExpiresAt);
  return FEATURE_ACCESS[feature].includes(effective);
}

export function shouldShowAds(plan: Plan, planExpiresAt: Date | null): boolean {
  return !canUseFeature(plan, planExpiresAt, 'noAds');
}

export function getPlanDisplayName(plan: Plan): string {
  const names: Record<Plan, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
  };
  return names[plan];
}
