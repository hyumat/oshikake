# Changelog

横浜F・マリノス サポーター向け観戦記録・費用管理アプリ の変更履歴です。

このファイルは \`docs/release_notes.json\` から自動生成されています。
手動で編集しないでください。再生成: \`npm run release:changelog\`

---

## [0.2.0] - 2026-01-30

**Post-MVP 機能拡充リリース**

### ハイライト

- 遠征傾向（宿泊・交通・予算）の集約・閲覧機能を追加
- 過去の自分（Past Self）振り返り機能を追加（Plus/Pro限定）
- 旅行プラン（交通・宿泊・スポット）CRUD 機能を追加
- Pro限定カスタム費用カテゴリ機能を追加
- Freeプラン集計閲覧を初回記録から1年間に制限

### 新機能

- **[バックエンド]** 遠征傾向 (travel_intents) バックエンド: upsert / mine / trends (k-anonymity K=20) / delete (#79)
- **[フロントエンド]** 遠征傾向入力フォーム (TravelPlanForm) とトレンド表示 (TravelTrends) を MatchDetail に追加 (#81)
- **[フルスタック]** Past Self 機能 (Plus/Pro限定): 同会場・同対戦相手の過去観戦記録を表示 (#110)
- **[フルスタック]** 旅行プラン (Trip Plans) CRUD: 交通・宿泊・スポットの管理機能 (#203)
- **[フルスタック]** Pro限定カスタム費用カテゴリ: customCategories テーブル、管理UI、expenses 連携 (#74)
- **[フルスタック]** Freeプラン集計閲覧1年制限: firstAttendedAt 追跡、statsAccessExpiresAt エンタイトルメント、StatsPaywall UI (#77)

### バグ修正

- **[ドキュメント]** Freeプラン上限を全ドキュメント・UIで 7 に統一 (10→7) (#198)

### リファクタリング

- **[バックエンド]** N+1クエリ修正、ヘルパー集約 (requireDb, isDbConnectionError, requireAttendanceCapacity, getExpensesByUserMatchIds)、型安全性向上 (#131)

### メンテナンス

- **[フロントエンド]** Pricing ページ再設計: 比較表拡充、FAQ追加 (カスタムカテゴリ、集計閲覧期間、planned vs attended 説明) (#74, #77)

---

## [0.1.0] - 2026-01-29

**MVP リリース**

### ハイライト

- OAuth 認証、観戦記録 CRUD、費用管理の基本機能を実装
- Jリーグ全チーム対応と試合データCSVインポート
- 管理者ダッシュボード（試合管理・データ品質監視）
- お気に入りチーム選択とチーム別試合フィルタ
- 3段階プラン (Free/Plus/Pro) と Stripe 決済基盤

### 新機能

- **[フルスタック]** OAuth 認証 (LINE/Google) + セッション管理
- **[フルスタック]** 観戦記録 CRUD (planned/attended)、費用記録、メモ、勝敗判定
- **[バックエンド]** 試合データ CSV/Excel インポート機能 (管理者用)
- **[フロントエンド]** 管理者ダッシュボード: データ品質監視、試合編集、ソート・並び替え
- **[フルスタック]** お気に入りチーム選択 + チーム別試合フィルタリング
- **[フルスタック]** 3段階プラン (Free 7件/Plus 無制限/Pro 全機能) + Stripe 決済連携
- **[フルスタック]** 観戦集計ページ (Stats): 勝敗・費用合計・年別フィルタ・共有モーダル

---
