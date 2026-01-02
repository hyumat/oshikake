import { Mail, MessageCircle, FileText, CreditCard, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { useLocation } from "wouter";
import { useState } from "react";

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    category: "料金・プラン",
    question: "Freeプランでどこまで使えますか？",
    answer: "観戦記録（観戦済み）を10件まで保存できます。メモや費用の記録、基本の集計機能もお試しいただけます。観戦予定は上限に含みません。",
  },
  {
    category: "料金・プラン",
    question: "Plus/Proプランの違いは何ですか？",
    answer: "Plusは記録可能試合が無制限になり、CSVエクスポートが使えます。Proはさらに複数シーズンの管理、高度な集計（内訳・推移グラフ）、優先サポートが利用できます。",
  },
  {
    category: "料金・プラン",
    question: "支払い方法は何がありますか？",
    answer: "クレジットカード（Visa、Mastercard、JCB、American Express）に対応しています。決済はStripeを通じて安全に処理されます。",
  },
  {
    category: "料金・プラン",
    question: "解約はどうすればいいですか？",
    answer: "決済画面の「プラン管理」からいつでも解約できます。解約後は次の更新日からFreeプランに戻ります。既に記録したデータは削除されません。",
  },
  {
    category: "料金・プラン",
    question: "返金はできますか？",
    answer: "サブスクリプションの特性上、原則として返金は行っておりません。ご不明点があればお問い合わせください。",
  },
  {
    category: "料金・プラン",
    question: "領収書はもらえますか？",
    answer: "決済画面の「プラン管理」から請求履歴・領収書を確認・ダウンロードできます。",
  },
  {
    category: "データ・アカウント",
    question: "記録したデータは消えませんか？",
    answer: "ログインしている限り、記録したデータはサーバーに安全に保存されます。端末を変えても、ログインすれば同じデータを見返せます。",
  },
  {
    category: "データ・アカウント",
    question: "データを削除したい・退会したい場合は？",
    answer: "サポートまでご連絡ください。ご本人確認の上、アカウントとデータを削除いたします。有料プラン契約中の場合は、先に解約をお願いいたします。",
  },
  {
    category: "データ・アカウント",
    question: "記録可能試合の上限に達したらどうなりますか？",
    answer: "Freeプランで10件に達すると、新しい試合を「観戦済み」として保存できなくなります。Plus/Proプランにアップグレードすると制限が解除されます。",
  },
  {
    category: "不具合・その他",
    question: "不具合を見つけた場合は？",
    answer: "お手数ですが、サポートまでご連絡ください。可能であれば、スクリーンショットと再現手順をお知らせいただけると対応がスムーズです。",
  },
  {
    category: "不具合・その他",
    question: "スマホでも使えますか？",
    answer: "はい、スマホ優先で設計しています。PC・タブレットからもご利用いただけます。将来的にモバイルアプリ対応も検討しています。",
  },
];

export default function Support() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const categories = Array.from(new Set(faqItems.map((item) => item.category)));

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">サポート</h1>
        <p className="text-muted-foreground mb-8">
          ご質問・ご要望がございましたら、まずは「よくある質問」をご確認ください。
          解決しない場合は、お問い合わせフォームよりご連絡ください。
        </p>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                よくある質問（FAQ）
              </CardTitle>
              <CardDescription>
                料金・データ・不具合など、よくあるご質問をまとめました
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categories.map((category) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    {category === "料金・プラン" && <CreditCard className="h-4 w-4" />}
                    {category === "データ・アカウント" && <Database className="h-4 w-4" />}
                    {category === "不具合・その他" && <AlertCircle className="h-4 w-4" />}
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {faqItems
                      .filter((item) => item.category === category)
                      .map((item, index) => {
                        const globalIndex = faqItems.indexOf(item);
                        const isOpen = openFaq === globalIndex;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setOpenFaq(isOpen ? null : globalIndex)}
                            className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{item.question}</div>
                                <div
                                  className={`mt-2 text-sm text-muted-foreground transition-all duration-200 ${
                                    isOpen ? "max-h-96 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                                  }`}
                                >
                                  {item.answer}
                                </div>
                              </div>
                              <div
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform text-xs"
                                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                              >
                                +
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                お問い合わせ
              </CardTitle>
              <CardDescription>
                FAQで解決しない場合は、メールでご連絡ください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm mb-3">
                  以下の情報をお書き添えいただけると、スムーズに対応できます：
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>・ご登録のメールアドレス</li>
                  <li>・お問い合わせ内容の詳細</li>
                  <li>・不具合の場合：スクリーンショット、再現手順、端末・ブラウザ情報</li>
                </ul>
              </div>
              <div className="mt-4">
                <a
                  href="mailto:support@oshikake-log.com"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <Mail className="h-4 w-4" />
                  support@oshikake-log.com
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  通常1〜3営業日以内に返信いたします
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                各種規約
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/privacy")}
              >
                プライバシーポリシー
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/terms")}
              >
                利用規約
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/pricing")}
              >
                料金プラン
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
