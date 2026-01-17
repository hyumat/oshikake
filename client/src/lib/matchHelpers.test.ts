/**
 * Issue #148: チケット販売情報表示制御のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isPastMatch,
  shouldShowTicketInfo,
  getTicketSalesStatus,
  getDaysUntilMatch,
  getMatchCountdown,
} from './matchHelpers';

describe('matchHelpers - Issue #148: チケット販売情報表示制御', () => {
  beforeEach(() => {
    // 現在日時を固定: 2025-01-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isPastMatch', () => {
    it('should return true for past matches', () => {
      expect(isPastMatch('2025-01-14')).toBe(true);
      expect(isPastMatch('2025-01-10')).toBe(true);
      expect(isPastMatch('2024-12-31')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isPastMatch('2025-01-15')).toBe(false);
    });

    it('should return false for future matches', () => {
      expect(isPastMatch('2025-01-16')).toBe(false);
      expect(isPastMatch('2025-02-01')).toBe(false);
      expect(isPastMatch('2026-01-01')).toBe(false);
    });
  });

  describe('shouldShowTicketInfo', () => {
    it('should return false for past matches', () => {
      expect(shouldShowTicketInfo('2025-01-14', '2025-01-01')).toBe(false);
      expect(shouldShowTicketInfo('2025-01-10', '2024-12-20')).toBe(false);
    });

    it('should return false when ticketSalesStart is null', () => {
      expect(shouldShowTicketInfo('2025-01-16', null)).toBe(false);
      expect(shouldShowTicketInfo('2025-02-01', undefined)).toBe(false);
    });

    it('should return true for future matches with ticketSalesStart', () => {
      expect(shouldShowTicketInfo('2025-01-16', '2025-01-10')).toBe(true);
      expect(shouldShowTicketInfo('2025-02-01', '2025-01-20')).toBe(true);
    });

    it('should return true for today with ticketSalesStart', () => {
      expect(shouldShowTicketInfo('2025-01-15', '2025-01-10')).toBe(true);
    });
  });

  describe('getTicketSalesStatus', () => {
    it('should return show=false for past matches', () => {
      const result = getTicketSalesStatus('2025-01-14', '2025-01-01');
      expect(result.show).toBe(false);
      expect(result.label).toBe('');
    });

    it('should return show=false when ticketSalesStart is null', () => {
      const result = getTicketSalesStatus('2025-01-16', null);
      expect(result.show).toBe(false);
    });

    it('should return "販売開始前" status when sales have not started', () => {
      const result = getTicketSalesStatus('2025-02-01', '2025-01-20');
      expect(result.show).toBe(true);
      expect(result.label).toContain('販売開始');
      expect(result.label).toContain('2025-01-20');
      expect(result.color).toBe('text-orange-600');
      expect(result.bgColor).toContain('orange');
    });

    it('should return "販売中" status when sales have started', () => {
      const result = getTicketSalesStatus('2025-02-01', '2025-01-10');
      expect(result.show).toBe(true);
      expect(result.label).toBe('チケット販売中');
      expect(result.color).toBe('text-green-600');
      expect(result.bgColor).toContain('green');
    });

    it('should return "販売中" status when sales start today', () => {
      const result = getTicketSalesStatus('2025-02-01', '2025-01-15');
      expect(result.show).toBe(true);
      expect(result.label).toBe('チケット販売中');
    });
  });

  describe('getDaysUntilMatch', () => {
    it('should return 0 for today', () => {
      expect(getDaysUntilMatch('2025-01-15')).toBe(0);
    });

    it('should return positive days for future matches', () => {
      expect(getDaysUntilMatch('2025-01-16')).toBe(1);
      expect(getDaysUntilMatch('2025-01-17')).toBe(2);
      expect(getDaysUntilMatch('2025-01-20')).toBe(5);
    });

    it('should return negative days for past matches', () => {
      expect(getDaysUntilMatch('2025-01-14')).toBe(-1);
      expect(getDaysUntilMatch('2025-01-13')).toBe(-2);
      expect(getDaysUntilMatch('2025-01-10')).toBe(-5);
    });
  });

  describe('getMatchCountdown', () => {
    it('should return "今日" for today', () => {
      expect(getMatchCountdown('2025-01-15')).toBe('今日');
    });

    it('should return "明日" for tomorrow', () => {
      expect(getMatchCountdown('2025-01-16')).toBe('明日');
    });

    it('should return "明後日" for day after tomorrow', () => {
      expect(getMatchCountdown('2025-01-17')).toBe('明後日');
    });

    it('should return "X日後" for future matches', () => {
      expect(getMatchCountdown('2025-01-18')).toBe('3日後');
      expect(getMatchCountdown('2025-01-20')).toBe('5日後');
      expect(getMatchCountdown('2025-02-01')).toBe('17日後');
    });

    it('should return "昨日" for yesterday', () => {
      expect(getMatchCountdown('2025-01-14')).toBe('昨日');
    });

    it('should return "X日前" for past matches', () => {
      expect(getMatchCountdown('2025-01-13')).toBe('2日前');
      expect(getMatchCountdown('2025-01-10')).toBe('5日前');
      expect(getMatchCountdown('2025-01-01')).toBe('14日前');
    });
  });
});

describe('matchHelpers - エッジケース', () => {
  it('should handle invalid date formats gracefully', () => {
    // 不正な日付形式はNaNを返すが、エラーは発生しない
    const result = getDaysUntilMatch('invalid-date');
    expect(isNaN(result)).toBe(true);
  });

  it('should handle empty strings', () => {
    const result = shouldShowTicketInfo('2025-01-16', '');
    expect(result).toBe(false);
  });

  it('should handle timezone differences correctly', () => {
    // 日付のみで比較するため、タイムゾーンは影響しない
    vi.setSystemTime(new Date('2025-01-15T23:59:59Z'));
    expect(isPastMatch('2025-01-15')).toBe(false);
    expect(isPastMatch('2025-01-16')).toBe(false);

    vi.setSystemTime(new Date('2025-01-16T00:00:01Z'));
    expect(isPastMatch('2025-01-15')).toBe(true);
    expect(isPastMatch('2025-01-16')).toBe(false);
  });
});
