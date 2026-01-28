import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingUp, Users, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { AdBanner } from "@/components/AdBanner";
import { SyncStatus } from "@/components/SyncStatus";
import { BillingStatus } from "@/components/BillingStatus";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              マリノス観戦ログ
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              横浜F・マリノスの試合情報を管理し、観戦記録を残しましょう。
              試合予定・結果を自動で取り込み、いつでも見返せます。
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-accent mb-2" />
                <CardTitle>試合情報の自動取得</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  試合予定・結果を自動で取り込みます。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-accent mb-2" />
                <CardTitle>観戦統計</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  勝敗記録、総観戦数、費用管理など、詳細な統計を表示します。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-accent mb-2" />
                <CardTitle>詳細な記録管理</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  各試合のメモ、チケット代金、スタジアムなど細かい情報を記録できます。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-accent mb-2" />
                <CardTitle>マルチデバイス対応</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  スマートフォン、タブレット、PCからアクセスでき、データは自動同期されます。
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a href={getLoginUrl()}>
              <Button size="lg" className="text-lg px-8 py-6">
                ログインして始める
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for logged-in users
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            おかえりなさい、{user?.name}さん
          </h1>
          <p className="text-muted-foreground">
            マリノスの試合情報を管理しましょう
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>マッチログ</CardTitle>
              <CardDescription>試合情報を管理</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/matches')}
                className="w-full"
              >
                マッチログを見る
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>観戦統計</CardTitle>
              <CardDescription>統計情報を表示</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/stats')}
                variant="outline"
                className="w-full"
              >
                統計を見る
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>プラン管理</CardTitle>
              <CardDescription>料金プランを確認</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                className="w-full"
              >
                プランを見る
              </Button>
            </CardContent>
          </Card>
        </div>

        <AdBanner placement="home" className="mt-8" />

        {user?.role === 'admin' && (
          <Card className="mt-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                管理者メニュー
              </CardTitle>
              <CardDescription>管理者専用の機能</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  onClick={() => navigate('/admin')}
                  className="w-full"
                >
                  管理コンソール
                </Button>
                <Button
                  onClick={() => navigate('/admin/matches')}
                  variant="outline"
                  className="w-full"
                >
                  試合データ管理
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <SyncStatus />
                <BillingStatus />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
