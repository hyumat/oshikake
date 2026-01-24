# Issue Close コメントテンプレート集

v0.1 MVP Issueをcloseする際に使用するコメントテンプレートです。

---

## 📋 標準テンプレート（全Issue共通）

```markdown
✅ v0.1 MVP完了により自動クローズ

## 完了確認
- ✅ 実装完了
- ✅ テスト完了 (345+ tests passing)
- ✅ コミット確認済み
- ✅ ドキュメント作成済み

詳細: `ISSUES_TO_CLOSE.md` を参照
```

---

## 📂 カテゴリ別詳細テンプレート

### カテゴリ1: MVPコア機能 (#1, #2, #6, #9, #10, #11)

```markdown
✅ MVPコア機能実装完了

## 実装内容
- ✅ Stats集計バックエンド・UI実装
- ✅ 試合一覧フィルタリング機能
- ✅ syncLog永続化とmatchUrl正規化

## テスト結果
- 23+ tests for stats functionality
- All tests passing

## 関連ドキュメント
- `todo.md` - MVP完了項目として記載
```

---

### カテゴリ2: P0重要機能 (#145, #146, #147, #148)

```markdown
✅ P0重要機能実装・テスト完了

## 実装内容
- ✅ Google Sheets + GAS API統合
- ✅ DBスキーマ統一（matchId, ticketSalesStart, notes）
- ✅ 過去試合上書き防止ロジック
- ✅ チケット販売情報表示制御

## テスト結果
- scheduler.test.ts: 10 tests
- sheets-sync.test.ts: 21 tests
- matchHelpers.test.ts: 24 tests
- All tests passing

## 完了報告
詳細は `PHASE3_COMPLETE.md` を参照
```

---

### カテゴリ3: P1高優先度機能 (#143, #144)

```markdown
✅ P1高優先度機能実装・テスト完了

## 実装内容
- ✅ 広告表示制御（Free/Plus/Pro）
- ✅ マリノス貯金機能（自動トリガー・通知）

## テスト結果
- AdBanner.test.tsx: 6 tests
- savings.test.ts: 9 tests
- All 34 tests passing

## 完了報告
詳細は `PHASE2_COMPLETE.md` を参照
```

---

### カテゴリ4: 認証・オンボーディング (#105, #107, #114)

```markdown
✅ 認証・オンボーディング機能実装完了

## 実装内容
- ✅ Google/Apple OAuth実装
- ✅ Post-signup team selection onboarding
- ✅ サインアップ導線の統一

## テスト結果
- passport.test.ts: 9 tests
- users router tested
- Session management validated

## 関連コミット
- `5989d27`: Google/Apple OAuth実装
- `f595c08`: Issue #107 Post-signup team selection onboarding
- `fdcfb2d`: Issue #114 サインアップ導線の統一
```

---

### カテゴリ5: アカウント・プラン管理 (#84, #106, #108, #116, #118, #119)

```markdown
✅ アカウント・プラン管理機能実装完了

## 実装内容
- ✅ Pricing page improvements and Paywall modal
- ✅ プラン制限UI実装（Free 7/10件）
- ✅ Enhanced account settings page
- ✅ Webhook冪等性とentitlements正規化
- ✅ In-app support navigation

## テスト結果
- webhookHandler.test.ts: Webhook idempotency validated
- All billing tests passing

## 関連コミット
- `237a8bc`: Issue #108 Enhanced account settings page
- `7373423`/`fc25cfb`: Issue #106 プラン制限UI実装
- `1422c5b`: Issue #116 Webhook冪等性とentitlements正規化
```

---

### カテゴリ6: 試合・チケット管理 (#122, #123, #124, #151, #161)

```markdown
✅ 試合・チケット管理機能実装完了

## 実装内容
- ✅ 試合登録フロー
- ✅ チケット販売日機能
- ✅ チケット購入情報リンク
- ✅ Stats URL redirect fix
- ✅ Match detail screen 3-tier layout redesign

## テスト結果
- matchHelpers.test.ts: 24 tests
- TypeScript compilation: No errors

## 関連コミット
- `c8ba2ba`: Issue #161 Redesign match detail screen
- `1d7bac0`: Issue #123/#124 チケット販売日機能実装
- `f1cb288`: Issue #122 試合登録フロー
```

---

### カテゴリ7: UI/UX統合 (#150, #152)

```markdown
✅ UI/UX統合機能実装完了

## 実装内容
- ✅ ログイン済みユーザーの自動リダイレクト
- ✅ UI統合とUX改善（グローバルナビ整合）

## テスト結果
- Landing.test.tsx: 6 tests
- DashboardLayout.test.tsx: 3 tests

## 完了報告
詳細は `ISSUE152_COMPLETE.md` を参照

## 関連コミット
- `3eb8d5e`: Issue #152 ログイン後自動遷移と貯金メニュー統合
```

---

### カテゴリ8: コアユーティリティ (#19, #36-#39, #44, #50, #55, #59, #67, #69, #78, #83)

```markdown
✅ コアユーティリティ実装完了

## 実装内容
- ✅ Expenses DB persistence
- ✅ Shared Formatters (currency/date/record)
- ✅ APIレスポンス型の固定化
- ✅ tRPC query state共通化
- ✅ 観戦記録フォーム責務分離
- ✅ プラン制限実装（Free: 7件, Plus/Pro: 無制限）
- ✅ Feature Gate / Entitlements一元化

## テスト結果
- formatters.test.ts: Formatting utilities tested
- dto.test.ts: Data validation tested
- billing.test.ts: Plan limits tested
- All tests passing

## 関連コミット
- `8f365fc`: Issue #78, #83 プラン制限とEntitlements拡張
```

---

## 🎯 使い方

1. Issueのカテゴリを確認
2. 該当するテンプレートをコピー
3. Issueのコメントにペースト
4. "Close issue"ボタンをクリック

---

**作成日**: 2026-01-23
**対象**: v0.1 MVP マイルストーン全42 Issues
