Recent Changes
2026-01-09: GitHub Issue #120 完了 - サービス名を「オシカケ」に統一（旧「Oshika」表記を全面削除）

日本語表記: オシカケ / 英字表記: Oshikake
index.html/manifest.webmanifest: title/OGP/meta更新
Landing.tsx/Login.tsx/PublicHeader.tsx: UI表記更新
Terms.tsx/Privacy.tsx: 法的ページ更新
docs/*.md, README.md, MVP.md: ドキュメント全面更新
Hero画像をテキストなしイラストに差し替え（hero-illustration.png）
HeroSectionをテキストオーバーレイ方式に変更（ブランディングはHTML/CSS）
2026-01-05: GitHub Issue #100/101/102 完了 - LP視覚的改善

#100: セクション区切りに交互背景（rgba(255,255,255,0.35)）を追加
#101: カードUI調整（背景rgba(255,255,255,0.9)、影0 8px 24px rgba(0,0,0,0.06)、枠線rgba(0,0,0,0.06)）
#102: ヒーロー強化（max-w-6xl、pt-6/8 pb-8/12、影0 16px 48px rgba(0,0,0,0.12)）
2026-01-05: GitHub Issue #99 完了 - LP全体の背景色をヒーロー画像に統一

LP背景色を#F5F1E6（暖色系ベージュ）に変更
ヘッダー背景を#F5F1E6/95に変更
セクション背景を#EDE9DE（少し濃いベージュ）に変更
CSS変数--lp-bgで管理（将来の変更が容易）
2026-01-05: GitHub Issue #98 完了 - Hero画像全面レイアウト＋ホットスポット

Heroセクションを画像のみの全面表示に変更（左テキスト撤去）
HeroSectionコンポーネント新規作成（ホットスポット付き）
画像内ボタン領域にクリック可能なホットスポットを配置
「無料で始める」→ /signup
「使い方を見る」→ #howto
使い方セクションのidを「howto」に変更
DEBUG_HOTSPOTSフラグでホットスポット位置調整可能
ログイン済みユーザーは「ダッシュボードへ」ボタンを表示
2026-01-05: GitHub Issue #96/97 完了 - Hero CTA導線改善・WebP対応

CTA：「無料で始める」→サインアップ遷移、「使い方を見る」→LP内スクロール
使い方セクションにid="how-it-works"を付与、ナビリンク更新
Hero画像を要素でWebP出し分け（hero-pc.webp / hero-sp.webp）
ログイン済みは「ダッシュボードへ」表示
2026-01-05: GitHub Issue #92/93/94/95 完了 - Hero刷新（SurveySparrow風）

lp-hero.png: 旧名称「おしかけログ」を含まない新画像に差し替え（文字なしビジュアル）
Hero直下に価値カード3枚追加（観戦の記録/費用の記録/試合の確認）
CTA統一：Primary「Freeで始める」1つ + テキストリンク「ログインはこちら」
補助文追加：「まずはFreeで。10試合まで無料で記録できます。」
2026-01-05: GitHub Issue #91 完了 - 旧表記「Oshikake」「おしかけ」を全面削除

docs/export-design.md: ファイル名を「oshika_」に変更
docs/offline-design.md: localStorageキーを「oshika:」に変更
Landing.tsx: 関数名をLandingPageに変更
Support.tsx: メールアドレスをsupport@oshika.appに変更
2026-01-05: GitHub Issue #87 完了 - サービス名を「Oshika」に統一

client/index.html: title、OG/Twitterメタタグを「Oshika - 観戦と費用を、ひとつに。」に変更
manifest.webmanifest: name/short_name/descriptionを更新
Landing.tsx: ヘッダー、Hero、フッターの表記を更新
Login.tsx: タイトル・タグラインを更新
PublicHeader.tsx: ロゴaltとテキストを更新
Privacy.tsx/Terms.tsx: サービス名を「Oshika」に統一
docs/*: 全10ファイルで「おしかけログ」→「Oshika」に置換
README.md/MVP.md: プロジェクト名を更新
2026-01-05: GitHub Issue #90 完了 - 新アイコンをReplitへ取り込み

mnt/data/icon-source.pngに生成元画像を保存
scripts/generate-icons.mjsで各サイズのアイコンを自動生成
favicon(16/32)、apple-touch-icon(180)、PWAアイコン(192/512/maskable)を差し替え
logo.pngも同時に更新
2026-01-02: GitHub Issue #76 完了 - ログイン時のアカウントメニュー表示

AccountMenuコンポーネント作成（アカウント/プラン・お支払い/設定/サポート/ログアウト）
DashboardLayoutモバイルヘッダーにAccountMenu追加
PublicHeader共通コンポーネント作成（Pricing/Privacy/Terms/Supportで使用）
全パブリックページでログイン状態に応じたAccountMenu/ログインボタン表示
Landingページヘッダー：ログイン状態でAccountMenu表示、未ログインでログイン/登録ボタン表示
Hero/CTA：ログイン時は「ダッシュボードへ」に変更
ログアウト後はLPにリダイレクト
2026-01-02: GitHub Issue #75 完了 - LP導線先ページ全面アップデート

Pricing: 3プラン比較表追加、記録可能試合の定義説明、FAQ強化（解約・返金・支払い方法）
Privacy: Stripe決済の取り扱い、データ保存期間・削除、セキュリティ対策を明文化
Terms: 3プラン/サブスク運用対応、自動更新・解約・返金方針を明確化
Support: FAQ拡充（料金・プラン、データ・アカウント、不具合・その他カテゴリ分け）、問い合わせ導線整備
2026-01-02: GitHub Issue #73 完了 - 「まずFreeで登録」導線に統一（認証必須化）

LP: ヘッダーに「ログイン」「無料で登録」ボタン追加
LP: Hero CTAを「無料で登録して始める」「ログイン」に変更
/loginページ新規作成
AuthGuardコンポーネント追加（保護ルート用）
App.tsx: /app, /matches, /stats等を認証必須に変更
dev fallback userは既にENV.isProductionで本番無効化済み
2026-01-02: GitHub Issue #70 完了 - LP/機能説明から「Jリーグ公式/公式データ」強調を削除

Home.tsx: 「Jリーグ公式サイトから」「スクレイピング」を削除
Matches.tsx: 「公式から取得」→「最新に更新」に変更
2026-01-02: GitHub Issue #54 完了 - LP「共感→危機→解決→期待」心理導線で改善

Heroサブコピー：残せる3点（観戦メモ/費用/試合情報）を明記
Pain：放置リスク追加、カード文言を自然な日本語に
Features：ベネフィット寄りタイトルに変更
Steps：安心材料（無料10試合/編集可能）追加
FAQ：無料範囲/データ保持/対応端末を追加
CTA：全て「無料で始める」に統一
2026-01-02: GitHub Issue #61 完了 - 原体験をプロダクト原則として文書化

docs/product-principles.md: プロダクト原則（4つの固定原則、ガードレール、プラン差別化の軸）
docs/roadmap.md: 実装ロードマップ（MVP完了済み、v0.2+の優先順位）
README.md: 原体験・プロダクト原則・料金プランセクション追加
docs/billing-design.md: プラン差別化の軸（原体験に沿う）追加
2026-01-02: GitHub Issue #60 完了 - 「記録可能試合」表現に統一

2026-01-02: GitHub Issue #55 完了 - Stripe課金実装
