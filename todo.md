# Marinos Away Log V2 - TODO

## North Star Goal
公式の試合情報を基盤データとして取り込み、ユーザーが**観戦した試合の記録**と**費用**を蓄積できる。  
さらに、観戦試合の**結果集計（勝敗など）**と**費用集計（合計・平均・内訳）**を行えるアプリにする。

---

## Current Status (High Level)

### ✅ Done / Implemented
- DBスキーマ（Drizzle）: `matches`, `userMatches`, `syncLog`
- 公式試合データ同期（tRPC）: `matches.fetchOfficial`
- 公式試合一覧ページ: `/matches`
- 試合詳細ページ + 観戦ログCRUD（tRPC + UI）
- フィルタリング（期間/対戦相手/Home-Away）※実装済み

### 🚧 In Progress / Needs Stabilization
- スクレイピング精度の固定（公式サイトの構造変化に追従、JSON-LD優先）
- “実データ” を用いた統合テストの整備（季節を跨ぐデータ・欠損耐性）

### ⏳ Not Started (MVP Remaining)
- Stats（戦績・費用）集計API
- Statsページ（集計画面）
- 最終QA/最適化

---

## MVP (Must-have)

### 1) Stats 集計API（tRPC）
**Goal**: 観戦ログ（userMatches）と公式試合（matches）から集計を返す。

- [ ] `stats.getSummary(year | from/to)` を追加
- [ ] 返却: 観戦数、勝分敗（マリノス視点）、未確定数、費用合計、平均費用
- [ ] 0件でも落ちない（watchCount=0 → average=0）
- [ ] Unit tests（最低: 0件/勝/負/分/未確定 混在）

**Acceptance**
- [ ] 年フィルタで正しい数値が返る
- [ ] スコア未確定は `unknown` に入る
- [ ] costTotal が合計され、平均が正しい

### 2) Stats ページ（UI）
**Goal**: 期間フィルタ付きで集計を表示。

- [ ] ページ追加（例: `/stats`）
- [ ] 年セレクト（MVPは年のみでOK）
- [ ] 表示: 観戦試合数 / 勝分敗 / 未確定 / 費用合計 / 平均
- [ ] Empty（0件）と Error UI を実装

**Acceptance**
- [ ] 年変更で集計が更新される
- [ ] 0件は “観戦記録なし” 表示
- [ ] API失敗時も画面が落ちない

### 3) スクレイピング品質固定（MVP基準）
**Goal**: 観戦ログと集計が成立するだけの精度で、必須フィールドが埋まる。

必須フィールド（目標）:
- date, kickoff, competition, roundLabel, stadium
- home, away, homeScore, awayScore, status
- sourceUrl（matchUrl）

- [ ] 同一試合の重複排除（URL正規化/キー統一）
- [ ] 失敗時ログ（URL/ステータス/例外）を残す
- [ ] 実データで統合テスト（最低: 1シーズン or 3ヶ月）

---

## Post-MVP (Nice-to-have)
- [ ] 費用カテゴリ内訳（交通/チケット/飲食…）
- [ ] グラフ/チャート（勝率推移、月別支出など）
- [ ] オフライン体験の強化（キャッシュ戦略の明文化）
- [ ] 共有/エクスポート（CSV等）

---

## Release Checklist (MVP)
- [ ] 同期 → 一覧表示 → 詳細 → 観戦記録追加/編集/削除 → Stats表示 が一通り動く
- [ ] モバイル幅で主要画面が破綻しない
- [ ] テストが全て通る（`pnpm test`）
