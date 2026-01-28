import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, SectionHeader } from "@/components/layout";
import {
  Calendar,
  Trophy,
  Wallet,
  TrendingUp,
  Shield,
  PiggyBank,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { AdBanner } from "@/components/AdBanner";
import { SyncStatus } from "@/components/SyncStatus";
import { BillingStatus } from "@/components/BillingStatus";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const statsQuery = trpc.stats.getSummary.useQuery({});
  const matchesQuery = trpc.userMatches.list.useQuery({});

  const stats = statsQuery.data;
  const recentMatches = matchesQuery.data?.matches?.slice(0, 5) || [];

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          おかえりなさい、{user?.name}さん
        </h1>
        <p className="text-muted-foreground">
          マリノスの観戦記録をチェックしましょう
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="今季観戦数"
          value={stats?.watchCount || 0}
          subtitle="試合"
          icon={Calendar}
          onClick={() => navigate("/matches")}
        />
        <KpiCard
          title="勝敗記録"
          value={`${stats?.record?.win || 0}勝${stats?.record?.draw || 0}分${stats?.record?.loss || 0}敗`}
          icon={Trophy}
          onClick={() => navigate("/stats")}
        />
        <KpiCard
          title="総支出"
          value={`¥${(stats?.cost?.total || 0).toLocaleString()}`}
          icon={Wallet}
          onClick={() => navigate("/expenses")}
        />
        <KpiCard
          title="1試合平均"
          value={`¥${Math.round(stats?.cost?.averagePerMatch || 0).toLocaleString()}`}
          icon={TrendingUp}
          onClick={() => navigate("/expenses")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="最近の観戦"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/matches")}>
                すべて見る
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          {recentMatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  まだ観戦記録がありません
                </p>
                <Button onClick={() => navigate("/matches")}>
                  試合を記録する
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match: any) => (
                <Card
                  key={match.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/matches/${match.matchId || match.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        vs {match.opponent}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.date && format(new Date(match.date), "M月d日(E)", { locale: ja })}
                        {match.stadium && ` · ${match.stadium}`}
                      </p>
                    </div>
                    {match.resultWdl && (
                      <div className={`text-sm font-medium px-2 py-1 rounded ${
                        match.resultWdl === 'win' ? 'bg-green-100 text-green-700' :
                        match.resultWdl === 'loss' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {match.resultWdl === 'win' ? '勝' : match.resultWdl === 'loss' ? '敗' : '分'}
                      </div>
                    )}
                    {match.costYen && (
                      <span className="text-sm font-medium">
                        ¥{match.costYen.toLocaleString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SectionHeader title="クイックアクセス" />
          <div className="space-y-2">
            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate("/matches")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">試合一覧</p>
                  <p className="text-xs text-muted-foreground">観戦記録を管理</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate("/expenses")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">費用管理</p>
                  <p className="text-xs text-muted-foreground">支出を確認</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate("/savings")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">マリノス貯金</p>
                  <p className="text-xs text-muted-foreground">貯金ルールを設定</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate("/stats")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">統計</p>
                  <p className="text-xs text-muted-foreground">詳細な分析</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AdBanner placement="home" />

      {user?.role === 'admin' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              管理者メニュー
            </CardTitle>
            <CardDescription>管理者専用の機能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button onClick={() => navigate('/admin')} className="w-full">
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
  );
}
