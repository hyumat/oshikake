# おしかけログ (Oshikake Log)

## Overview
マリノスサポーター向け観戦記録サービス「おしかけログ」。横浜F・マリノスの公式試合データを取り込み、ユーザーが観戦した試合の記録と費用を蓄積。観戦試合の結果集計（勝敗）と費用集計（合計・平均）を行うWebアプリケーション。

A Japanese-language web application for tracking Yokohama F. Marinos (J-League) match attendance. Users can log matches they've attended, track expenses (transportation, tickets, food), and view statistics about their match attendance history.

## Project Structure
- `client/` - React frontend with Vite
  - `src/pages/` - Page components (Home, Matches, MatchDetail, Landing)
  - `src/components/` - UI components (shadcn/ui based)
  - `src/lib/` - Utilities and tRPC client
- `server/` - Express backend with tRPC
  - `_core/` - Core server infrastructure (auth, Vite middleware, etc.)
  - `routers/` - tRPC routers for API endpoints
  - `db.ts` - Database operations with Drizzle ORM
- `drizzle/` - Database schema and migrations
- `shared/` - Shared types between client and server

## Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, shadcn/ui components
- **Backend**: Express, tRPC
- **Database**: MySQL via Drizzle ORM
- **Package Manager**: pnpm

## Running the Application
- Development: `pnpm run dev` (runs on port 5000)
- Build: `pnpm run build`
- Production: `pnpm run start`

## Environment Variables
- `DATABASE_URL` - MySQL connection string (required for database features)
- `SESSION_SECRET` - Session secret for authentication
- `VITE_ANALYTICS_ENDPOINT` - Optional analytics endpoint
- `VITE_ANALYTICS_WEBSITE_ID` - Optional analytics website ID

## Design
- カラースキーム: マリノストリコロール（青 #0022AA、白、赤 #C8102E）を控えめに使用
- モバイルファースト設計
- shadcn/ui コンポーネントベース

## Recent Changes
- 2026-01-02: GitHub Issue #50 完了 - 実効プラン値をAPIで統一（期限切れでもPro表示されない）
  - shared/billing.ts: getEffectivePlan()関数追加、PlanStatusにeffectivePlanフィールド追加
  - calculatePlanStatus()がeffectivePlanを返すように更新
  - PlanStatusBadgeがeffectivePlanを使用（期限切れProはFreeとして表示）
  - MatchDetail.tsxがeffectivePlanをPlanStatusBadgeに渡すよう更新
  - 5件の新規テスト追加（getEffectivePlan、effectivePlan関連）
  - 全161テストパス

- 2026-01-01: GitHub Issue #44 完了 - 無料プラン制限（今季10件まで）
  - shared/billing.ts: FREE_PLAN_LIMIT, isPro, canCreateAttendance, calculatePlanStatus
  - server/db.ts: getAttendanceCountForSeason, getUserPlan
  - userMatches.getPlanStatus API追加
  - saveAttendance APIに制限チェック追加（LIMIT_REACHEDエラー）
  - LimitReachedModal, PlanStatusBadgeコンポーネント作成
  - MatchDetail.tsxに制限表示・モーダル統合
  - /pricing 料金プランページ追加（無料・Proプラン比較）
  - LPフッターに料金リンク追加
  - 15件のbilling.test.ts追加、全156テストパス

- 2026-01-01: GitHub Issue #19, #27, #28, #29, #30, #31, #32, #33, #47 完了 - MVPリリース直前仕上げ
  - Issue #47: セキュリティ+アナリティクス設計
    - matchExpenses, auditLogs, eventLogsテーブル追加
    - seasonYearフィールドをuserMatchesに追加
    - docs/security.md, docs/analytics.md作成
  - Issue #19: 費用データのDB永続化
    - LocalStorage → DB統一
    - userMatches.saveAttendance/getByMatchId/deleteByMatchId APIを実装
    - MatchDetail.tsxをDB-backed tRPC APIに移行
  - Issue #31: 観戦記録フォームUX改善
    - プレースホルダー「例）2400」「例）5000」等を追加
    - バリデーション文言が自然な日本語
  - Issue #29: エラー表示統一（QueryState共通コンポーネント使用）
  - Issue #30: Stats表示調整（0件表示、年切替、数字フォーマット済み）
  - Issue #32: モバイル表示はレスポンシブ対応済み
  - Issue #28: 同期ボタンUX（ローディング、トースト、二重実行防止済み）
  - Issue #33: docs/release-checklist.md作成
  - 全141テストパス

- 2025-12-31: GitHub Issue #34, #35, #40, #41, #42, #43 完了 - LP全面刷新
  - Issue #40: LP文言を確定稿に全面差し替え
    - Hero: 「観戦の記録と、観戦にかかった費用を"ちゃんと残す"。」
    - 共感→危機→解決→期待の心理導線
    - FAQ 3問に整理
  - Issue #35: alt/meta/OGP監査
    - index.htmlにmeta description, OGPタグを追加
    - 禁止語ゼロ確認
  - Issue #41: デザイン刷新（Land-book級）
    - FadeInSectionによるスクロールアニメーション
    - 控えめトリコロール（青メイン、赤アクセント最小）
    - 8pt系余白ルール適用
  - Issue #42: LP画像7点を作成・実装
    - lp-hero.png, lp-pain.png, lp-step-1/2/3.png, lp-stats.png, lp-future.png
    - 画像内テキストなし
    - client/public/lp/に配置
  - Issue #43: アイコン導入
    - favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png
    - icons/icon-192.png, icon-512.png, maskable-icon-512.png, og-image.png
    - manifest.webmanifest作成

- 2025-12-31: GitHub Issue #36, #37, #38, #39 完了 - リファクタリング
  - Issue #36: 共通Formatter導入（formatCurrency, formatDateTime, formatWDL, formatScore, calcAverage）
    - shared/formatters.ts に集約、20件のユニットテスト
    - 全ページで統一表示（NaN/undefined表示なし）
  - Issue #37: API DTO定義とNull安全性強化
    - shared/dto.ts: MatchDTO, StatsSummaryDTO, toMatchDTO, createEmptyStatsSummary
    - 7件のDTOテスト
  - Issue #38: QueryState共通コンポーネント
    - QueryLoading, QueryError, QueryEmpty, QueryState コンポーネント
    - Stats.tsx, MatchDetail.tsx で使用
  - Issue #39: MatchDetail View/Form分離
    - MatchDetailView: 試合情報表示
    - UserMatchForm: 費用入力フォーム
    - shared/validation.ts: validateExpenseData, calculateTotalCost + 10件テスト
  - 合計141テストパス

- 2025-12-31: GitHub Issue #25 & #26 完了
  - Issue #25: LP文言全面見直し
    - 「マリノスサポーター」表現を完全削除
    - 「Jリーグ公式試合情報」「公式データ」強調を回避
    - 「観戦記録を続けられる」「振り返り・費用管理」に価値訴求をシフト
  - Issue #26: LP用スクショ画像3点を差し替え（参考画像スタイル適用）
    - match_list_app_screenshot.png: 試合一覧画面、シンプルiOSスタイル
    - match_log_form_screenshot.png: 観戦記録フォーム（参考画像に準拠）
    - stats_dashboard_screenshot.png: 集計画面、クリーンなミニマルデザイン
    - フェイクエンブレム撤去、エンブレムなしのシンプルデザイン

- 2025-12-31: GitHub Issue #12 完了 - LP開発用語削除・日本語改善
  - JSON-LD/フォールバック/MVP/PWA/Mobile-first/MD等の開発用語を削除
  - FAQ/ロードマップをユーザー向け日本語に書き換え
  - ヘッダーは独自ロゴ「お」で偽エンブレム問題なし

- 2025-12-31: LSPエラー修正・OAuth警告レベル変更
  - scraper.tsから6つのユーティリティ関数をエクスポート
  - scraper.test.tsで実際の関数をインポートしてテスト（インライン実装を削除）
  - OAuthのエラーメッセージを警告に変更（認証なしでもアプリ動作可能）
  - 全104テストパス

- 2025-12-31: GitHub Issue #10 & #11 完了
  - Issue #11: matchUrl正規化とgenerateMatchKey()による重複防止
  - Issue #10: syncLog永続化（URL/status/exception/duration/counts追跡）
  - unified-scraperテスト9件追加

- 2025-12-30: StatsページUI改善 (GitHub Issue #2)
  - APIレスポンス形式を新構造に対応: cost.total, record.win等
  - エラー状態に再試行ボタンを追加
  - DB接続エラー時のグレースフルフォールバック（空結果を返す）
  - 0件時の空表示、エラー時の再試行、円表示対応を確認

- 2025-12-30: Stats集計バックエンド改善 (GitHub Issue #1)
  - stats.getSummary API: matchesテーブルとJOINしてhomeScore/awayScoreから勝敗判定
  - 出力形式を仕様に準拠: { period, watchCount, record: {win, draw, loss, unknown}, cost: {total, averagePerMatch} }
  - calculateResult関数を追加（勝敗判定ロジックを分離）
  - ユニットテスト追加: 23件（0件/勝ち/負け/引き分け/unknown混在ケースをカバー）

- 2025-12-30: マッチ詳細ページ実装
  - 観戦費用記録機能（交通費/チケット代/飲食代/その他）
  - LocalStorageで費用データを永続化
  - スコア表示（過去試合のみ）
  - 観戦ステータス管理（参加/不参加/未定）を一覧ページに統合

- 2025-12-29: マッチログ機能改善（第2弾）
  - 終了試合と今後の予定を視覚的に区別（ボーダー色、バッジ）
  - HOME/AWAYを色分けバッジで表示（青/赤）
  - 大会名・節情報を独立バッジで表示
  - 会場名にGoogle Mapsリンクを追加
  - マリノス公式サイトからの今後の試合取得を追加（unified-scraper.ts）
  - 今後の試合を先頭にソートして表示

- 2025-12-29: マッチログ機能改善（第1弾）
  - スコア表示バグ修正（undefined-undefined → vs表示）
  - 手動更新ボタン追加（公式から取得）、ページ読み込み時の自動スクレイピングを廃止
  - エラーハンドリング改善：DB接続失敗時もテストデータで動作
  - success flagチェック追加でスクレイパー失敗をUIに反映

- 2025-12-29: LPリブランディング
  - サービス名を「おしかけログ」に変更
  - マリノスカラー（トリコロール：青・白・赤）を控えめに適用
  - 使い方セクションに説明画像3枚を追加（attached_assets/generated_images/）
  - Vite設定でattached_assetsへのアクセスを許可

- 2025-12-29: Stats機能を実装 (MVP)
  - stats.getSummary API: 観戦数、勝分敗、費用合計、平均費用を返す
  - stats.getAvailableYears API: 観戦記録がある年のリストを返す
  - /stats ページ: 年セレクト付きの集計画面
  - Empty状態とError UIを実装
  - ナビゲーションに「集計」リンクを追加
  
- 2025-12-29: Configured for Replit environment
  - Updated Vite config to allow all hosts for Replit proxy
  - Updated server to bind to 0.0.0.0:5000
  - Set up deployment configuration
