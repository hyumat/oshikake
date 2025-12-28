# Marinos Away Log V2 - Project TODO

## Phase 1: Project Setup & Schema Design
- [x] Project initialized with web-db-user scaffold
- [x] Database schema designed (matches, userMatches, sync logs)
- [x] Drizzle schema.ts updated with match-related tables
- [x] Database migrations applied (pnpm db:push)
- [x] todo.md created
## Phase 2: Scraping Logic Research & Design
- [x] Jリーグ公式サイト構造を調查
- [x] JSON-LD データ抽出パターンを確認
- [x] HTML セレクタ フォールバックを設計
- [x] エラーハンドリング戦略を定群義

## Phase 3: Robust Scraping API Implementation
- [x] Cheerio + Node-fetch を使用した基本スクレイピング実装
- [x] JSON-LD パーサー実装（最優先）
- [x] 多重フォールバック セレクタ実装
- [x] エラーハンドリング・リトライロジック実装
- [x] 試合データ正規化関数実装
- [x] API エンドポイント実装 (/api/trpc/matches.fetchOfficial)
- [x] スクレイピング機能のテスト実装

## Phase 4: Database Schema & Operations
- [x] matches テーブル設計（試合情報）
- [x] userMatches テーブル設計（ユーザーの観戦記録）
- [x] syncLog テーブル設計（同期履歴）
- [x] server/db.ts に DB クエリヘルパー実装
- [x] マイグレーション実行

## Phase 5: Frontend Basic Structure & Mobile UI
- [x] デザイン方針決定（カラーパレット、タイポグラフィ、アイコン）
- [x] グローバルスタイル設定（index.css）
- [x] ナビゲーション構造設計
- [x] ホームページ実装
- [x] 試合一覧ページ実装
- [x] モバイル対応テストスポンシブ UI 実装

## Phase 6: Match Management Features
- [x] マッチ一覧ページ実装
- [x] 公式試合データ同期機能実装
- [x] マッチ追加機能実装（My Match Log に追加）
- [x] マッチ詳細ページ実装
- [x] マッチ編集機能実装（コスト、メモ）
- [x] マッチ削除機能実装
- [x] データ同期ロジック実装

## Phase 7: Statistics & Display
- [ ] 統計計算ロジック実装（勝敗、費用合計、試合数）
- [ ] 統計ページ実装
- [ ] グラフ・チャート表示実装
- [ ] 統計データのテスト実装

## Phase 8: Final Testing & Optimization
- [ ] 全機能の統合テスト
- [ ] モバイルデバイスでのテスト
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング検証
- [ ] 最終チェックポイント作成
- [ ] ユーザーへの納品

## Known Issues & Constraints
- Jリーグ公式サイトの構造変化に対応するため、JSON-LD を最優先とする
- スクレイピングの失敗時は詳細なエラーログを記録
- オフラインでも過去のデータは表示可能にする

## Phase 8: UI Language Localization
- [x] Home.tsx を日本語に統一
- [x] Matches.tsx を日本語に統一
- [x] ボタンラベルを日本語に統一
- [x] エラーメッセージを日本語に統一
- [x] 日本語表示の確認テスト

## Phase 9: Bug Fix - Sync Functionality
- [x] matches.fetchOfficial エンドポイントのデバッグ
- [x] matches.listOfficial エンドポイントのデバッグ
- [x] フロントエンドの同期ロジック検証
- [x] エラーハンドリングの改善
- [x] 同期機能の統合テスト

## Phase 10: Comprehensive Data Scraping - Future & Past Matches
- [x] 横浜F・マリノス公式サイトの構造調査
- [x] 未来試合日程の取得機能実装
- [x] 過去試合結果の取得機能実装
- [x] 複数ソースからのデータ統合
- [x] スクレイピング機能の統合テスト
- [x] UI での同期結果表示改善
- [x] ユニットテスト実装、全テスト成功 (37 tests passed)

## Phase 11: Match Detail Page Implementation
- [x] userMatches テーブルの確認・スキーマ拡張
- [x] tRPC プロシージャ実装（getMatchDetail、addUserMatch、updateUserMatch、deleteUserMatch）
- [x] 試合詳細ページコンポーネント実装
- [x] 観戦記録フォーム実装（コスト、メモ、観戦日時）
- [x] 試合一覧からの詳細ページへのナビゲーション実装
- [x] 詳細ページのテスト実装 (22 tests passed, total 59 tests)

## Phase 12: Filtering Feature Implementation
- [x] フィルタリングUIコンポーネント実装（日付範囲、対戦相手、ホーム/アウェイ）
- [x] フィルタリングロジック実装
- [x] 試合一覧ページへの統合
- [x] フィルタリング状态の保存
- [x] テスト実装

## Phase 13: Bug Fix - Auto-fetch & Sync Button Removal
- [x] 試合情報読み込み失敗の原因調查
- [x] スクレイピング機能のデバッグ
- [x] ページアクセス時の自動読み込み実装
- [x] 同期ボタンの削除
- [x] 強制同期ボタンの削除
- [x] テスト実装・実行 (59 tests passed)
