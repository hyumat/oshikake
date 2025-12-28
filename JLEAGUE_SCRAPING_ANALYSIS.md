# Jリーグ公式サイト スクレイピング分析

## URL
https://www.jleague.jp/match/search/?category%5B%5D=100yj1&category%5B%5D=j2j3&category%5B%5D=j1&category%5B%5D=leaguecup&category%5B%5D=j2&category%5B%5D=j3&category%5B%5D=playoff&category%5B%5D=j2playoff&category%5B%5D=J3jflplayoff&category%5B%5D=emperor&category%5B%5D=acle&category%5B%5D=acl2&category%5B%5D=acl&category%5B%5D=fcwc&category%5B%5D=supercup&category%5B%5D=asiachallenge&category%5B%5D=jwc&club%5B%5D=yokohamafm&year=2025

## 主な発見

### 1. ページ構造
- **動的レンダリング**: JavaScriptで試合情報が動的に読み込まれる
- **試合カード形式**: 各試合が独立したカード要素で表示
- **スコア表示**: 「横浜FM 1 試合終了 0 上海申花」のような形式

### 2. 試合情報の表示パターン
```
[対戦相手チーム] [スコア] 試合終了/予定 [スコア] [相手チーム]
例: 横浜FM 1 試合終了 0 上海申花
```

### 3. 抽出可能な情報
- **試合日**: 「2025年2月12日(木)」形式
- **大会**: 「AFCチャンピオンズリーグ」など
- **スコア**: ホームスコア、アウェイスコア
- **対戦チーム**: ホームチーム、アウェイチーム
- **試合状態**: 「試合終了」「予定」
- **スタジアム**: 「日産スタジアム」など（テキストに含まれる）

### 4. HTML構造
- 各試合は `<a>` タグ内に含まれている
- テキストから日付、スコア、チーム名を抽出可能
- 試合詳細ページへのリンク有り

### 5. スクレイピング戦略
1. **Cheerio でページをパース**
2. **試合カードを識別**: 「試合終了」「予定」を含むテキストを検索
3. **正規表現で情報抽出**:
   - 日付: `(\d{4}年\d{1,2}月\d{1,2}日)`
   - スコア: `(\d+)\s*試合終了\s*(\d+)` または `(\d+)\s*予定\s*(\d+)`
   - チーム名: スコアの前後のテキスト
4. **複数セレクタでフォールバック**

### 6. 課題
- JavaScriptレンダリング必須（静的HTMLではスコアが見えない）
- Puppeteer や Playwright の使用を検討する必要があるかもしれない
- ただし、Cheerio + リトライロジックで対応可能な可能性もある

## 実装計画
1. Cheerio でHTMLをパース
2. 正規表現で試合情報を抽出
3. 日付を ISO 形式に変換
4. 試合結果と会場情報をDB に保存
