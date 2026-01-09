# Changelog
このファイルは「Keep a Changelog」形式（Added / Changed / Removed / Fixed）で、GitHub Issueベースの変更履歴をまとめたものです。

## [Unreleased]
- （ここに次回リリース分を追記）

---

## [2026-01-09] - 2026-01-09
### Changed
- **サービス名を「オシカケ」に統一**（Issue #120）
  - 表記ルールを確定：日本語 **オシカケ** / 英字 **Oshikake**
  - `index.html` / `manifest.webmanifest`：title / OGP / meta を更新
  - `Landing.tsx` / `Login.tsx` / `PublicHeader.tsx`：UI表記を更新
  - `Terms.tsx` / `Privacy.tsx`：法的ページの表記を更新
  - `docs/*.md` / `README.md` / `MVP.md`：ドキュメントを全面更新
  - Hero画像を **テキストなしイラスト** に差し替え（`hero-illustration.png`）
  - `HeroSection` を **テキストオーバーレイ方式** に変更（ブランディングはHTML/CSS）

### Removed
- 旧「Oshika」表記を全面削除（Issue #120）

---

## [2026-01-05] - 2026-01-05
### Added
- `HeroSection` コンポーネント新規作成（ホットスポット付き）（Issue #98）
- Hero直下に価値カード3枚追加（観戦の記録 / 費用の記録 / 試合の確認）（Issue #92-95）
- 画像内クリック用ホットスポットを追加（Issue #98）
  - 「無料で始める」→ `/signup`
  - 「使い方を見る」→ `#howto`
- `DEBUG_HOTSPOTS` フラグ（ホットスポット位置調整用）（Issue #98）
- 新アイコン生成フロー（Issue #90）
  - 生成元画像：`mnt/data/icon-source.png`
  - 自動生成：`scripts/generate-icons.mjs`

### Changed
- **LPの視覚品質を改善**（Issue #100/#101/#102）
  - セクション交互背景：`rgba(255,255,255,0.35)`（#100）
  - カードUI（背景/影/枠線）調整（#101）
    - 背景：`rgba(255,255,255,0.9)`
    - 影：`0 8px 24px rgba(0,0,0,0.06)`
    - 枠線：`rgba(0,0,0,0.06)`
  - ヒーロー強化（#102）
    - `max-w-6xl`、`pt-6/8 pb-8/12`
    - 影：`0 16px 48px rgba(0,0,0,0.12)`
- **LP背景をヒーロー画像と統一**（Issue #99）
  - LP背景：`#F5F1E6`、ヘッダー：`#F5F1E6/95`、セクション：`#EDE9DE`
  - CSS変数 `--lp-bg` で管理
- **Hero刷新（SurveySparrow風）**（Issue #92-95）
  - `lp-hero.png` を差し替え（旧名称を含まない文字なしビジュアル）
  - CTAを整理：Primary「Freeで始める」+ テキストリンク「ログインはこちら」
  - 補助文追加：「まずはFreeで。10試合まで無料で記録できます。」
- **Hero CTA導線改善・WebP対応**（Issue #96-97）
  - CTA：「無料で始める」→ サインアップ遷移、「使い方を見る」→ LP内スクロール
  - 使い方セクション：`id="how-it-works"` を付与、ナビリンク更新
  - WebP出し分け：`hero-pc.webp` / `hero-sp.webp`
  - ログイン済みは「ダッシュボードへ」を表示
- **Heroを画像全面レイアウトに変更**（Issue #98）
  - Heroを画像のみの全面表示へ（左テキスト撤去）
  - 使い方セクションの id を `howto` に変更
  - ログイン済みユーザーは「ダッシュボードへ」表示
- **サービス名を「Oshika」に統一**（Issue #87）
  - `client/index.html`：title / OG / Twitterメタ更新
  - `manifest.webmanifest`：name / short_name / description 更新
  - `Landing.tsx` / `Login.tsx` / `PublicHeader.tsx` / `Privacy.tsx` / `Terms.tsx`：表記更新
  - `docs/*` / `README.md` / `MVP.md`：置換・更新
- ロゴ/アイコン差し替え（Issue #90）
  - favicon(16/32)、apple-touch-icon(180)、PWA(192/512/maskable)、`logo.png`

### Removed
- 旧表記「Oshikake」「おしかけ」を全面削除（Issue #91）
  - `docs/export-design.md`：ファイル名を `oshika_` に変更
  - `docs/offline-design.md`：localStorageキーを `oshika:` に変更
  - `Landing.tsx`：関数名を `LandingPage` に変更
  - `Support.tsx`：メールを `support@oshika.app` に変更

---

## [2026-01-02] - 2026-01-02
### Added
- アカウントメニュー（Issue #76）
  - `AccountMenu`（アカウント / プラン・お支払い / 設定 / サポート / ログアウト）
  - `DashboardLayout` モバイルヘッダーに追加
- `PublicHeader` 共通コンポーネント（Pricing/Privacy/Terms/Supportで使用）（Issue #76）
- `/login` ページ新規作成（Issue #73）
- `AuthGuard`（保護ルート用）追加（Issue #73）
- Pricing / Privacy / Terms / Support の内容拡充（Issue #75）
  - 3プラン比較表、FAQ強化、Stripe取り扱い明文化、サブスク運用/返金方針、問い合わせ導線整備
- プロダクト原則・ロードマップを文書化（Issue #61）
  - `docs/product-principles.md`
  - `docs/roadmap.md`
  - `docs/billing-design.md`
  - `README.md` に原体験・原則・料金プラン追記

### Changed
- 認証必須化＆導線を「まずFreeで登録」に統一（Issue #73）
  - LPヘッダーに「ログイン」「無料で登録」ボタン追加
  - Hero CTAを「無料で登録して始める」「ログイン」に変更
  - `App.tsx`：`/app` `/matches` `/stats` 等を認証必須に変更
  - ログアウト後はLPへリダイレクト
- 「Jリーグ公式/公式データ」強調を削除（Issue #70）
  - `Home.tsx`：「Jリーグ公式サイトから」「スクレイピング」を削除
  - `Matches.tsx`：「公式から取得」→「最新に更新」
- LP心理導線の改善（Issue #54）
  - 共感→危機→解決→期待の流れに最適化（Hero/Features/Steps/FAQ/CTA）
  - 安心材料（無料10試合/編集可能）を追加
- 「記録可能試合」表現に統一（Issue #60）
- Stripe課金実装（Issue #55）

### Removed
- LP/機能説明から「Jリーグ公式/公式データ」関連の強い言い回し（Issue #70）
