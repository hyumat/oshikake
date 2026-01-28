/**
 * AdBanner - 広告バナーコンポーネント
 * 
 * Freeプランのユーザーにのみ表示される広告枠
 * Plus/Proでは何も表示しない（DOMごと出さない）
 * 
 * MVPではプレースホルダを表示し、後から広告プロバイダを差し替え可能
 */

import { useAuth } from '@/_core/hooks/useAuth';

export type AdPlacement = 'matchLog' | 'stats' | 'home';

interface AdBannerProps {
  /**
   * 広告の配置場所
   * - matchLog: マッチログ一覧ページ
   * - stats: 集計ページ
   * - home: ホームページ
   */
  placement: AdPlacement;
  
  /**
   * カスタムクラス名
   */
  className?: string;
}

/**
 * ユーザーのプランを判定（簡易版）
 * 
 * TODO: server/lib/planHelpers.tsと統合
 */
function canShowAds(user: any): boolean {
  if (!user) return true; // 未ログインはFreeとして扱う
  
  // 現状はすべてのユーザーをFreeとして扱う
  // 将来的にはentitlements/planから判定
  const plan = user.plan || 'free';
  return plan === 'free';
}

export function AdBanner({ placement, className = '' }: AdBannerProps) {
  const { user } = useAuth();
  
  // Plus/Proでは何も表示しない
  if (!canShowAds(user)) {
    return null;
  }
  
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* 広告ラベル */}
        <div className="text-xs text-gray-400 mb-1">広告</div>
        
        {/* 広告枠（プレースホルダ） */}
        <div 
          className="w-full h-24 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg flex items-center justify-center"
          data-ad-placement={placement}
        >
          <div className="text-center">
            <div className="text-gray-400 text-sm font-medium">
              広告枠（プレースホルダ）
            </div>
            <div className="text-gray-300 text-xs mt-1">
              {placement === 'matchLog' && 'マッチログ一覧'}
              {placement === 'stats' && '集計ページ'}
              {placement === 'home' && 'ホームページ'}
            </div>
          </div>
        </div>
        
        {/* 将来の広告プロバイダ統合用のコメント */}
        {/* 
          広告プロバイダ統合時の実装例：
          
          <div 
            id={`ad-${placement}`}
            className="w-full min-h-[96px]"
            data-ad-client="ca-pub-XXXXX"
            data-ad-slot="XXXXX"
          />
          
          または
          
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
            data-ad-client="ca-pub-XXXXX"
          />
        */}
      </div>
    </div>
  );
}

/**
 * AdBannerContainer - 広告バナーのコンテナ
 * 
 * レイアウトシフトを防ぐために高さを固定
 */
export function AdBannerContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full" style={{ minHeight: '128px' }}>
      {children}
    </div>
  );
}
