import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app");
    }
  }, [isAuthenticated, navigate]);

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
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="おしかけログ"
                className="h-12 w-12 rounded-xl shadow-sm"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">おしかけログ</h1>
            <p className="mt-2 text-sm text-slate-600">
              観戦記録と費用をまとめて残して、いつでも見返せる
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={getSignUpUrl()}
              className="flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              無料で登録して始める
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">または</span>
              </div>
            </div>

            <a
              href={getLoginUrl()}
              className="flex items-center justify-center w-full rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-all"
            >
              ログイン
            </a>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            登録すると、記録を端末間で引き継げます
          </p>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
            トップページへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
