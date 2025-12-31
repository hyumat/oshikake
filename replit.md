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
