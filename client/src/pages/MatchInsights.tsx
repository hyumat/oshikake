/**
 * Issue #111: Match Trend Analysis Page (Pro-only)
 * Dedicated page for viewing aggregated trend data from other users' plans
 */

import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Users, Car, Wallet, UtensilsCrossed, Plus, Lock, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/_core/hooks/useAuth';

export default function MatchInsights() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const matchIdNum = parseInt(matchId || '0', 10);

  // Get user plan status
  const { data: planStatus } = trpc.userMatches.getPlanStatus.useQuery();
  const isPro = planStatus?.isPro ?? false;

  // Get match details
  const { data: matchData } = trpc.matches.getById.useQuery(
    { id: matchIdNum },
    { enabled: !isNaN(matchIdNum) }
  );

  // Get trend analysis data
  // Note: getTrendAnalysis is from Issue #80, might not be available yet
  const trendAnalysisQuery = (trpc.userMatches as any).getTrendAnalysis?.useQuery(
    { matchId: matchIdNum },
    { enabled: isPro && !isNaN(matchIdNum) }
  );
  const trendData = trendAnalysisQuery?.data;
  const isTrendLoading = trendAnalysisQuery?.isLoading ?? false;

  const match = matchData?.match;

  // Pro access gate
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!isPro) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/matches/${matchId}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              試合詳細に戻る
            </Button>
          </div>

          <Card className="border-2">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <BarChart3 className="w-20 h-20 text-muted-foreground opacity-30" />
                    <Lock className="w-10 h-10 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Pro限定機能</h2>
                  <p className="text-muted-foreground">
                    トレンド分析機能はProプラン限定です
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Proプランで利用できる機能
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>✓ 他のユーザーの計画傾向を匿名集計</li>
                    <li>✓ 交通費・宿泊費・飲食費の平均値を表示</li>
                    <li>✓ 予算分布をグラフで可視化</li>
                    <li>✓ カスタムカテゴリの作成</li>
                  </ul>
                </div>
                <Button
                  size="lg"
                  onClick={() => setLocation('/billing')}
                  className="gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Proプランにアップグレード
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/matches/${matchId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            試合詳細に戻る
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">トレンド分析</h1>
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          {match && (
            <p className="text-muted-foreground">
              {match.date} vs {match.opponent}
            </p>
          )}
        </div>

        {/* Loading State */}
        {isTrendLoading && (
          <Card>
            <CardContent className="pt-6 pb-6">
              <p className="text-center text-muted-foreground">データを読み込み中...</p>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!isTrendLoading && trendData && !trendData.hasData && (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">データが不足しています</h3>
                  <p className="text-muted-foreground">{trendData.message}</p>
                  {trendData.recordCount !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      現在: {trendData.recordCount}人 / 必要: {trendData.requiredCount}人
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend Data Display */}
        {!isTrendLoading && trendData?.hasData && trendData.categories && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  集計サマリー
                </CardTitle>
                <CardDescription>
                  {trendData.recordCount}人の計画データを集計しています
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Category Averages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendData.categories.transport?.userCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Car className="w-5 h-5 text-primary" />
                      交通費
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-bold">
                          ¥{trendData.categories.transport.average.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">平均金額</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">最小</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.transport.min.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">最大</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.transport.max.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">回答数</p>
                          <p className="text-muted-foreground">
                            {trendData.categories.transport.userCount}人
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {trendData.categories.ticket?.userCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wallet className="w-5 h-5 text-primary" />
                      チケット代
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-bold">
                          ¥{trendData.categories.ticket.average.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">平均金額</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">最小</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.ticket.min.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">最大</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.ticket.max.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">回答数</p>
                          <p className="text-muted-foreground">
                            {trendData.categories.ticket.userCount}人
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {trendData.categories.food?.userCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                      飲食代
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-bold">
                          ¥{trendData.categories.food.average.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">平均金額</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">最小</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.food.min.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">最大</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.food.max.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">回答数</p>
                          <p className="text-muted-foreground">
                            {trendData.categories.food.userCount}人
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {trendData.categories.other?.userCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plus className="w-5 h-5 text-primary" />
                      その他
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-bold">
                          ¥{trendData.categories.other.average.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">平均金額</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">最小</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.other.min.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">最大</p>
                          <p className="text-muted-foreground">
                            ¥{trendData.categories.other.max.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">回答数</p>
                          <p className="text-muted-foreground">
                            {trendData.categories.other.userCount}人
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Budget Distribution */}
            {trendData.budgetDistribution && Object.values(trendData.budgetDistribution as Record<string, number>).some((v: number) => v > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>予算分布</CardTitle>
                  <CardDescription>
                    他のユーザーの予算レンジ分布
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(trendData.budgetDistribution as Record<string, number>).map(([range, count]) => {
                      const countNum = count as number;
                      if (countNum === 0) return null;
                      const percentage = Math.round((countNum / (trendData.recordCount || 1)) * 100);
                      const label = range === '15000+' ? '¥15,000以上' : `¥${range.replace('-', ' - ¥')}`;
                      return (
                        <div key={range} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">{countNum}人 ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div
                              className="bg-primary h-3 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Notice */}
            <Card className="border-muted-foreground/20">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground text-center">
                  ※ プライバシー保護のため、個人を特定できない集計データのみを表示しています
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
