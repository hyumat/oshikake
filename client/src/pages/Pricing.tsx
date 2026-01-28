import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { Check, X, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

interface PlanFeature {
  text: string;
  free: boolean | string;
  plus: boolean | string;
  pro: boolean | string;
}

const comparisonFeatures: PlanFeature[] = [
  { text: "記録可能試合", free: "10件まで", plus: "無制限", pro: "無制限" }, // Issue #172: 7件→10件
  { text: "対象シーズン", free: "今シーズン", plus: "今シーズン", pro: "複数シーズン" },
  { text: "集計表示期間", free: "過去365日", plus: "全期間", pro: "全期間" },
  { text: "観戦メモ・費用の記録", free: true, plus: true, pro: true },
  { text: "基本の集計（観戦数・勝敗・費用合計）", free: true, plus: true, pro: true },
  { text: "高度な集計（内訳・推移グラフ）", free: false, plus: false, pro: true },
  { text: "CSVエクスポート", free: false, plus: true, pro: true },
  { text: "費用カテゴリの自由設定", free: false, plus: false, pro: true },
  { text: "過去の自分を振り返る", free: false, plus: true, pro: true },
  { text: "他の人の傾向をAI分析", free: false, plus: false, pro: true },
  { text: "優先サポート", free: false, plus: false, pro: true },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [location] = useLocation();
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan === 'plus' || plan === 'pro') {
      setHighlightedPlan(plan);
    }
  }, [location]);

  // Issue #172: 価格改定 Plus ¥780/月, Pro ¥1,280/月, 年額は10ヶ月分（2ヶ月お得）
  const plusPrice = isYearly ? "¥7,800" : "¥780";
  const plusPriceNote = isYearly ? "/年（税込）" : "/月（税込）";
  const proPrice = isYearly ? "¥12,800" : "¥1,280";
  const proPriceNote = isYearly ? "/年（税込）" : "/月（税込）";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">料金プラン</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            まずはFreeでお試し。気に入ったらPlus/Proで制限を解除できます。
          </p>

          <div className="inline-flex items-center gap-3 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isYearly ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              月払い
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isYearly ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              年払い
              <span className="ml-1 text-xs text-green-600">2ヶ月分お得</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="flex flex-col">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Free</CardTitle>
              <div className="mt-3">
                <span className="text-3xl font-bold">¥0</span>
              </div>
              <CardDescription className="mt-2 text-sm">まずは気軽に始めたい方に</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="font-medium">記録可能試合：10件まで</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>メモと費用をまとめて残せる</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>基本の集計で見返せる</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <a href={"/login"} className="w-full">
                <Button className="w-full" variant="outline">
                  無料で登録
                </Button>
              </a>
            </CardFooter>
          </Card>

          <Card className={`flex flex-col ${highlightedPlan === 'plus' ? 'border-primary border-2 shadow-lg' : ''}`}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Plus</CardTitle>
              <div className="mt-3">
                <span className="text-3xl font-bold">{plusPrice}</span>
                <span className="text-muted-foreground ml-1 text-sm">{plusPriceNote}</span>
              </div>
              <CardDescription className="mt-2 text-sm">シーズンを通して記録したい方に</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="font-medium">記録可能試合：無制限</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>今のシーズンをしっかり残せる</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>CSVエクスポート</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/upgrade?plan=plus" className="w-full">
                <Button className="w-full" variant="outline">
                  Plusで続ける
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className={`flex flex-col ${highlightedPlan === 'pro' ? 'border-primary border-2 shadow-xl' : 'border-primary shadow-lg'}`}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Pro</CardTitle>
              <div className="mt-3">
                <span className="text-3xl font-bold">{proPrice}</span>
                <span className="text-muted-foreground ml-1 text-sm">{proPriceNote}</span>
              </div>
              <CardDescription className="mt-2 text-sm">全ての試合を記録したい方に</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="font-medium">複数シーズンをまとめて管理</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>高度な集計（内訳・推移）</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>優先サポート</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/upgrade?plan=pro" className="w-full">
                <Button className="w-full">
                  Proで続ける
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-xl font-semibold mb-6 text-center">プラン比較表</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">機能</th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium">Plus</th>
                  <th className="text-center py-3 px-4 font-medium bg-primary/5">Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">{feature.text}</td>
                    <td className="text-center py-3 px-4">
                      {typeof feature.free === "string" ? (
                        <span className="text-muted-foreground">{feature.free}</span>
                      ) : feature.free ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {typeof feature.plus === "string" ? (
                        <span className="text-muted-foreground">{feature.plus}</span>
                      ) : feature.plus ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4 bg-primary/5">
                      {typeof feature.pro === "string" ? (
                        <span className="font-medium">{feature.pro}</span>
                      ) : feature.pro ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              「記録可能試合」とは？
            </h2>
            <p className="text-muted-foreground mb-4">
              観戦した試合を「観戦済み」として保存できる件数のことです。
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・Freeプランでは累計10件まで記録できます</li>
              <li>・観戦予定（まだ行っていない試合）は上限に含みません</li>
              <li>・上限に達した場合、新しい試合を記録するにはプランのアップグレードが必要です</li>
              <li>・Plus/Proプランは無制限で記録できます</li>
            </ul>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-center">よくある質問</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">どこまで無料で使えますか？</h3>
              <p className="text-muted-foreground text-sm">
                Freeプランでは、観戦記録（観戦済み）を<strong>10件まで</strong>保存できます。メモや費用の記録、基本の集計もお試しいただけます。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">途中でプラン変更はできますか？</h3>
              <p className="text-muted-foreground text-sm">
                いつでもアップグレード・ダウングレードできます。決済画面の「プラン管理」から手続きできます。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">解約はどうすればいいですか？</h3>
              <p className="text-muted-foreground text-sm">
                決済画面の「プラン管理」からいつでも解約できます。解約後は次の更新日からFreeプランに戻ります。既に記録したデータは削除されません。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">返金はできますか？</h3>
              <p className="text-muted-foreground text-sm">
                サブスクリプションの特性上、原則として返金は行っておりません。ご不明点があれば<a href="/support" className="text-primary hover:underline">サポート</a>までお問い合わせください。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">年払いと月払いの違いは？</h3>
              <p className="text-muted-foreground text-sm">
                年払いは一括でお支払いいただくことで、月払いの約2ヶ月分がお得になります。年払いの金額は1年分の合計金額です。
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">支払い方法は？</h3>
              <p className="text-muted-foreground text-sm">
                クレジットカード（Visa、Mastercard、JCB、American Express）に対応しています。決済はStripeを通じて安全に処理されます。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/">
            <Button variant="ghost">トップページに戻る</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
