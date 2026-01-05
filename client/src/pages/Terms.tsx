import { PublicHeader } from "@/components/PublicHeader";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">最終更新日: 2026年1月2日</p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第1条（適用）</h2>
            <p>
              本規約は、「Oshika」（以下「本サービス」）の利用に関する条件を定めるものです。
              ユーザーは本規約に同意の上、本サービスを利用するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第2条（定義）</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>「ユーザー」</strong>：本サービスを利用する個人</li>
              <li><strong>「アカウント」</strong>：本サービスを利用するために登録された利用者情報</li>
              <li><strong>「観戦記録」</strong>：ユーザーが登録した試合の観戦情報・費用・メモ等</li>
              <li><strong>「記録可能試合」</strong>：観戦済みとして保存できる試合の件数</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第3条（サービス内容）</h2>
            <p>本サービスは、サッカー観戦の記録・費用管理を支援するWebアプリケーションです。</p>
            <p className="mt-2">主な機能：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>試合予定・結果の閲覧</li>
              <li>観戦記録の登録・管理</li>
              <li>費用の記録・集計</li>
              <li>データのエクスポート（有料プラン）</li>
            </ul>
            <p className="mt-2">
              運営者は、本サービスの内容を予告なく変更・追加・削除することがあります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第4条（アカウント）</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>ユーザーは正確な情報を登録する必要があります</li>
              <li>アカウント情報の管理はユーザーの責任とします</li>
              <li>1人のユーザーが複数のアカウントを作成することは禁止します</li>
              <li>不正利用が判明した場合、アカウントを停止または削除する場合があります</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第5条（料金プラン・支払い）</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">5-1. プラン構成</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Free</strong>：記録可能試合10件まで、基本機能</li>
              <li><strong>Plus</strong>：記録可能試合無制限、CSVエクスポート</li>
              <li><strong>Pro</strong>：複数シーズン対応、高度な集計、優先サポート</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">5-2. 支払い</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>有料プランの決済はStripeを通じて処理されます</li>
              <li>月払い・年払いを選択できます</li>
              <li>料金は税込表示です</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">5-3. 自動更新</h3>
            <p>
              有料プランはサブスクリプション（定期課金）です。解約手続きを行わない限り、契約期間終了時に自動更新されます。
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">5-4. 解約</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>いつでも解約できます</li>
              <li>解約後は次の更新日からFreeプランに戻ります</li>
              <li>解約しても、既に記録したデータは削除されません</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">5-5. 返金</h3>
            <p>
              サブスクリプションの特性上、原則として返金は行っておりません。
              ご不明点があればサポートまでお問い合わせください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第6条（禁止事項）</h2>
            <p>以下の行為を禁止します：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>法令に違反する行為</li>
              <li>他のユーザーへの迷惑行為・誹謗中傷</li>
              <li>サービスの運営を妨害する行為</li>
              <li>不正アクセス・リバースエンジニアリング</li>
              <li>虚偽の情報を登録する行為</li>
              <li>第三者になりすます行為</li>
              <li>その他、運営が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第7条（知的財産権）</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>本サービスに関する知的財産権（デザイン、ロゴ、プログラム等）は運営者に帰属します</li>
              <li>ユーザーが登録した観戦記録データの権利はユーザーに帰属します</li>
              <li>ユーザーは、本サービスの利用に必要な範囲で運営者に対しデータの利用を許諾するものとします</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第8条（免責事項）</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>本サービスは現状有姿で提供されます</li>
              <li>試合情報の正確性・完全性について保証しません</li>
              <li>サービスの中断・停止・変更・終了による損害について責任を負いません</li>
              <li>ユーザーのデータ損失について、運営者の故意または重過失による場合を除き責任を負いません</li>
              <li>外部サービス（Stripe等）の障害による影響について責任を負いません</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第9条（サービスの変更・終了）</h2>
            <p>
              運営者は、事前の通知により（緊急時は事後通知）サービスの内容を変更、または終了することがあります。
              サービス終了時は、可能な限りユーザーがデータをエクスポートできる期間を設けます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第10条（退会・アカウント削除）</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>ユーザーは、サポートへの連絡により退会できます</li>
              <li>退会時、登録データは合理的な期間内に削除されます</li>
              <li>有料プラン契約中の場合、残り期間分の返金は原則として行いません</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第11条（準拠法・管轄）</h2>
            <p>
              本規約は日本法に準拠し、紛争が生じた場合は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">第12条（規約の変更）</h2>
            <p>
              運営者は、必要に応じて本規約を変更することがあります。
              変更後の規約は、本サービス内で公表した時点から効力を生じます。
              重要な変更がある場合は、事前にお知らせします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">お問い合わせ</h2>
            <p>
              本規約に関するお問い合わせは、
              <a href="/support" className="text-primary hover:underline">お問い合わせページ</a>
              よりご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
