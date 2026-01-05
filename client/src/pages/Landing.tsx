import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountMenu } from "@/components/AccountMenu";
import { getLoginUrl, getSignUpUrl } from "@/const";

export default function LandingPage() {
  const [year, setYear] = useState<number>(2025);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();

  const statsPreview = {
    2024: { watch: 6, win: 2, draw: 2, loss: 2, unknown: 0, total: 71200 },
    2025: { watch: 7, win: 3, draw: 2, loss: 1, unknown: 1, total: 84200 },
    2026: { watch: 1, win: 0, draw: 0, loss: 0, unknown: 1, total: 9800 },
  }[year] ?? { watch: 7, win: 3, draw: 2, loss: 1, unknown: 1, total: 84200 };

  const avg = statsPreview.watch > 0 ? Math.round(statsPreview.total / statsPreview.watch) : 0;

  const faq = [
    {
      q: "どこまで無料で使えますか？",
      a: "Freeプランでは、観戦記録（観戦済み）を10件まで保存できます。メモや費用の記録、基本の集計もお試しいただけます。",
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
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute top-40 -right-24 h-64 w-64 rounded-full bg-red-100/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Oshika"
              className="h-9 w-9 rounded-xl shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold text-blue-900">Oshika</div>
              <div className="text-[11px] text-slate-500">観戦と費用を、ひとつに。</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#pain" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">悩み</a>
            <a href="#solution" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">できること</a>
            <a href="#how" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">使い方</a>
            <a href="#stats" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">集計</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">料金</a>
            <a href="#faq" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <>
                <a
                  href="/app"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors hidden sm:block"
                >
                  ダッシュボード
                </a>
                <AccountMenu />
              </>
            ) : (
              <>
                <a
                  href={getLoginUrl()}
                  className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                >
                  ログイン
                </a>
                <a
                  href={getSignUpUrl()}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  無料で登録
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="text-sm font-bold text-blue-700 mb-2">Oshika</div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl leading-tight">
              あの試合、<br />
              いくら使った？<br />
              <span className="text-blue-700">全部わかる。</span>
            </h1>

            <p className="mt-6 text-base leading-relaxed text-slate-600 md:text-lg">
              観戦メモ、費用（チケット・交通・飲食など）、試合情報（予定・結果）を<br className="hidden sm:inline" />
              まとめて残して、いつでも見返せる。
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              {user ? (
                <a
                  href="/app"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  ダッシュボードへ
                </a>
              ) : (
                <>
                  <a
                    href={getSignUpUrl()}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    Freeで始める
                  </a>
                  <a
                    href={getLoginUrl()}
                    className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors underline-offset-2 hover:underline"
                  >
                    ログインはこちら
                  </a>
                </>
              )}
            </div>
            {!user && (
              <p className="mt-4 text-sm text-slate-500">
                まずはFreeで。10試合まで無料で記録できます。
              </p>
            )}
          </div>

          <div className="relative">
            <FadeInSection>
              <img
                src="/lp/lp-hero.png"
                alt="観戦の記録と費用をまとめて残せるイメージ"
                className="rounded-3xl shadow-xl w-full"
                width={600}
                height={338}
                loading="eager"
              />
            </FadeInSection>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <FadeInSection delay={0}>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                📝
              </div>
              <div>
                <div className="font-semibold text-slate-800">観戦の記録</div>
                <div className="mt-1 text-sm text-slate-500">メモ・写真・同行者など</div>
              </div>
            </div>
          </FadeInSection>
          <FadeInSection delay={100}>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                💰
              </div>
              <div>
                <div className="font-semibold text-slate-800">費用の記録</div>
                <div className="mt-1 text-sm text-slate-500">交通/宿/チケット/飲食を合計・内訳で</div>
              </div>
            </div>
          </FadeInSection>
          <FadeInSection delay={200}>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                📅
              </div>
              <div>
                <div className="font-semibold text-slate-800">試合の確認</div>
                <div className="mt-1 text-sm text-slate-500">日程・会場・結果を同じ場所で</div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section id="pain" className="bg-slate-50/80 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="text-center mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">共感</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">こんな悩み、ありませんか？</h2>
              <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto">
                放っておくと、今季いくら使ったか分からない。あとから思い出そうとしても、記録がバラバラで探せない...
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="grid gap-4 sm:grid-cols-2">
              <FadeInSection delay={0}>
                <PainCard icon="📱" text="観戦メモがSNS・メモアプリ・写真フォルダに散らばって、あとから探せない" />
              </FadeInSection>
              <FadeInSection delay={100}>
                <PainCard icon="💸" text="気づいたら今季の出費が分からない。次の遠征の予算も立てづらい" />
              </FadeInSection>
              <FadeInSection delay={200}>
                <PainCard icon="🔍" text="試合予定・結果を確認するたびに、毎回別のサイトを開いてしまう" />
              </FadeInSection>
              <FadeInSection delay={300}>
                <PainCard icon="📅" text="シーズンが終わったあと、どの試合を観に行ったか思い出せない" />
              </FadeInSection>
            </div>
            <FadeInSection delay={400}>
              <img
                src="/lp/lp-pain.png"
                alt="記録が散らばりやすい状況のイメージ"
                className="rounded-2xl shadow-lg w-full max-w-md mx-auto"
                width={400}
                height={300}
                loading="lazy"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="solution" className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="text-center mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">解決</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Oshikaでできること</h2>
            </div>
          </FadeInSection>

          <div className="grid gap-6 md:grid-cols-3">
            <FadeInSection delay={0}>
              <SolutionCard
                icon="📝"
                title="観戦メモが散らばらない"
                desc="試合ごとに観戦日とメモを1か所にまとめて残せます。"
              />
            </FadeInSection>
            <FadeInSection delay={100}>
              <SolutionCard
                icon="💰"
                title="いくら使ったか、あとで一発で分かる"
                desc="チケット・交通・飲食など、費用をカテゴリ別に記録できます。"
              />
            </FadeInSection>
            <FadeInSection delay={200}>
              <SolutionCard
                icon="📊"
                title="予定・結果を同じ場所で見返せる"
                desc="試合一覧と詳細で、別のサイトを開かなくても確認できます。"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="how" className="bg-gradient-to-br from-blue-50/60 to-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="text-center mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">使い方</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">3ステップで完了</h2>
            </div>
          </FadeInSection>

          <div className="grid gap-6 md:grid-cols-3">
            <FadeInSection delay={0}>
              <StepCardWithImage step="1" title="試合を選ぶ" image="/lp/lp-step-1.png" />
            </FadeInSection>
            <FadeInSection delay={100}>
              <StepCardWithImage step="2" title="記録を残す" image="/lp/lp-step-2.png" />
            </FadeInSection>
            <FadeInSection delay={200}>
              <StepCardWithImage step="3" title="費用を保存" image="/lp/lp-step-3.png" />
            </FadeInSection>
          </div>

          <FadeInSection delay={300}>
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                無料で10試合まで試せます。記録はいつでも編集できます。
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section id="stats" className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="text-center mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">集計</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">見返し（集計）</h2>
              <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
                観戦数、勝敗、費用の合計・平均などをシーズン単位で見返せます。年度の切り替えにも対応しています。
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-8 md:grid-cols-2 items-center max-w-4xl mx-auto">
            <FadeInSection>
              <img
                src="/lp/lp-stats.png"
                alt="今季の振り返りイメージ"
                className="rounded-2xl shadow-lg w-full"
                width={400}
                height={300}
                loading="lazy"
              />
            </FadeInSection>

            <FadeInSection delay={100}>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div className="text-sm font-semibold">集計プレビュー</div>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <StatCard label="観戦数" value={`${statsPreview.watch}`} unit="試合" />
                  <StatCard label="勝分敗" value={`${statsPreview.win}-${statsPreview.draw}-${statsPreview.loss}`} unit="" hint={statsPreview.unknown > 0 ? `未確定 ${statsPreview.unknown}` : undefined} />
                  <StatCard label="費用（合計）" value={`¥${statsPreview.total.toLocaleString()}`} unit="" />
                  <StatCard label="費用（平均）" value={`¥${avg.toLocaleString()}`} unit="" />
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-slate-50/80 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center max-w-4xl mx-auto">
            <div>
              <FadeInSection>
                <div className="mb-8">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">期待</div>
                  <h2 className="mt-2 text-2xl font-bold md:text-3xl">今後のロードマップ</h2>
                </div>
              </FadeInSection>

              <div className="space-y-4">
                <FadeInSection delay={0}>
                  <RoadmapItem label="短期" text="費用内訳、月別推移、グラフ表示" />
                </FadeInSection>
                <FadeInSection delay={100}>
                  <RoadmapItem label="中期" text="CSVエクスポート、共有、オフライン対応" />
                </FadeInSection>
                <FadeInSection delay={200}>
                  <RoadmapItem label="長期" text="モバイルアプリ化、複数ユーザー、SNS連携" />
                </FadeInSection>
              </div>
            </div>

            <FadeInSection delay={300}>
              <img
                src="/lp/lp-future.png"
                alt="見返しが楽しくなるイメージ"
                className="rounded-2xl shadow-lg w-full"
                width={400}
                height={300}
                loading="lazy"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="text-center mb-12">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">料金プラン</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Freeで始められます</h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                まずはFreeでお試し。気に入ったらPlus/Proで制限を解除できます。
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <FadeInSection delay={0}>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-full">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">Free</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">¥0</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">まずは気軽に始めたい方に</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">記録可能試合：10件まで</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>メモと費用をまとめて残せる</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>基本の集計で見返せる</span>
                  </li>
                </ul>
                <p className="mt-3 text-xs text-slate-400">※「記録可能試合」は、観戦記録（観戦済み）として保存できる件数です。</p>
                <div className="mt-4">
                  <a
                    href={user ? "/app" : getSignUpUrl()}
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    {user ? "ダッシュボードへ" : "無料で登録"}
                  </a>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={50}>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-full">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">Plus</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">¥490</span>
                    <span className="text-slate-500 text-sm">/月</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">シーズンを通して記録したい方に</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">記録可能試合：無制限</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>今のシーズンをしっかり残せる</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>基本の集計で見返せる</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <a
                    href="/pricing"
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    詳細を見る
                  </a>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={100}>
              <div className="rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-lg relative h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">おすすめ</span>
                </div>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">Pro</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">¥980</span>
                    <span className="text-slate-500 text-sm">/月</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">全ての試合を記録したい方に</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">複数シーズンをまとめて管理</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>CSVで書き出し（保存・共有に便利）</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>支出の内訳や推移まで見える</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <a
                    href="/pricing"
                    className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-2 text-center text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    詳細を見る
                  </a>
                </div>
              </div>
            </FadeInSection>
          </div>

          <FadeInSection delay={200}>
            <div className="text-center mt-8">
              <a href="/pricing" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                プランの詳細を見る →
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section id="faq" className="bg-slate-50/80 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInSection>
            <div className="text-center mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">FAQ</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">よくある質問</h2>
            </div>
          </FadeInSection>

          <div className="space-y-3">
            {faq.map((item, idx) => {
              const open = activeFaq === idx;
              return (
                <FadeInSection key={idx} delay={idx * 50}>
                  <button
                    type="button"
                    onClick={() => setActiveFaq(open ? null : idx)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{item.q}</div>
                        <div
                          className={[
                            "mt-2 text-sm leading-relaxed text-slate-600 transition-all duration-200",
                            open ? "max-h-96 opacity-100" : "max-h-0 overflow-hidden opacity-0",
                          ].join(" ")}
                        >
                          {item.a}
                        </div>
                      </div>
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform" style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                        <span className="text-sm">+</span>
                      </div>
                    </div>
                  </button>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInSection>
            <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-800 p-8 text-white shadow-xl md:p-12">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold md:text-3xl">今季の観戦を、あとから気持ちよく見返そう。</h2>
                <p className="mt-4 text-sm leading-relaxed text-white/80 md:text-base">
                  観戦の記録と費用をまとめて残し、試合結果・試合予定も同じ場所で確認できます。
                </p>
                <div className="mt-8">
                  <a
                    href={user ? "/app" : getSignUpUrl()}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-800 shadow-md hover:bg-slate-50 transition-all"
                  >
                    {user ? "ダッシュボードへ" : "無料で登録して始める"}
                  </a>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-semibold">Oshika</span>
            <span className="text-xs text-slate-500">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <a href="#solution" className="hover:text-blue-700 transition-colors">機能</a>
            <a href="#how" className="hover:text-blue-700 transition-colors">使い方</a>
            <a href="#faq" className="hover:text-blue-700 transition-colors">FAQ</a>
            <a href="/pricing" className="hover:text-blue-700 transition-colors">料金</a>
            <span className="text-slate-300">|</span>
            <a href="/privacy" className="hover:text-blue-700 transition-colors">プライバシー</a>
            <a href="/terms" className="hover:text-blue-700 transition-colors">利用規約</a>
            <a href="/support" className="hover:text-blue-700 transition-colors">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function PainCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function SolutionCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all h-full">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ step, title }: { step: string; title: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg mb-4">
        {step}
      </div>
      <p className="text-sm font-medium text-slate-800">{title}</p>
    </div>
  );
}

function StepCardWithImage({ step, title, image }: { step: string; title: string; image: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-50 mb-4">
        <img
          src={image}
          alt={`使い方のイメージ（ステップ${step}）`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="text-center">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm mb-2">
          {step}
        </div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, hint }: { label: string; value: string; unit: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {value}
        {unit && <span className="text-sm font-normal text-slate-600 ml-1">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function RoadmapItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{label}</div>
      <p className="text-sm text-slate-700">{text}</p>
    </div>
  );
}
