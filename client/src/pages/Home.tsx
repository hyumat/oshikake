import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingUp, Users, Sparkles, Trophy, Wallet, Calculator, PieChart } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@shared/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Issue #168: Get current year stats for KPIs and graphs
  const currentYear = new Date().getFullYear();
  const { data: statsData, isLoading: statsLoading } = trpc.stats.getSummary.useQuery(
    { year: currentYear },
    { enabled: isAuthenticated }
  );

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      if (response.success && response.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.content },
        ]);
      } else {
        toast.error(response.content || 'AI応答エラー');
      }
    },
    onError: (error) => {
      console.error("AI Chat error:", error);
      toast.error("AI応答に失敗しました");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "申し訳ございません。エラーが発生しました。" },
      ]);
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(newMessages);
    chatMutation.mutate({ messages: newMessages });
  };

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
            <a href={"/login"}>
              <Button size="lg" className="text-lg px-8 py-6">
                ログインして始める
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Issue #168: Prepare chart data
  const hasData = statsData && statsData.watchCount > 0;
  const chartData = hasData ? [
    { name: '勝', value: statsData.record.win, fill: 'hsl(142, 71%, 45%)' },
    { name: '引分', value: statsData.record.draw, fill: 'hsl(0, 0%, 50%)' },
    { name: '敗', value: statsData.record.loss, fill: 'hsl(0, 84%, 60%)' },
  ].filter(item => item.value > 0) : [];

  const chartConfig = {
    win: { label: "勝", color: "hsl(142, 71%, 45%)" },
    draw: { label: "引分", color: "hsl(0, 0%, 50%)" },
    loss: { label: "敗", color: "hsl(0, 84%, 60%)" },
  };

  // Dashboard for logged-in users
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            おかえりなさい、{user?.name}さん
          </h1>
          <p className="text-muted-foreground">
            {currentYear}年の観戦記録サマリー
          </p>
        </div>

        {/* Issue #168: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Watch Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                観戦試合数
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{statsData?.watchCount ?? 0}</div>
                  <p className="text-sm text-muted-foreground">試合</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Cost */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                費用合計
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="text-3xl font-bold">
                  {formatCurrency(statsData?.cost?.total)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Per Match */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                1試合あたり平均
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {formatCurrency(Math.round(statsData?.cost?.averagePerMatch ?? 0))}
                  </div>
                  <p className="text-sm text-muted-foreground">/試合</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                勝率
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {(() => {
                      if (!hasData) return "0.0%";
                      const wins = statsData.record.win;
                      const total = wins + statsData.record.draw + statsData.record.loss;
                      return total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : "0.0%";
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {statsData?.record?.win ?? 0}勝 {statsData?.record?.draw ?? 0}分 {statsData?.record?.loss ?? 0}敗
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Issue #168: Charts and AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Win/Loss Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                戦績グラフ
              </CardTitle>
              <CardDescription>{currentYear}年の勝敗分布</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {statsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : !hasData ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Trophy className="h-12 w-12 mb-4 opacity-20" />
                  <p>まだ観戦記録がありません</p>
                  <p className="text-sm">試合を観戦して記録を追加しましょう</p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AIインサイト
              </CardTitle>
              <CardDescription>観戦記録から生成されたコメント</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : !hasData ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                  <p>データが蓄積されるとAIがインサイトを提供します</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      {`${currentYear}年は${statsData.watchCount}試合観戦し、${statsData.record.win}勝${statsData.record.draw}分${statsData.record.loss}敗の成績でした。`}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      {`1試合あたりの平均費用は${formatCurrency(Math.round(statsData.cost.averagePerMatch))}です。`}
                      {statsData.cost.averagePerMatch > 15000 && " 予算オーバーに注意しましょう。"}
                      {statsData.cost.averagePerMatch <= 10000 && " コストを抑えて観戦できていますね！"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/statistics')}
                  >
                    詳細な統計を見る
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant Section - Issue #112 */}
        {showAIChat && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <CardTitle>AIアシスタント</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIChat(false)}
                >
                  閉じる
                </Button>
              </div>
              <CardDescription>
                観戦記録について質問してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={chatMutation.isPending}
                height={400}
                placeholder="例: 今月の観戦数は？"
                emptyStateMessage="観戦記録について何でもお聞きください"
                suggestedPrompts={[
                  "今月の観戦試合数を教えて",
                  "今年の勝率は？",
                  "平均費用はいくら？",
                  "ホームとアウェイどちらが多い？",
                ]}
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                マッチログ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/matches')} className="w-full">
                試合一覧
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                観戦統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/statistics')}
                variant="outline"
                className="w-full"
              >
                統計を見る
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                プロフィール
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/profile')}
                variant="outline"
                className="w-full"
              >
                設定
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                AIアシスタント
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowAIChat(!showAIChat)}
                variant={showAIChat ? "secondary" : "default"}
                className="w-full"
              >
                {showAIChat ? "閉じる" : "質問する"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>よく使う機能へのショートカット</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                onClick={() => navigate('/matches')}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                試合一覧
              </Button>
              <Button
                onClick={() => navigate('/statistics')}
                variant="outline"
                className="w-full"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                詳細統計
              </Button>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="w-full"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                設定
              </Button>
              <Button
                onClick={() => setShowAIChat(!showAIChat)}
                variant={showAIChat ? "secondary" : "outline"}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {showAIChat ? "AIを閉じる" : "AIに質問"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
