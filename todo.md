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
- フィルタリング（期間/対戦相手/Home-Away）
- **Stats 集計API（tRPC）**: `stats.getSummary`, `stats.getAvailableYears`
- **Statsページ（UI）**: `/stats` - 年セレクト、観戦数/勝分敗/費用集計表示、Empty/Error UI

### 🚧 In Progress / Needs Stabilization
- スクレイピング精度の固定（公式サイトの構造変化に追従、JSON-LD優先）
- "実データ" を用いた統合テストの整備（季節を跨ぐデータ・欠損耐性）

### ⏳ Not Started (MVP Remaining)
- 最終QA/最適化

---

## Post-MVP (Nice-to-have)
- [ ] 費用カテゴリ内訳（交通/チケット/飲食…）
- [ ] グラフ/チャート（勝率推移、月別支出など）
- [ ] オフライン体験の強化（キャッシュ戦略の明文化）
- [ ] 共有/エクスポート（CSV等）

---

## Release Checklist (MVP)
- [x] Stats 集計API実装
- [x] Statsページ（年セレクト、集計表示、Empty/Error UI）
- [ ] 同期 → 一覧表示 → 詳細 → 観戦記録追加/編集/削除 → Stats表示 が一通り動く
- [ ] モバイル幅で主要画面が破綻しない
- [ ] テストが全て通る（`pnpm test`）
