import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Infinity, Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: user } = trpc.auth.me.useQuery();
  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error('エラーが発生しました。もう一度お試しください。');
      console.error('Checkout error:', error);
      setLoadingPlan(null);
    },
  });

  const handleSubscribe = (plan: 'plus' | 'pro') => {
    if (!user) {
      toast.error('ログインしてください');
      return;
    }
    setLoadingPlan(plan);
    createCheckoutSession.mutate({
      plan,
      cycle: isYearly ? 'yearly' : 'monthly',
    });
  };

  const freeFeatures = [
    '記録可能試合: 7件',
    '試合予定・結果の閲覧',
    '基本的な集計機能',
  ];

  const plusFeatures = [
    '記録可能試合: 無制限',
    '試合予定・結果の閲覧',
    '基本的な集計機能',
    'データエクスポート（CSV）',
  ];

  const proFeatures = [
    '記録可能試合: 無制限',
    '試合予定・結果の閲覧',
    '詳細な集計・分析',
    'データエクスポート（CSV/PDF）',
    '優先サポート',
  ];

  const plusPrice = isYearly ? '¥4,900' : '¥490';
  const plusPriceNote = isYearly ? '/年' : '/月';
  const proPrice = isYearly ? '¥9,800' : '¥980';
  const proPriceNote = isYearly ? '/年' : '/月';

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => setLocation('/matches')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          マッチログに戻る
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            もっと観戦を楽しむために
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            有料プランで、より多くの試合を記録できます。
            あなたの観戦履歴をまとめて管理しましょう。
          </p>

          <div className="inline-flex items-center gap-3 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isYearly ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              月払い
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isYearly ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              年払い
              <span className="ml-1 text-xs text-green-600">2ヶ月分お得</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>まずは試してみる</CardDescription>
              <div className="pt-4">
                <span className="text-3xl font-bold">¥0</span>
                <span className="text-muted-foreground">/月</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full mt-6"
                disabled
              >
                現在のプラン
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plus</CardTitle>
              <CardDescription>シーズンを通して記録</CardDescription>
              <div className="pt-4">
                <span className="text-3xl font-bold">{plusPrice}</span>
                <span className="text-muted-foreground">{plusPriceNote}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plusFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                onClick={() => handleSubscribe('plus')}
                disabled={loadingPlan !== null || !user}
              >
                {loadingPlan === 'plus' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  'Plusを申し込む'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">おすすめ</span>
              </div>
              <CardTitle>Pro</CardTitle>
              <CardDescription>すべての機能を解放</CardDescription>
              <div className="pt-4">
                <span className="text-3xl font-bold">{proPrice}</span>
                <span className="text-muted-foreground">{proPriceNote}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                onClick={() => handleSubscribe('pro')}
                disabled={loadingPlan !== null || !user}
              >
                {loadingPlan === 'pro' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  'Proを申し込む'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold mb-6">有料プランでできること</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Infinity className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">多くの記録</h3>
              <p className="text-sm text-muted-foreground text-center">
                Plus/Pro: 無制限に記録可能。
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">長期間の記録</h3>
              <p className="text-sm text-muted-foreground text-center">
                過去の記録も未来の予定も、すべて一元管理。
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">データエクスポート</h3>
              <p className="text-sm text-muted-foreground text-center">
                CSVで、あなたのデータを持ち出せます。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            ご不明な点がございましたら、
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => setLocation('/support')}
            >
              お問い合わせ
            </Button>
            までご連絡ください。
          </p>
        </div>
      </div>
    </div>
  );
}
