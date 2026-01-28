import { PublicHeader } from "@/components/PublicHeader";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">最終更新日: 2026年1月2日</p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">はじめに</h2>
            <p>
              「オシカケ」（以下「本サービス」）は、お客様のプライバシーを尊重し、個人情報の保護に努めています。
              本プライバシーポリシーは、本サービスがお客様から収集する情報、その使用方法、および保護方法について説明します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. 取得する情報</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">1-1. アカウント情報</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>メールアドレス</li>
              <li>氏名（表示名）</li>
              <li>ログイン方法（現在はGoogleのみ対応）に応じた識別ID</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">1-2. お客様が入力した記録情報</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>観戦した試合の情報（日付、対戦カード、スタジアム等）</li>
              <li>費用データ（交通費、チケット代、飲食代、その他）</li>
              <li>メモ・感想</li>
              <li>将来的に対応予定：写真・画像</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">1-3. 利用状況・ログ情報</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>サービスへのアクセス日時</li>
              <li>利用した機能・ページ</li>
              <li>端末情報（OS、ブラウザ種類）</li>
              <li>IPアドレス</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. 利用目的</h2>
            <p>収集した情報は、以下の目的で使用します：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>本サービスの提供・運営</li>
              <li>お客様の観戦記録の管理・集計機能の提供</li>
              <li>サービスの改善・新機能の開発</li>
              <li>有料プランの課金処理</li>
              <li>お問い合わせ・サポートへの対応</li>
              <li>利用規約違反への対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. 決済に関する取り扱い</h2>
            <p>
              有料プラン（Plus/Pro）の決済は、<strong>Stripe, Inc.</strong>（以下「Stripe」）を通じて処理されます。
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>クレジットカード情報は本サービスでは保持しません</li>
              <li>カード情報はStripeのシステムで安全に処理・保管されます</li>
              <li>本サービスが保持するのは、Stripeから発行される顧客ID・サブスクリプションIDのみです</li>
            </ul>
            <p className="mt-2">
              Stripeのプライバシーポリシーは{" "}
              <a
                href="https://stripe.com/jp/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                こちら
              </a>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. 第三者提供・業務委託</h2>
            <p>お客様の個人情報は、以下の場合を除き第三者に提供しません：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>

            <p className="mt-4">本サービスでは、以下の外部サービスを利用しています：</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Stripe（決済処理）</li>
              <li>クラウドホスティングサービス（データ保管）</li>
              <li>分析ツール（利用状況の把握、導入している場合）</li>
            </ul>
            <p className="mt-2">
              これらのサービス提供者は、本サービスの運営に必要な範囲でのみ情報にアクセスし、適切なセキュリティ対策のもとで処理を行います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. データの保存期間・削除</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>お客様のデータは、アカウントが有効な間保存されます</li>
              <li>退会（アカウント削除）を申請された場合、合理的な期間内にデータを削除します</li>
              <li>法令で保存が義務付けられている情報は、必要な期間保持する場合があります</li>
            </ul>
            <p className="mt-2">
              データ削除のご依頼は、<a href="/support" className="text-primary hover:underline">サポートページ</a>よりお問い合わせください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. セキュリティ</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>データは暗号化された通信（HTTPS）で送受信されます</li>
              <li>データベースへのアクセスは認証・認可により制御されています</li>
              <li>定期的なセキュリティ対策の見直しを実施しています</li>
            </ul>
            <p className="mt-2">
              ただし、インターネット上の通信において完全なセキュリティを保証することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. お客様の権利</h2>
            <p>お客様は以下の権利を有します：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>ご自身の個人情報へのアクセス</li>
              <li>個人情報の訂正・削除の請求</li>
              <li>サービスの利用停止・アカウント削除</li>
            </ul>
            <p className="mt-2">
              これらのご依頼は、<a href="/support" className="text-primary hover:underline">サポートページ</a>よりお問い合わせください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. お問い合わせ</h2>
            <p>
              プライバシーに関するお問い合わせは、
              <a href="/support" className="text-primary hover:underline">お問い合わせページ</a>
              よりご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. 変更について</h2>
            <p>
              本ポリシーは、法令の改正やサービス内容の変更に伴い、予告なく変更される場合があります。
              重要な変更がある場合は、本サービス内でお知らせします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
