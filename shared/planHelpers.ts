/**
 * ユーザープラン判定ヘルパー関数
 * 
 * Free/Plus/Proの判定ロジックを一元管理
 * 将来のIAP追加にも耐える設計
 */

export type UserPlan = 'free' | 'plus' | 'pro';

export interface User {
  openId: string;
  name: string;
  plan?: UserPlan;
  // 将来の拡張用
  entitlements?: {
    plan: UserPlan;
    features: string[];
    expiresAt?: string;
  };
}

/**
 * ユーザーのプランを取得
 * 
 * @param user - ユーザーオブジェクト
 * @returns ユーザーのプラン（free/plus/pro）
 */
export function getUserPlan(user: User | null | undefined): UserPlan {
  if (!user) return 'free';
  
  // entitlementsテーブルから取得（将来実装）
  if (user.entitlements?.plan) {
    return user.entitlements.plan;
  }
  
  // 現状はデフォルトでfree
  return user.plan || 'free';
}

/**
 * 広告を表示すべきかどうかを判定
 * 
 * @param user - ユーザーオブジェクト
 * @returns Freeプランの場合はtrue、Plus/Proの場合はfalse
 */
export function canShowAds(user: User | null | undefined): boolean {
  const plan = getUserPlan(user);
  return plan === 'free';
}

/**
 * プラン別の機能制限を判定
 * 
 * @param user - ユーザーオブジェクト
 * @param feature - 機能名
 * @returns 機能が利用可能な場合はtrue
 */
export function canUseFeature(user: User | null | undefined, feature: string): boolean {
  const plan = getUserPlan(user);
  
  // 機能別の制限定義
  const featureAccess: Record<string, UserPlan[]> = {
    'savings': ['free', 'plus', 'pro'], // 貯金機能は全プランで利用可能
    'export': ['plus', 'pro'], // データエクスポートはPlus/Pro限定
    'advanced_stats': ['pro'], // 高度な統計はPro限定
  };
  
  const allowedPlans = featureAccess[feature] || ['free', 'plus', 'pro'];
  return allowedPlans.includes(plan);
}

/**
 * プラン表示名を取得
 * 
 * @param plan - プラン種別
 * @returns プランの表示名
 */
export function getPlanDisplayName(plan: UserPlan): string {
  const displayNames: Record<UserPlan, string> = {
    'free': 'Free',
    'plus': 'Plus',
    'pro': 'Pro',
  };
  
  return displayNames[plan];
}
