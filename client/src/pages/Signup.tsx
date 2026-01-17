/**
 * Signup Page
 * Issue #114: LP→OAuthログイン導線の統一
 *
 * LP「無料で始める」からの導線
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthErrorType } from "@shared/auth";

/**
 * エラータイプに対応するエラーメッセージを取得
 */
const getErrorMessage = (errorType: AuthErrorType): string => {
  switch (errorType) {
    case 'auth_failed':
      return '登録に失敗しました。もう一度お試しください。';
    case 'oauth_not_configured':
      return 'OAuth設定が完了していません。管理者にお問い合わせください。';
    case 'session_creation_failed':
      return 'セッション作成に失敗しました。もう一度お試しください。';
    case 'session_expired':
      return 'セッションが期限切れです。もう一度お試しください。';
    case 'invalid_token':
      return 'セッショントークンが無効です。もう一度お試しください。';
  }
};

export default function Signup() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 既にログイン済みの場合はダッシュボードへリダイレクト
    if (isAuthenticated) {
      navigate("/app");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // URLパラメータからエラーを取得
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');

    if (errorParam) {
      const validErrorTypes: AuthErrorType[] = [
        'auth_failed',
        'oauth_not_configured',
        'session_creation_failed',
        'session_expired',
        'invalid_token',
      ];

      if (validErrorTypes.includes(errorParam as AuthErrorType)) {
        setError(getErrorMessage(errorParam as AuthErrorType));
      } else {
        setError('エラーが発生しました。');
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleLogin = () => {
    // TODO: Apple OAuth実装後に有効化
    alert('Apple Sign Inは準備中です。しばらくお待ちください。');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="オシカケ"
                className="h-12 w-12 rounded-xl shadow-sm"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              オシカケを始める
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              観戦と費用を、ひとつに。
            </p>
            <p className="mt-1 text-xs text-slate-500">
              無料でアカウントを作成
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* OAuth ボタン */}
          <div className="space-y-3">
            {/* Googleログイン */}
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-6 hover:bg-slate-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">Googleで始める</span>
            </Button>

            {/* Appleログイン（準備中） */}
            <Button
              onClick={handleAppleLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-6 bg-black text-white hover:bg-gray-900 hover:text-white border-black"
              disabled
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="font-medium">Appleで始める（準備中）</span>
            </Button>
          </div>

          {/* 既にアカウントをお持ちの方 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              既にアカウントをお持ちの方は
              <a
                href="/login"
                className="ml-1 text-blue-600 hover:underline font-medium"
              >
                ログイン
              </a>
            </p>
          </div>

          {/* フッター */}
          <p className="mt-6 text-center text-xs text-slate-500">
            登録することで、
            <a href="/terms" className="text-blue-600 hover:underline">
              利用規約
            </a>
            と
            <a href="/privacy" className="text-blue-600 hover:underline">
              プライバシーポリシー
            </a>
            に同意したものとみなされます。
          </p>
        </div>

        {/* トップページへ戻る */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-slate-600 hover:text-blue-700 transition-colors"
          >
            トップページへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
