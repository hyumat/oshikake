# Issue #86: API-SPORTS統合 - 実装計画

**作成日**: 2026-01-17
**ステータス**: 🔍 調査中
**優先度**: 🔴 最高（データソース変更）

---

## 📋 目的

現在のGoogle Sheets + GAS API経由のデータ取得から、**API-SPORTS（API-Football）** への移行を行う。

### 移行理由（推定）

- ✅ **リアルタイム性**: 15秒ごとの自動更新
- ✅ **信頼性**: 公式APIによる安定したデータ提供
- ✅ **網羅性**: 1,200以上のリーグ、15年以上の履歴データ
- ✅ **保守性**: Google Sheetsの手動更新からの脱却

---

## 🔍 API-SPORTS 概要

### 基本情報

- **公式サイト**: [api-football.com](https://www.api-football.com/)
- **ドキュメント**: [api-football.com/documentation-v3](https://www.api-football.com/documentation-v3)
- **エンドポイント**: `https://v3.football.api-sports.io/`
- **認証方式**: x-rapidapi-key（ヘッダー）

### カバレッジ

- 1,200以上のリーグ・カップ
- リアルタイムスコア（15秒更新）
- 順位表、イベント、ラインナップ、選手統計
- 15年以上の履歴データ

### 料金プラン

- **Free**: 全エンドポイントアクセス可能（登録のみ、クレカ不要）
- **有料プラン**: より高いレート制限

---

## 📊 データマッピング

### 現在のスキーマ（Google Sheets）

```typescript
interface SheetMatchRow {
  match_id: string;          // 固定ID
  date: string;              // YYYY-MM-DD
  opponent: string;          // 対戦相手
  home_score?: number;       // ホームスコア
  away_score?: number;       // アウェイスコア
  stadium: string;           // スタジアム
  kickoff: string;           // HH:MM
  competition: string;       // 大会名
  ticket_sales_start?: string; // チケット販売開始日
  notes?: string;            // 備考
}
```

### API-SPORTS レスポンス（推定）

```typescript
interface APIFootballFixture {
  fixture: {
    id: number;              // API内部ID
    date: string;            // ISO 8601形式
    timestamp: number;       // UNIX timestamp
    venue: {
      name: string;          // スタジアム名
      city: string;
    };
    status: {
      short: string;         // "NS", "FT", "LIVE", etc.
      long: string;
    };
  };
  league: {
    id: number;
    name: string;            // "J1 League"など
    country: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}
```

### マッピング表

| 現在のフィールド | API-SPORTS フィールド | 変換処理 |
|------------------|----------------------|----------|
| match_id | `fixture.id` | 数値→文字列変換 |
| date | `fixture.date` | ISO 8601 → YYYY-MM-DD |
| opponent | `teams.home.name` または `teams.away.name` | 横浜F・マリノスでない方を選択 |
| home_score | `goals.home` | そのまま（null許容） |
| away_score | `goals.away` | そのまま（null許容） |
| stadium | `fixture.venue.name` | そのまま |
| kickoff | `fixture.date` | ISO 8601 → HH:MM抽出 |
| competition | `league.name` | そのまま |
| ticket_sales_start | - | ❌ API-SPORTSには存在しない |
| notes | - | ❌ API-SPORTSには存在しない |

### ⚠️ データギャップ

API-SPORTSには以下のフィールドが存在しません：
- `ticket_sales_start`: チケット販売開始日
- `notes`: 備考

**対応方針**:
- これらのフィールドは手動管理用として残す
- 管理画面（AdminTicketMapping など）で個別に設定可能にする

---

## 🔧 実装タスク

### Phase 1: API-SPORTS クライアント実装（1日）

#### 1. 環境変数設定
```bash
API_SPORTS_KEY=your_api_key_here
API_SPORTS_BASE_URL=https://v3.football.api-sports.io
MARINOS_TEAM_ID=227  # 横浜F・マリノスのチームID（要確認）
```

#### 2. APIクライアント作成
- [ ] `server/apiSportsClient.ts` 作成
- [ ] HTTPクライアント（axios）設定
- [ ] リトライロジック実装（ネットワークエラー対応）
- [ ] レート制限ハンドリング

```typescript
// server/apiSportsClient.ts
export async function getFixturesByTeam(
  teamId: number,
  season: number
): Promise<APIFootballFixture[]> {
  // GET /fixtures?team={teamId}&season={season}
}

export async function getFixtureById(
  fixtureId: number
): Promise<APIFootballFixture> {
  // GET /fixtures?id={fixtureId}
}
```

#### 3. データ変換ヘルパー
- [ ] `server/lib/apiSportsMapper.ts` 作成
- [ ] `APIFootballFixture` → `InsertMatch` 変換関数

```typescript
export function mapFixtureToMatch(
  fixture: APIFootballFixture
): InsertMatch {
  // マッピングロジック
}
```

### Phase 2: 同期ロジック実装（1日）

#### 4. 同期処理リファクタリング
- [ ] `server/sheets-sync.ts` → `server/matchSync.ts` にリネーム
- [ ] データソースを抽象化（Google Sheets / API-SPORTS切り替え可能に）
- [ ] 環境変数でデータソース選択: `MATCH_DATA_SOURCE=api-sports`

```typescript
// server/matchSync.ts
export async function syncMatches(): Promise<SyncResult> {
  const source = process.env.MATCH_DATA_SOURCE || 'sheets';

  if (source === 'api-sports') {
    return syncFromApiSports();
  } else {
    return syncFromGoogleSheets();
  }
}
```

#### 5. API-SPORTS同期実装
- [ ] 横浜F・マリノスの試合データ取得
- [ ] 既存matchesテーブルとのマージロジック
- [ ] 過去試合の上書き防止（Issue #147）
- [ ] `isResult`判定（スコアがある場合）

### Phase 3: テストと検証（半日）

#### 6. テスト実装
- [ ] `server/apiSportsClient.test.ts` 作成
- [ ] `server/lib/apiSportsMapper.test.ts` 作成
- [ ] モックレスポンスでのテスト

#### 7. 手動検証
- [ ] API-SPORTS Free プラン登録
- [ ] J.LeagueのリーグID確認
- [ ] 横浜F・マリノスのチームID確認
- [ ] サンプルデータ取得テスト

### Phase 4: 移行と運用（半日）

#### 8. 段階的移行
- [ ] 開発環境でAPI-SPORTS有効化
- [ ] データ整合性確認
- [ ] Google Sheetsとの差分確認

#### 9. ドキュメント更新
- [ ] `docs/GOOGLE_SHEETS_SETUP.md` → `docs/MATCH_DATA_SYNC.md`にリネーム
- [ ] API-SPORTSセットアップ手順追加

---

## 🚨 課題と考慮事項

### 1. チケット販売開始日の取り扱い

**問題**: API-SPORTSにはチケット情報が存在しない

**解決案**:
- オプションA: 引き続きGoogle Sheetsで管理（チケット情報のみ）
- オプションB: 管理画面で手動設定（AdminTicketMapping拡張）
- オプションC: 外部チケット販売サイトのスクレイピング（将来）

**推奨**: オプションB（管理画面で設定）

### 2. データソースの二重管理

**問題**: 移行期間中、Google SheetsとAPI-SPORTSの両方が存在

**解決案**:
- 環境変数で切り替え可能にする
- API-SPORTSをプライマリ、Google Sheetsをフォールバックとする
- 一定期間後にGoogle Sheets統合を削除

### 3. レート制限

**問題**: API-SPORTS Freeプランのレート制限

**解決案**:
- キャッシュ戦略の実装（DBに保存済みデータは再取得しない）
- 同期頻度の調整（1日1回など）
- 必要に応じて有料プラン検討

### 4. J.Leagueのカバレッジ

**未確認**: API-SPORTSがJ.Leagueを完全にカバーしているか

**確認事項**:
- [ ] J1リーグのリーグID
- [ ] 横浜F・マリノスのチームID
- [ ] 2025/2026シーズンのデータ存在確認
- [ ] リーグカップ、天皇杯などの対応状況

---

## 🎯 実装優先度

### 最優先（今すぐ着手）

1. **API-SPORTS アカウント登録**
   - Freeプラン登録
   - APIキー取得
   - J.LeagueのリーグID/チームID確認

2. **APIクライアント実装**
   - `server/apiSportsClient.ts`
   - データ取得ロジック

### 高優先度（Phase 1完了後）

3. **データマッピング実装**
   - `server/lib/apiSportsMapper.ts`
   - テスト実装

4. **同期ロジック統合**
   - `server/matchSync.ts`
   - データソース切り替え機能

### 中優先度（移行完了後）

5. **チケット情報の代替手段**
   - 管理画面での手動設定
   - または別データソースの検討

---

## 📝 次のステップ

### 🔍 要確認事項（ユーザーへの質問）

1. **Issue #86の具体的な背景**
   - Google Sheetsから移行する理由は何ですか？
   - 移行のタイムラインはありますか？

2. **API-SPORTSアカウント**
   - すでにアカウントはありますか？
   - APIキーは取得済みですか？

3. **チケット情報の取り扱い**
   - `ticket_sales_start`フィールドはどう管理しますか？
   - 引き続き手動管理で問題ありませんか？

4. **移行戦略**
   - 一気に切り替えますか？それとも段階的に移行しますか？
   - Google Sheets統合は移行後も残しますか？

### 🚀 推奨アクション

ユーザーからの確認を待たずに着手できるタスク：

1. ✅ API-SPORTSドキュメント調査（完了）
2. ⏭️ APIクライアントのプロトタイプ実装
3. ⏭️ データマッピングロジック設計

---

## 🔗 参考資料

- [API-Football Documentation](https://www.api-football.com/documentation-v3)
- [How to Get All Fixtures Data from One League](https://www.api-football.com/news/post/how-to-get-all-fixtures-data-from-one-league)
- [How to Find IDs - API-FOOTBALL](https://www.api-football.com/news/post/how-to-find-ids)
- [API-Sports Football Documentation](https://api-sports.io/documentation/football/v3)

---

## ✅ 結論

**現状**: Google Sheets + GAS API経由でデータ取得
**目標**: API-SPORTSへの完全移行
**課題**: チケット情報、J.Leagueカバレッジ確認、移行戦略

**推奨**: ユーザーに上記の確認事項を質問し、具体的な実装方針を決定してから着手。
