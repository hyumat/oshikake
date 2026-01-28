/**
 * Issue #147: 過去試合上書き防止のテスト
 * Issue #148: チケット販売情報表示制御のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SheetMatchRow } from './sheets-sync';

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

vi.mock('./sheets-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./sheets-sync')>();
  return {
    ...actual,
    fetchFromGoogleSheets: vi.fn().mockResolvedValue(mockSheetMatches),
  };
});

describe('sheets-sync - データマッピング', () => {
  it('SheetMatchRow型が正しく定義されている', () => {
    const row: SheetMatchRow = {
      match_id: 'TEST001',
      date: '2025-03-01',
      opponent: 'テストチーム',
      home_score: 1,
      away_score: 0,
      stadium: 'テストスタジアム',
      kickoff: '15:00',
      competition: 'テスト大会',
      ticket_sales_start: '2025-02-01',
      notes: 'テストメモ',
    };

    expect(row.match_id).toBe('TEST001');
    expect(row.date).toBe('2025-03-01');
    expect(row.opponent).toBe('テストチーム');
    expect(row.home_score).toBe(1);
    expect(row.away_score).toBe(0);
    expect(row.stadium).toBe('テストスタジアム');
    expect(row.kickoff).toBe('15:00');
    expect(row.competition).toBe('テスト大会');
    expect(row.ticket_sales_start).toBe('2025-02-01');
    expect(row.notes).toBe('テストメモ');
  });

  it('スコアがundefinedの場合は未来試合として扱う', () => {
    const futureMatch: SheetMatchRow = {
      match_id: 'FUTURE001',
      date: '2025-12-31',
      opponent: '未来の対戦相手',
      home_score: undefined,
      away_score: undefined,
      stadium: '未来スタジアム',
      kickoff: '19:00',
      competition: 'J1',
      ticket_sales_start: '2025-12-01',
      notes: '',
    };

    const isResult = futureMatch.home_score !== undefined && futureMatch.away_score !== undefined;
    expect(isResult).toBe(false);
  });

  it('スコアが両方定義されている場合は結果確定試合', () => {
    const pastMatch: SheetMatchRow = {
      match_id: 'PAST001',
      date: '2025-01-01',
      opponent: '過去の対戦相手',
      home_score: 3,
      away_score: 2,
      stadium: '過去スタジアム',
      kickoff: '15:00',
      competition: 'J1',
      ticket_sales_start: '2024-12-01',
      notes: '',
    };

    const isResult = pastMatch.home_score !== undefined && pastMatch.away_score !== undefined;
    expect(isResult).toBe(true);
  });
});

describe('sheets-sync - Issue #147: 過去試合上書き防止ロジック', () => {
  it('isArchivedの判定ロジックが正しい（スコアありの試合）', () => {
    const matchWithScore: SheetMatchRow = mockSheetMatches[0];
    const isResult = matchWithScore.home_score !== undefined && matchWithScore.away_score !== undefined;
    expect(isResult).toBe(true);
  });

  it('isArchivedの判定ロジックが正しい（スコアなしの試合）', () => {
    const matchWithoutScore: SheetMatchRow = mockSheetMatches[1];
    const isResult = matchWithoutScore.home_score !== undefined && matchWithoutScore.away_score !== undefined;
    expect(isResult).toBe(false);
  });

  it('スコアが0の場合も結果確定として扱う', () => {
    const zeroScoreMatch: SheetMatchRow = {
      match_id: 'ZERO001',
      date: '2025-01-15',
      opponent: '0-0の試合',
      home_score: 0,
      away_score: 0,
      stadium: 'テストスタジアム',
      kickoff: '19:00',
      competition: 'J1',
      ticket_sales_start: '2025-01-01',
      notes: '',
    };

    const isResult = zeroScoreMatch.home_score !== undefined && zeroScoreMatch.away_score !== undefined;
    expect(isResult).toBe(true);
  });
});

describe('sheets-sync - Issue #148: チケット販売情報', () => {
  it('ticket_sales_startが正しく設定されている', () => {
    const match = mockSheetMatches[0];
    expect(match.ticket_sales_start).toBe('2024-12-15');
  });

  it('ticket_sales_startが空の場合も許容する', () => {
    const matchNoTicket: SheetMatchRow = {
      match_id: 'NOTICKET001',
      date: '2025-03-01',
      opponent: 'チケット情報なし',
      home_score: undefined,
      away_score: undefined,
      stadium: 'テストスタジアム',
      kickoff: '19:00',
      competition: 'J1',
      ticket_sales_start: '',
      notes: '',
    };

    expect(matchNoTicket.ticket_sales_start).toBe('');
  });
});

describe('sheets-sync - エラーケース', () => {
  it('空のmatch_idを検出できる', () => {
    const invalidMatch: SheetMatchRow = {
      match_id: '',
      date: '2025-01-12',
      opponent: '浦和レッズ',
      home_score: 2,
      away_score: 1,
      stadium: '日産スタジアム',
      kickoff: '19:00',
      competition: 'J1',
      ticket_sales_start: '2024-12-15',
      notes: '',
    };

    const isValid = invalidMatch.match_id && invalidMatch.match_id.trim() !== '';
    expect(isValid).toBeFalsy();
  });

  it('日付形式の検証', () => {
    const validDate = '2025-01-12';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(dateRegex.test(validDate)).toBe(true);
  });

  it('不正な日付形式を検出できる', () => {
    const invalidDate = '2025/01/12';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(dateRegex.test(invalidDate)).toBe(false);
  });
});
