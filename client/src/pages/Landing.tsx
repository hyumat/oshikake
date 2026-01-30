import { useState, useRef, useEffect, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountMenu } from "@/components/AccountMenu";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { ChevronDown, Calendar, PiggyBank, BarChart3, CheckCircle2, Smartphone, Shield, Clock } from "lucide-react";

function FadeInSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();

  const faq = [
    {
      q: "どこまで無料で使えますか？",
      a: "Freeプランでは、観戦記録（観戦済み）を7件まで保存できます。メモや費用の記録、基本の集計もお試しいただけます。",
    },
    {
      q: "記録したデータは消えませんか？",
      a: "ログインしている限り、記録したデータはサーバーに保存されます。端末を変えても、ログインすれば同じデータを見返せます。",
    },
    {
      q: "スマホでも使えますか？",
      a: "はい、スマホ優先で設計しています。PCやタブレットからもご利用いただけます。",
    },
    {
      q: "途中でプラン変更や解約はできますか？",
      a: "いつでも変更・解約できます。（決済画面の「管理ページ」から手続きできます）",
    },
    {
      q: "Jリーグのどのクラブに対応していますか？",
      a: "J1・J2リーグの全クラブに対応しています。登録時にお好きなクラブを選択していただけます。",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="オシカケ"
              className="h-10 w-10 rounded-xl shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-base font-bold text-slate-900">オシカケ</div>
              <div className="text-xs text-slate-500">観戦と費用を、ひとつに。</div>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">機能</a>
            <a href="#howto" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">使い方</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">料金</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <>
                <a
                  href="/app"
                  className="hidden sm:inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
                >
                  ダッシュボード
                </a>
                <AccountMenu />
              </>
            ) : (
              <>
                <a
                  href={getLoginUrl()}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  ログイン
                </a>
                <a
                  href={getSignUpUrl()}
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
                >
                  無料で始める
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-purple-100/40" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <FadeInSection>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  J1・J2リーグ対応
                </div>
              </FadeInSection>
              
              <FadeInSection delay={100}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                  観戦記録と費用を
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    ひとつに
                  </span>
                </h1>
              </FadeInSection>
              
              <FadeInSection delay={200}>
                <p className="mt-6 text-lg text-slate-600 max-w-lg">
                  試合ごとにメモ・費用をまとめて記録。
                  シーズンを通した支出を一目で把握できます。
                </p>
              </FadeInSection>
              
              <FadeInSection delay={300}>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <a
                    href={user ? "/app" : getSignUpUrl()}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
                  >
                    {user ? "ダッシュボードへ" : "無料で始める"}
                  </a>
                  <a
                    href="#howto"
                    className="inline-flex items-center justify-center rounded-full border-2 border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    使い方を見る
                  </a>
                </div>
              </FadeInSection>
            </div>
            
            <FadeInSection delay={400}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-2xl opacity-20 scale-105" />
                <picture>
                  <source srcSet="/lp/lp-stats.webp" type="image/webp" />
                  <img
                    src="/lp/lp-stats.png"
                    alt="オシカケのダッシュボード"
                    className="relative rounded-2xl shadow-2xl border border-white/50"
                    loading="eager"
                  />
                </picture>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <FadeInSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-4">
                機能紹介
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                オシカケでできること
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                散らばりがちな観戦記録と費用を、1か所にまとめて管理できます
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8">
            <FadeInSection delay={0}>
              <div className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">試合ごとに記録</h3>
                <p className="text-slate-600 leading-relaxed">
                  観戦メモ、写真の思い出、その日の気持ちを試合単位で残せます。
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={100}>
              <div className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 hover:shadow-lg hover:border-green-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
                  <PiggyBank className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">費用を見える化</h3>
                <p className="text-slate-600 leading-relaxed">
                  チケット・交通費・飲食費などをカテゴリ別に記録。今季いくら使ったか一目でわかります。
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 hover:shadow-lg hover:border-purple-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">シーズン集計</h3>
                <p className="text-slate-600 leading-relaxed">
                  観戦数、勝敗記録、費用の合計・平均をシーズン単位で振り返れます。
                </p>
              </div>
            </FadeInSection>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <FadeInSection delay={300}>
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">スマホ対応</div>
                  <div className="text-sm text-slate-500">どこでも記録</div>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={350}>
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">データ安全</div>
                  <div className="text-sm text-slate-500">クラウド保存</div>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={400}>
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">すぐ使える</div>
                  <div className="text-sm text-slate-500">1分で登録完了</div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="howto" className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <FadeInSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
                使い方
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                3ステップで簡単
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                登録から記録まで、わずか数分で始められます
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8">
            <FadeInSection delay={0}>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <div className="bg-white rounded-2xl p-6 pt-10 shadow-sm border border-slate-200/60 h-full">
                  <picture>
                    <source srcSet="/lp/lp-step-1.webp" type="image/webp" />
                    <img
                      src="/lp/lp-step-1.png"
                      alt="試合を選ぶ"
                      className="rounded-xl mb-4 w-full"
                      loading="lazy"
                    />
                  </picture>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">試合を選ぶ</h3>
                  <p className="text-slate-600 text-sm">
                    試合一覧から観戦した試合を選択します。過去の試合も未来の予定も一覧できます。
                  </p>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={100}>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <div className="bg-white rounded-2xl p-6 pt-10 shadow-sm border border-slate-200/60 h-full">
                  <picture>
                    <source srcSet="/lp/lp-step-2.webp" type="image/webp" />
                    <img
                      src="/lp/lp-step-2.png"
                      alt="記録を残す"
                      className="rounded-xl mb-4 w-full"
                      loading="lazy"
                    />
                  </picture>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">記録を残す</h3>
                  <p className="text-slate-600 text-sm">
                    観戦メモや感想を入力。その日の思い出を文字で残せます。
                  </p>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <div className="bg-white rounded-2xl p-6 pt-10 shadow-sm border border-slate-200/60 h-full">
                  <picture>
                    <source srcSet="/lp/lp-step-3.webp" type="image/webp" />
                    <img
                      src="/lp/lp-step-3.png"
                      alt="費用を保存"
                      className="rounded-xl mb-4 w-full"
                      loading="lazy"
                    />
                  </picture>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">費用を保存</h3>
                  <p className="text-slate-600 text-sm">
                    チケット・交通費・飲食費などをカテゴリ別に入力。後で集計できます。
                  </p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <FadeInSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700 mb-4">
                料金プラン
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                まずは無料で始められます
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                気に入ったらアップグレード。いつでも解約できます。
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FadeInSection delay={0}>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Free</h3>
                  <p className="text-sm text-slate-500 mt-1">まずはお試しに</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">¥0</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">観戦記録 7件まで</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">メモ・費用の記録</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">基本の集計機能</span>
                  </li>
                </ul>
                <a
                  href={user ? "/app" : getSignUpUrl()}
                  className="block w-full rounded-xl border-2 border-slate-200 bg-white py-3 text-center font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  {user ? "ダッシュボードへ" : "無料で始める"}
                </a>
              </div>
            </FadeInSection>

            <FadeInSection delay={100}>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Plus</h3>
                  <p className="text-sm text-slate-500 mt-1">シーズンを通して記録</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">¥490</span>
                  <span className="text-slate-500 ml-1">/月</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">観戦記録 無制限</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">今シーズンをしっかり記録</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">広告非表示</span>
                  </li>
                </ul>
                <a
                  href="/pricing"
                  className="block w-full rounded-xl border-2 border-slate-200 bg-white py-3 text-center font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  詳細を見る
                </a>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-xl h-full flex flex-col">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-bold text-yellow-900 shadow-lg">
                    おすすめ
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <p className="text-sm text-blue-100 mt-1">全機能をフル活用</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">¥980</span>
                  <span className="text-blue-200 ml-1">/月</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Plusの全機能</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-white">複数シーズン管理</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-white">CSVエクスポート</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-white">優先サポート</span>
                  </li>
                </ul>
                <a
                  href="/pricing"
                  className="block w-full rounded-xl bg-white py-3 text-center font-semibold text-blue-600 hover:bg-blue-50 transition-all"
                >
                  詳細を見る
                </a>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInSection>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700 mb-4">
                よくある質問
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                FAQ
              </h2>
            </div>
          </FadeInSection>

          <div className="space-y-4">
            {faq.map((item, i) => (
              <FadeInSection key={i} delay={i * 50}>
                <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 pr-4">{item.q}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        activeFaq === i ? "rotate-180" : ""
                      }`} 
                    />
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ${
                      activeFaq === i ? "max-h-40" : "max-h-0"
                    }`}
                  >
                    <div className="px-5 pb-5 text-slate-600">
                      {item.a}
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInSection>
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-10 md:p-16 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  今シーズンの記録を始めよう
                </h2>
                <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                  無料で7試合まで記録できます。
                  気に入ったらいつでもアップグレード。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={user ? "/app" : getSignUpUrl()}
                    className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-lg hover:bg-blue-50 transition-all"
                  >
                    {user ? "ダッシュボードへ" : "無料で始める"}
                  </a>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="オシカケ"
                className="h-10 w-10 rounded-xl"
              />
              <div>
                <div className="font-bold text-slate-900">オシカケ</div>
                <div className="text-sm text-slate-500">観戦と費用を、ひとつに。</div>
              </div>
            </div>
            
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <a href="#features" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">機能</a>
              <a href="#howto" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">使い方</a>
              <a href="#pricing" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">料金</a>
              <a href="/terms" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">利用規約</a>
              <a href="/privacy" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">プライバシー</a>
            </nav>
            
            <div className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} オシカケ
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
