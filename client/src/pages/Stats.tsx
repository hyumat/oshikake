import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertCircle, Trophy, Minus, X, HelpCircle, Wallet, Calculator } from "lucide-react";

function StatsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: yearsData, isLoading: yearsLoading } = trpc.stats.getAvailableYears.useQuery();
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.stats.getSummary.useQuery({ year: selectedYear });

  const years = yearsData?.years ?? [];
  const allYears = years.length > 0 ? years : [currentYear];

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const isLoading = yearsLoading || statsLoading;

  if (statsError) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
            <p className="text-muted-foreground">
              集計データの取得に失敗しました。しばらくしてから再度お試しください。
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : statsData?.watchCount === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Trophy className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">観戦記録がありません</h2>
            <p className="text-muted-foreground max-w-md">
              {selectedYear}年の観戦記録はまだありません。
              試合に参戦したら、観戦ログを追加してみましょう。
            </p>
          </div>
        ) : (
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
                    ¥{(statsData?.costTotal ?? 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">円</p>
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
                    ¥{(statsData?.costAverage ?? 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">円/試合</p>
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
                      {statsData?.wins ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">勝</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-center mb-2">
                      <Minus className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {statsData?.draws ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">分</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="flex items-center justify-center mb-2">
                      <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {statsData?.losses ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">敗</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <div className="flex items-center justify-center mb-2">
                      <HelpCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {statsData?.unknown ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">未確定</div>
                  </div>
                </div>

                {(() => {
                  const wins = statsData?.wins ?? 0;
                  const draws = statsData?.draws ?? 0;
                  const losses = statsData?.losses ?? 0;
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
        )}
      </div>
    </DashboardLayout>
  );
}

export default StatsPage;
