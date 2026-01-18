import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Trophy, Minus, X, HelpCircle, Wallet, Calculator, Info } from "lucide-react";
import { formatCurrency } from "@shared/formatters";
import { QueryState } from "@/components/QueryState";
import { AdBanner } from "@/components/AdBanner";
import { getStatsLimitMessage } from "@shared/billing";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

function StatsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [, setLocation] = useLocation();

  const { data: yearsData, isLoading: yearsLoading } = trpc.stats.getAvailableYears.useQuery();
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = trpc.stats.getSummary.useQuery({ year: selectedYear });
  const { data: planStatus } = trpc.billing.getPlanStatus.useQuery();

  const years = yearsData?.years ?? [];
  const allYears = years.length > 0 ? years : [currentYear];

  // Issue #106: Freeプランの365日制限メッセージ
  const statsLimitMessage = planStatus
    ? getStatsLimitMessage(planStatus.plan, planStatus.planExpiresAt ? new Date(planStatus.planExpiresAt) : null)
    : null;

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const isLoading = yearsLoading || statsLoading;


  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">観戦集計</h1>
            <p className="text-muted-foreground">
              観戦した試合の戦績と費用をまとめて確認
            </p>
          </div>
          <div className="w-full md:w-auto">
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="年を選択" />
              </SelectTrigger>
              <SelectContent>
                {allYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Issue #106: Freeプラン365日制限の通知 */}
        {statsLimitMessage && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{statsLimitMessage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/upgrade")}
                className="ml-4 shrink-0"
              >
                アップグレード
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <QueryState
          isLoading={isLoading}
          isError={!!statsError}
          isEmpty={statsData?.watchCount === 0}
          onRetry={() => refetchStats()}
          loadingMessage="集計を読み込み中..."
          errorMessage="集計の取得に失敗しました"
          emptyIcon={<Trophy className="h-12 w-12 text-muted-foreground" />}
          emptyTitle="観戦記録がありません"
          emptyMessage={`${selectedYear}年の観戦記録はまだありません。試合に参戦したら、観戦ログを追加してみましょう。`}
          className="min-h-[400px]"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    観戦試合数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{statsData?.watchCount ?? 0}</div>
                  <p className="text-sm text-muted-foreground">試合</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    費用合計
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(statsData?.cost?.total)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    1試合あたり平均
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(Math.round(statsData?.cost?.averagePerMatch ?? 0))}
                  </div>
                  <p className="text-sm text-muted-foreground">/試合</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">戦績</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {statsData?.record?.win ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">勝</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-center mb-2">
                      <Minus className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {statsData?.record?.draw ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">分</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="flex items-center justify-center mb-2">
                      <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {statsData?.record?.loss ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">敗</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <div className="flex items-center justify-center mb-2">
                      <HelpCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {statsData?.record?.unknown ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">未確定</div>
                  </div>
                </div>

                {(() => {
                  const wins = statsData?.record?.win ?? 0;
                  const draws = statsData?.record?.draw ?? 0;
                  const losses = statsData?.record?.loss ?? 0;
                  const total = wins + draws + losses;
                  if (total === 0) return null;
                  
                  const winRate = (wins / total * 100).toFixed(1);
                  const unbeatenRate = ((wins + draws) / total * 100).toFixed(1);
                  
                  return (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          勝率:{" "}
                          <span className="font-semibold text-foreground">
                            {winRate}%
                          </span>
                        </span>
                        <span>
                          不敗率:{" "}
                          <span className="font-semibold text-foreground">
                            {unbeatenRate}%
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </QueryState>

        {/* 広告バナー */}
        <AdBanner placement="stats" />
      </div>
    </DashboardLayout>
  );
}

export default StatsPage;
