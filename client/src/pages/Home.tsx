import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, TrendingUp, Users, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

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

  // Dashboard for logged-in users
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            おかえりなさい、{user?.name}さん
          </h1>
          <p className="text-muted-foreground">
            マリノスの試合情報を管理しましょう
          </p>
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

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>最近の活動</CardTitle>
              <CardDescription>直近の観戦記録</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                試合を観戦して記録を追加しましょう
              </p>
              <Button
                onClick={() => navigate('/matches')}
                variant="link"
                className="px-0 mt-2"
              >
                マッチログを見る →
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ヒント</CardTitle>
              <CardDescription>便利な機能</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 試合情報は自動で取り込まれます</li>
                <li>• 費用を記録して予算管理</li>
                <li>• AIに質問して統計を確認</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
