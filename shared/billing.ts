/**
 * Billing utilities for plan management
 * Issue #44: 無料プラン制限（10件まで）
 * Issue #50: 実効プラン値をAPIで統一（期限切れでもPro表示されない）
 * Issue #55: 3プラン対応（Free/Plus/Pro）
 * Issue #59: シーズン跨ぎでリセットされない
 * Issue #69: Plus/Pro両方を無制限に統一
 * Issue #67: Feature Gate / Entitlements一元管理
 * Issue #78: Freeプラン制限を7件に変更
 */

export const FREE_PLAN_LIMIT = 10; // Issue #172: 7件→10件に変更
export const FREE_STATS_DAYS = 365; // Issue #78: Freeプランは過去365日分のみ集計

export type Plan = 'free' | 'plus' | 'pro';

export interface Entitlements {
  effectivePlan: Plan;
  maxAttendances: number | null;
  canAddAttendance: boolean;
  canExport: boolean;
  canMultiSeason: boolean;
  canAdvancedStats: boolean;
  canPrioritySupport: boolean;
  // Issue #83: Plus/Pro entitlements
  canSeeMyPastPlans: boolean; // Plus/Pro: 過去の自分の計画を振り返る
  canSeeCommunityTrends: boolean; // Pro: 他の人の傾向をAI分析
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
    // Issue #83: Plus/Pro entitlements
    canSeeMyPastPlans: effective === 'plus' || effective === 'pro',
    canSeeCommunityTrends: effective === 'pro',
  };
}

/**
 * Issue #78: Freeプランの集計期間制限を計算
 * @param plan ユーザーのプラン
 * @param planExpiresAt プラン有効期限
 * @returns Freeプランの場合は過去365日の開始日、Plus/Proの場合はnull（無制限）
 */
export function getStatsDateLimit(
  plan: Plan,
  planExpiresAt: Date | null
): Date | null {
  const effective = getEffectivePlan(plan, planExpiresAt);
  if (effective === 'free') {
    const limit = new Date();
    limit.setDate(limit.getDate() - FREE_STATS_DAYS);
    return limit;
  }
  return null; // Plus/Proは無制限
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

/**
 * Issue #106: プラン制限メッセージを取得
 * @param plan ユーザーのプラン
 * @param planExpiresAt プラン有効期限
 * @param currentCount 現在の記録数
 * @returns UIに表示するメッセージ
 */
export function getPlanLimitMessage(
  plan: Plan,
  planExpiresAt: Date | null,
  currentCount: number
): string | null {
  const effective = getEffectivePlan(plan, planExpiresAt);
  if (effective !== 'free') return null;

  const limit = FREE_PLAN_LIMIT;
  const remaining = Math.max(0, limit - currentCount);

  if (remaining === 0) {
    return `Freeプランの上限（${limit}件）に達しました。記録を削除するか、Plus/Proプランにアップグレードしてください。`;
  }

  if (remaining <= 2) {
    return `あと${remaining}件で上限に達します（Freeプラン: ${limit}件まで）`;
  }

  return null;
}

/**
 * Issue #106: Stats期間制限メッセージを取得
 * @param plan ユーザーのプラン
 * @param planExpiresAt プラン有効期限
 * @returns UIに表示するメッセージ
 */
export function getStatsLimitMessage(
  plan: Plan,
  planExpiresAt: Date | null
): string | null {
  const effective = getEffectivePlan(plan, planExpiresAt);
  if (effective !== 'free') return null;

  return `Freeプランは過去${FREE_STATS_DAYS}日間の集計のみ表示されます。Plus/Proプランで全期間の集計を表示できます。`;
}
