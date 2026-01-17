import { useAuth } from "@/_core/hooks/useAuth";
import { AccountMenu } from "@/components/AccountMenu";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type PublicHeaderProps = {
  showBackButton?: boolean;
  backLabel?: string;
};

export function PublicHeader({ showBackButton = true, backLabel = "トップに戻る" }: PublicHeaderProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Button>
          )}
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="オシカケ"
              className="h-8 w-8 rounded-lg shadow-sm"
            />
            <span className="text-sm font-bold text-blue-900 hidden sm:inline">オシカケ</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
          ) : user ? (
            <>
              <a
                href="/app"
                className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors hidden sm:block"
              >
                ダッシュボード
              </a>
              <AccountMenu />
            </>
          ) : (
            <>
              <a
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
              >
                ログイン
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                無料で登録
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
