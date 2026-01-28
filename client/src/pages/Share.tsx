import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Trophy, Minus, X, Wallet, Calculator, AlertCircle, User } from "lucide-react";
import { formatCurrency } from "@shared/formatters";
import { Skeleton } from "@/components/ui/skeleton";

function SharePage() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = trpc.share.getPublicSummary.useQuery(
    { token },
    { enabled: !!token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-6 w-32 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold">リンクが無効です</h2>
              <p className="text-muted-foreground">
                {error.message === "Share link not found"
                  ? "この共有リンクは存在しません。"
                  : error.message === "This share link has been disabled"
                  ? "この共有リンクは無効化されています。"
                  : error.message === "This share link has expired"
                  ? "この共有リンクは有効期限が切れています。"
                  : "共有リンクの読み込みに失敗しました。"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { userName, year, stats } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{userName} さんの観戦記録</h1>
          </div>
          {year && (
            <p className="text-lg text-muted-foreground">{year}年シーズン</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  観戦試合数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.watchCount}</div>
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
                  {formatCurrency(stats.cost.total)}
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
                  {formatCurrency(stats.cost.averagePerMatch)}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.record.win}
                  </div>
                  <div className="text-sm text-muted-foreground">勝</div>
                </div>

                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-center mb-2">
                    <Minus className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {stats.record.draw}
                  </div>
                  <div className="text-sm text-muted-foreground">分</div>
                </div>

                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex items-center justify-center mb-2">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.record.loss}
                  </div>
                  <div className="text-sm text-muted-foreground">敗</div>
                </div>
              </div>

              {(() => {
                const { win, draw, loss } = stats.record;
                const total = win + draw + loss;
                if (total === 0) return null;

                const winRate = ((win / total) * 100).toFixed(1);
                const unbeatenRate = (((win + draw) / total) * 100).toFixed(1);

                return (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
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

          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>
              オシカケ - 横浜F・マリノスサポーター向け観戦記録アプリ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SharePage;
