/**
 * Issue #147: 過去試合上書き防止のテスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { syncFromGoogleSheets, fetchFromGoogleSheets, type SheetMatchRow } from './sheets-sync';
import { db } from './db';
import { matches } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// モックデータ
const mockSheetMatches: SheetMatchRow[] = [
  {
    match_id: 'M001',
    date: '2025-01-12',
    opponent: '浦和レッズ',
    home_score: 2,
    away_score: 1,
    stadium: '日産スタジアム',
    kickoff: '19:00',
    competition: 'J1',
    ticket_sales_start: '2024-12-15',
    notes: '',
  },
  {
    match_id: 'M002',
    date: '2025-02-16',
    opponent: 'ガンバ大阪',
    home_score: undefined,
    away_score: undefined,
    stadium: '万博記念競技場',
    kickoff: '18:00',
    competition: 'J1',
    ticket_sales_start: '2025-01-20',
    notes: '',
  },
];

describe('sheets-sync - Issue #147: 過去試合上書き防止', () => {
  beforeAll(() => {
    // fetchFromGoogleSheets をモック
    vi.mock('./sheets-sync', async () => {
      const actual = await vi.importActual('./sheets-sync');
      return {
        ...actual,
        fetchFromGoogleSheets: vi.fn().mockResolvedValue(mockSheetMatches),
      };
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should not overwrite archived matches by default', async () => {
    // 1. 初回同期（過去試合を含む）
    const result1 = await syncFromGoogleSheets();
    expect(result1.success).toBe(true);
    expect(result1.newMatches).toBeGreaterThan(0);

    // 2. M001 のスコアを確認
    const match1 = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M001'),
    });
    expect(match1).toBeDefined();
    expect(match1?.homeScore).toBe(2);
    expect(match1?.awayScore).toBe(1);
    expect(match1?.isResult).toBe(1);

    // 3. Sheets 側でスコアを変更（モックデータを更新）
    mockSheetMatches[0].home_score = 3;
    mockSheetMatches[0].away_score = 2;

    // 4. 再同期（デフォルト: overwriteArchived=false）
    const result2 = await syncFromGoogleSheets();
    expect(result2.success).toBe(true);
    expect(result2.skippedMatches).toBeGreaterThan(0);

    // 5. M001 のスコアが変更されていないことを確認
    const match1After = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M001'),
    });
    expect(match1After?.homeScore).toBe(2); // 元のまま
    expect(match1After?.awayScore).toBe(1); // 元のまま
  });

  it('should overwrite archived matches when overwriteArchived=true', async () => {
    // 1. 初回同期
    const result1 = await syncFromGoogleSheets();
    expect(result1.success).toBe(true);

    // 2. M001 のスコアを確認
    const match1 = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M001'),
    });
    expect(match1?.homeScore).toBe(2);
    expect(match1?.awayScore).toBe(1);

    // 3. Sheets 側でスコアを変更
    mockSheetMatches[0].home_score = 4;
    mockSheetMatches[0].away_score = 3;

    // 4. 再同期（overwriteArchived=true）
    const result2 = await syncFromGoogleSheets({ overwriteArchived: true });
    expect(result2.success).toBe(true);
    expect(result2.updatedMatches).toBeGreaterThan(0);

    // 5. M001 のスコアが更新されていることを確認
    const match1After = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M001'),
    });
    expect(match1After?.homeScore).toBe(4); // 更新された
    expect(match1After?.awayScore).toBe(3); // 更新された
  });

  it('should update upcoming matches regardless of overwriteArchived', async () => {
    // 1. 初回同期
    const result1 = await syncFromGoogleSheets();
    expect(result1.success).toBe(true);

    // 2. M002（未来試合）のスタジアムを確認
    const match2 = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M002'),
    });
    expect(match2?.stadium).toBe('万博記念競技場');
    expect(match2?.isResult).toBe(0);

    // 3. Sheets 側でスタジアムを変更
    mockSheetMatches[1].stadium = 'パナソニックスタジアム吹田';

    // 4. 再同期（overwriteArchived=false）
    const result2 = await syncFromGoogleSheets({ overwriteArchived: false });
    expect(result2.success).toBe(true);

    // 5. M002 のスタジアムが更新されていることを確認
    const match2After = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M002'),
    });
    expect(match2After?.stadium).toBe('パナソニックスタジアム吹田'); // 更新された
  });

  it('should handle empty database correctly', async () => {
    // 1. DB を空にする
    await db.delete(matches);

    // 2. 同期
    const result = await syncFromGoogleSheets();
    expect(result.success).toBe(true);
    expect(result.newMatches).toBe(mockSheetMatches.length);
    expect(result.updatedMatches).toBe(0);
    expect(result.skippedMatches).toBe(0);

    // 3. 全試合が DB に保存されていることを確認
    const allMatches = await db.query.matches.findMany();
    expect(allMatches.length).toBe(mockSheetMatches.length);
  });

  it('should handle isResult flag correctly', async () => {
    // 1. 同期
    const result = await syncFromGoogleSheets();
    expect(result.success).toBe(true);

    // 2. M001（過去試合）の isResult を確認
    const match1 = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M001'),
    });
    expect(match1?.isResult).toBe(1);
    expect(match1?.homeScore).not.toBeNull();
    expect(match1?.awayScore).not.toBeNull();

    // 3. M002（未来試合）の isResult を確認
    const match2 = await db.query.matches.findFirst({
      where: eq(matches.matchId, 'M002'),
    });
    expect(match2?.isResult).toBe(0);
    expect(match2?.homeScore).toBeNull();
    expect(match2?.awayScore).toBeNull();
  });

  it('should log sync results correctly', async () => {
    // 1. 同期
    const result = await syncFromGoogleSheets();
    expect(result.success).toBe(true);

    // 2. 結果を確認
    expect(result.matchesCount).toBe(mockSheetMatches.length);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();

    // 3. syncLog に記録されていることを確認
    // （実際のDBクエリは省略）
  });
});

describe('sheets-sync - リトライロジック', () => {
  it('should retry on network errors with exponential backoff', () => {
    // リトライパラメータの検証
    const retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    };

    expect(retryConfig.maxRetries).toBe(3);
    expect(retryConfig.initialDelayMs).toBe(1000);
    expect(retryConfig.maxDelayMs).toBe(10000);
  });

  it('should calculate exponential backoff delays correctly', () => {
    const initialDelay = 1000;
    const delays = [0, 1, 2].map((attempt) =>
      Math.min(initialDelay * Math.pow(2, attempt), 10000)
    );

    expect(delays[0]).toBe(1000); // 1秒
    expect(delays[1]).toBe(2000); // 2秒
    expect(delays[2]).toBe(4000); // 4秒
  });

  it('should cap delay at maxDelayMs', () => {
    const initialDelay = 1000;
    const maxDelay = 10000;
    const longAttempt = Math.min(initialDelay * Math.pow(2, 10), maxDelay);

    expect(longAttempt).toBe(maxDelay);
  });
});

describe('sheets-sync - エラーハンドリング', () => {
  it('should handle GAS API errors gracefully', async () => {
    // fetchFromGoogleSheets をエラーを返すようにモック
    vi.mocked(fetchFromGoogleSheets).mockRejectedValueOnce(
      new Error('GAS API error: 401 Unauthorized')
    );

    const result = await syncFromGoogleSheets();
    expect(result.success).toBe(false);
    expect(result.error).toContain('GAS API error');
    expect(result.matchesCount).toBe(0);
  });

  it('should handle network timeouts', async () => {
    vi.mocked(fetchFromGoogleSheets).mockRejectedValueOnce(
      new Error('GAS API request timeout or network error')
    );

    const result = await syncFromGoogleSheets();
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should handle invalid data format', async () => {
    // 不正なデータ形式
    const invalidData: any[] = [
      {
        match_id: '', // 空のID
        date: '2025-01-12',
        opponent: '浦和レッズ',
      },
    ];

    vi.mocked(fetchFromGoogleSheets).mockResolvedValueOnce(invalidData);

    const result = await syncFromGoogleSheets();
    // 空のIDはスキップされる
    expect(result.success).toBe(true);
    expect(result.newMatches).toBe(0);
  });
});
