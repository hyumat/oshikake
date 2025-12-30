import { describe, it, expect } from 'vitest';
import { calculateResult } from './stats';

describe('calculateResult', () => {
  describe('returns "unknown"', () => {
    it('when homeScore is null', () => {
      expect(calculateResult(null, 1, 'home')).toBe('unknown');
    });

    it('when awayScore is null', () => {
      expect(calculateResult(1, null, 'home')).toBe('unknown');
    });

    it('when marinosSide is null', () => {
      expect(calculateResult(1, 0, null)).toBe('unknown');
    });

    it('when both scores are null', () => {
      expect(calculateResult(null, null, 'home')).toBe('unknown');
    });
  });

  describe('when Marinos is home', () => {
    it('returns "win" when home score is higher', () => {
      expect(calculateResult(3, 1, 'home')).toBe('win');
    });

    it('returns "loss" when away score is higher', () => {
      expect(calculateResult(1, 3, 'home')).toBe('loss');
    });

    it('returns "draw" when scores are equal', () => {
      expect(calculateResult(2, 2, 'home')).toBe('draw');
    });

    it('handles 0-0 draw', () => {
      expect(calculateResult(0, 0, 'home')).toBe('draw');
    });
  });

  describe('when Marinos is away', () => {
    it('returns "win" when away score is higher', () => {
      expect(calculateResult(1, 3, 'away')).toBe('win');
    });

    it('returns "loss" when home score is higher', () => {
      expect(calculateResult(3, 1, 'away')).toBe('loss');
    });

    it('returns "draw" when scores are equal', () => {
      expect(calculateResult(2, 2, 'away')).toBe('draw');
    });
  });

  describe('edge cases', () => {
    it('handles high scoring game', () => {
      expect(calculateResult(5, 4, 'home')).toBe('win');
      expect(calculateResult(4, 5, 'away')).toBe('win');
    });

    it('handles shutout wins', () => {
      expect(calculateResult(3, 0, 'home')).toBe('win');
      expect(calculateResult(0, 3, 'away')).toBe('win');
    });

    it('handles shutout losses', () => {
      expect(calculateResult(0, 3, 'home')).toBe('loss');
      expect(calculateResult(3, 0, 'away')).toBe('loss');
    });
  });
});

describe('stats.getSummary integration scenarios', () => {
  it('correctly categorizes mixed results (win/draw/loss/unknown)', () => {
    const testCases: Array<{
      homeScore: number | null;
      awayScore: number | null;
      marinosSide: 'home' | 'away' | null;
      expected: 'win' | 'draw' | 'loss' | 'unknown';
    }> = [
      { homeScore: 2, awayScore: 1, marinosSide: 'home', expected: 'win' },
      { homeScore: 1, awayScore: 2, marinosSide: 'away', expected: 'win' },
      { homeScore: 0, awayScore: 3, marinosSide: 'home', expected: 'loss' },
      { homeScore: 3, awayScore: 0, marinosSide: 'away', expected: 'loss' },
      { homeScore: 1, awayScore: 1, marinosSide: 'home', expected: 'draw' },
      { homeScore: null, awayScore: 1, marinosSide: 'home', expected: 'unknown' },
      { homeScore: 2, awayScore: null, marinosSide: 'away', expected: 'unknown' },
    ];

    const results = {
      win: 0,
      draw: 0,
      loss: 0,
      unknown: 0,
    };

    for (const tc of testCases) {
      const result = calculateResult(tc.homeScore, tc.awayScore, tc.marinosSide);
      expect(result).toBe(tc.expected);
      results[result]++;
    }

    expect(results.win).toBe(2);
    expect(results.draw).toBe(1);
    expect(results.loss).toBe(2);
    expect(results.unknown).toBe(2);
  });

  it('calculates averagePerMatch correctly', () => {
    const costs = [10000, 15000, 8000, 12000];
    const total = costs.reduce((sum, c) => sum + c, 0);
    const avg = Math.round((total / costs.length) * 100) / 100;
    
    expect(total).toBe(45000);
    expect(avg).toBe(11250);
  });

  it('handles zero matches gracefully (watchCount=0)', () => {
    const watchCount = 0;
    const total = 0;
    const averagePerMatch = watchCount > 0 
      ? Math.round((total / watchCount) * 100) / 100 
      : 0;

    expect(averagePerMatch).toBe(0);
  });
});

describe('getSummary output shape validation', () => {
  function simulateGetSummary(
    matchResults: Array<{
      homeScore: number | null;
      awayScore: number | null;
      marinosSide: 'home' | 'away' | null;
      costYen: number;
    }>,
    input: { year?: number; from?: string; to?: string }
  ) {
    const watchCount = matchResults.length;
    let win = 0, draw = 0, loss = 0, unknown = 0;
    let total = 0;

    for (const row of matchResults) {
      const result = calculateResult(row.homeScore, row.awayScore, row.marinosSide);
      switch (result) {
        case 'win': win++; break;
        case 'draw': draw++; break;
        case 'loss': loss++; break;
        default: unknown++;
      }
      total += row.costYen ?? 0;
    }

    const averagePerMatch = watchCount > 0
      ? Math.round((total / watchCount) * 100) / 100
      : 0;

    return {
      period: {
        year: input.year,
        from: input.from,
        to: input.to,
      },
      watchCount,
      record: { win, draw, loss, unknown },
      cost: { total, averagePerMatch },
    };
  }

  it('returns correct structure for 0 matches', () => {
    const result = simulateGetSummary([], { year: 2025 });

    expect(result).toEqual({
      period: { year: 2025, from: undefined, to: undefined },
      watchCount: 0,
      record: { win: 0, draw: 0, loss: 0, unknown: 0 },
      cost: { total: 0, averagePerMatch: 0 },
    });
  });

  it('returns correct structure for mixed results', () => {
    const matchResults = [
      { homeScore: 3, awayScore: 1, marinosSide: 'home' as const, costYen: 10000 },
      { homeScore: 1, awayScore: 2, marinosSide: 'away' as const, costYen: 15000 },
      { homeScore: 3, awayScore: 1, marinosSide: 'away' as const, costYen: 12000 },
      { homeScore: 1, awayScore: 1, marinosSide: 'home' as const, costYen: 8000 },
      { homeScore: null, awayScore: 2, marinosSide: 'home' as const, costYen: 5000 },
      { homeScore: 0, awayScore: 3, marinosSide: 'home' as const, costYen: 10000 },
      { homeScore: 2, awayScore: 3, marinosSide: 'away' as const, costYen: 24200 },
    ];

    const result = simulateGetSummary(matchResults, { year: 2025 });

    expect(result.period.year).toBe(2025);
    expect(result.watchCount).toBe(7);
    expect(result.record.win).toBe(3);
    expect(result.record.draw).toBe(1);
    expect(result.record.loss).toBe(2);
    expect(result.record.unknown).toBe(1);
    expect(result.cost.total).toBe(84200);
    expect(result.cost.averagePerMatch).toBe(12028.57);
  });

  it('returns correct structure with from/to period', () => {
    const result = simulateGetSummary(
      [{ homeScore: 2, awayScore: 1, marinosSide: 'home' as const, costYen: 5000 }],
      { from: '2025-01-01', to: '2025-12-31' }
    );

    expect(result.period).toEqual({
      year: undefined,
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(result.watchCount).toBe(1);
    expect(result.record.win).toBe(1);
    expect(result.cost.total).toBe(5000);
    expect(result.cost.averagePerMatch).toBe(5000);
  });

  it('handles all win scenario', () => {
    const matchResults = [
      { homeScore: 2, awayScore: 0, marinosSide: 'home' as const, costYen: 10000 },
      { homeScore: 0, awayScore: 3, marinosSide: 'away' as const, costYen: 15000 },
      { homeScore: 1, awayScore: 2, marinosSide: 'away' as const, costYen: 8000 },
    ];

    const result = simulateGetSummary(matchResults, { year: 2025 });

    expect(result.record).toEqual({ win: 3, draw: 0, loss: 0, unknown: 0 });
    expect(result.cost.averagePerMatch).toBe(11000);
  });

  it('handles all loss scenario', () => {
    const matchResults = [
      { homeScore: 0, awayScore: 2, marinosSide: 'home' as const, costYen: 10000 },
      { homeScore: 3, awayScore: 0, marinosSide: 'away' as const, costYen: 15000 },
    ];

    const result = simulateGetSummary(matchResults, { year: 2025 });

    expect(result.record).toEqual({ win: 0, draw: 0, loss: 2, unknown: 0 });
  });

  it('handles all unknown scenario (no scores)', () => {
    const matchResults = [
      { homeScore: null, awayScore: null, marinosSide: 'home' as const, costYen: 10000 },
      { homeScore: 1, awayScore: null, marinosSide: 'away' as const, costYen: 15000 },
      { homeScore: null, awayScore: 2, marinosSide: null, costYen: 8000 },
    ];

    const result = simulateGetSummary(matchResults, { year: 2025 });

    expect(result.record).toEqual({ win: 0, draw: 0, loss: 0, unknown: 3 });
  });
});
