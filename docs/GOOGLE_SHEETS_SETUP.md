# Google Sheets連携セットアップガイド

## 📋 概要

このガイドでは、Google Sheetsからマリノスの試合データを自動同期するための環境設定手順を説明します。

## 🎯 必要な環境変数

```bash
GAS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GAS_API_TOKEN=your-secret-token-here
```

## 📝 セットアップ手順

### Step 1: Google Sheetsの準備

1. **スプレッドシートを作成**
   - Google Sheetsで新しいスプレッドシートを作成
   - シート名: `試合データ` (任意)

2. **列の構造**

   以下の列を作成してください：

   | 列名 | 説明 | 必須 |
   |------|------|------|
   | `match_id` | 試合ID (例: `2024-05-12-marinos-vs-kashima`) | ✅ |
   | `date` | 試合日 (YYYY-MM-DD形式) | ✅ |
   | `opponent` | 対戦相手 | ✅ |
   | `home_score` | ホームチームのスコア | |
   | `away_score` | アウェイチームのスコア | |
   | `stadium` | スタジアム名 | |
   | `kickoff` | キックオフ時刻 (HH:MM形式) | |
   | `competition` | 大会名 | |
   | `ticket_sales_start` | チケット販売開始日時 | |
   | `notes` | 備考 | |

3. **サンプルデータ**

   ```
   match_id                          | date       | opponent      | home_score | away_score | stadium          | kickoff | competition
   2024-05-12-marinos-vs-kashima     | 2024-05-12 | 鹿島アントラーズ | 2          | 1          | 日産スタジアム    | 14:00   | J1リーグ
   2024-05-19-kawasaki-vs-marinos    | 2024-05-19 | 川崎フロンターレ |            |            | 等々力陸上競技場  | 19:00   | J1リーグ
   ```

### Step 2: Google Apps Script (GAS) の設定

1. **スクリプトエディタを開く**
   - スプレッドシートで「拡張機能」→「Apps Script」を選択

2. **以下のコードを貼り付け**

```javascript
// ============================================
// マリノスオシカケアプリ - Google Sheets API
// ============================================

const SHEET_NAME = '試合データ'; // シート名
const API_TOKEN = 'YOUR_SECRET_TOKEN'; // セキュリティトークン（変更必須）

/**
 * POST リクエストを処理
 */
function doPost(e) {
  try {
    // Authorization ヘッダーをチェック
    const authHeader = e.parameter.authorization || e.postData?.contents;

    // トークン認証
    if (!authHeader || !authHeader.includes('Bearer ' + API_TOKEN)) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // リクエストボディをパース
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // アクション処理
    if (action === 'getMatches') {
      const matches = getMatchesFromSheet();
      return createResponse(200, {
        success: true,
        matches: matches
      });
    } else {
      return createResponse(400, { error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.toString()
    });
  }
}

/**
 * シートから試合データを取得
 */
function getMatchesFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  // ヘッダー行（1行目）を取得
  const headers = values[0];

  // データ行（2行目以降）を処理
  const matches = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    // 空行をスキップ
    if (!row[0]) continue;

    const match = {};
    headers.forEach((header, index) => {
      match[header] = row[index];
    });

    matches.push(match);
  }

  return matches;
}

/**
 * レスポンスを作成
 */
function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * テスト用GET（開発時のみ使用）
 */
function doGet(e) {
  return createResponse(200, {
    status: 'API is running',
    timestamp: new Date().toISOString()
  });
}
```

3. **トークンを設定**

   コード内の `YOUR_SECRET_TOKEN` を安全なランダム文字列に変更：

   ```javascript
   const API_TOKEN = 'abc123xyz789_YOUR_SECURE_TOKEN_HERE';
   ```

   **トークン生成例（ターミナル）:**
   ```bash
   # macOS/Linux
   openssl rand -hex 32

   # または
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **デプロイ**

   - 「デプロイ」→「新しいデプロイ」をクリック
   - 種類: 「ウェブアプリ」を選択
   - 設定:
     - 説明: `マリノスオシカケAPI`
     - 次のユーザーとして実行: `自分`
     - アクセスできるユーザー: `全員`
   - 「デプロイ」をクリック
   - **デプロイID付きURLをコピー**
     - 例: `https://script.google.com/macros/s/AKfycbxXXXXXXXXXXX/exec`

### Step 3: アプリケーション側の設定

1. **.env ファイルを編集**

   ```bash
   # Google Sheets API設定
   GAS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   GAS_API_TOKEN=abc123xyz789_YOUR_SECURE_TOKEN_HERE
   ```

2. **環境変数を検証**

   ```bash
   pnpm validate-env
   ```

   出力例：
   ```
   ✅ GAS_API_URL: https://script.google.com/macros/s/AKfycbx.../exec
   ✅ GAS_API_TOKEN: ***************************
   ```

### Step 4: 接続テスト

1. **手動同期をテスト**

   アプリケーションを起動し、管理者アカウントでログイン後：

   ```typescript
   // tRPC経由で同期を実行
   const result = await trpc.matches.syncFromSheets.mutate({
     overwriteArchived: false
   });

   console.log(result);
   // {
   //   success: true,
   //   message: "同期完了: 3件新規追加、0件更新、0件スキップ",
   //   data: { ... }
   // }
   ```

2. **同期ログを確認**

   ```typescript
   const logs = await trpc.matches.getSheetsSyncLogs.query({ limit: 10 });
   console.log(logs);
   ```

## 🔧 トラブルシューティング

### エラー: "GAS_API_URL or GAS_API_TOKEN is not configured"

**原因**: 環境変数が設定されていない

**解決策**:
1. `.env` ファイルに `GAS_API_URL` と `GAS_API_TOKEN` を追加
2. アプリケーションを再起動

### エラー: "Request failed with status code 401"

**原因**: トークンが一致していない

**解決策**:
1. GASスクリプトの `API_TOKEN` と `.env` の `GAS_API_TOKEN` が一致しているか確認
2. トークンに余分なスペースや改行がないか確認

### エラー: "Sheet '試合データ' not found"

**原因**: シート名が一致していない

**解決策**:
1. GASスクリプトの `SHEET_NAME` を実際のシート名に変更
2. または、スプレッドシートのシート名を「試合データ」に変更

### エラー: "Request timed out after 30000 ms"

**原因**: ネットワーク接続の問題、またはGASスクリプトが応答しない

**解決策**:
1. インターネット接続を確認
2. GASデプロイURLが正しいか確認
3. GASスクリプトにエラーがないか確認（Apps Scriptの実行ログを確認）

## 🔐 セキュリティのベストプラクティス

1. **トークンの管理**
   - トークンは32文字以上のランダムな文字列を使用
   - `.env` ファイルを `.gitignore` に追加（既に追加済み）
   - 本番環境では環境変数をサーバー設定で管理

2. **アクセス制限**
   - GASのデプロイは「全員」アクセス可能にする必要がありますが、トークン認証で保護されています
   - 管理者のみが同期機能を実行できるようtRPCルーターで制限済み

3. **定期的なトークン更新**
   - 3〜6ヶ月ごとにトークンを更新することを推奨
   - 更新時は、GASスクリプトと `.env` の両方を同時に更新

## 📊 データ同期の仕様

### 同期ロジック

1. **新規試合**: Sheetsにあり、DBにない試合 → 挿入
2. **既存試合**: Sheetsにあり、DBにもある試合 → 更新（条件付き）
3. **アーカイブ保護**: `isResult=1`（結果確定済み）の試合はデフォルトでスキップ
4. **強制上書き**: `overwriteArchived: true` を指定すると全て更新

### match_id の重要性

`match_id` は試合の一意識別子です。以下の形式を推奨：

```
{date}-marinos-vs-{opponent}
例: 2024-05-12-marinos-vs-kashima
```

- 日付は YYYY-MM-DD 形式
- チーム名はハイフンで区切る
- 重複しない一意の値にする

### スコアの扱い

- `home_score` / `away_score` が両方入力されている → 結果確定 (`isResult=1`)
- どちらかが空 → 予定試合 (`isResult=0`)
- アプリ側で自動的に判定されます

## 🔄 自動同期の設定（今後実装予定）

Phase 3の次のステップとして、定期的な自動同期機能を実装予定：

```typescript
// 例: 1時間ごとに自動同期
setInterval(async () => {
  await syncFromGoogleSheets({ overwriteArchived: false });
}, 60 * 60 * 1000);
```

cron ジョブまたはサーバーレスファンクション（Vercel Cron など）での実装を検討中。

## 📚 関連ファイル

- `server/sheets-sync.ts` - Google Sheets同期のコアロジック
- `server/routers/matches.ts` - tRPCエンドポイント (`syncFromSheets`, `getSheetsSyncLogs`)
- `drizzle/schema.ts` - `syncLogs` テーブル定義

## 🆘 サポート

問題が解決しない場合は、以下の情報を添えてIssueを作成してください：

1. エラーメッセージ全文
2. `pnpm validate-env` の出力
3. GASスクリプトの実行ログ（Apps Scriptエディタの「実行ログ」）
4. 同期ログ（`trpc.matches.getSheetsSyncLogs` の結果）
