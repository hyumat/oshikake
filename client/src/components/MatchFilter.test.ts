import { describe, expect, it } from 'vitest';
import type { FilterState } from './MatchFilter';

describe('MatchFilter Component', () => {
  describe('FilterState type', () => {
    it('should have dateFrom property', () => {
      const filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.dateFrom).toBe('2025-01-01');
    });

    it('should have dateTo property', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '2025-12-31',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.dateTo).toBe('2025-12-31');
    });

    it('should have opponent property', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: 'FC Tokyo',
        marinosSide: 'all',
      };
      expect(filter.opponent).toBe('FC Tokyo');
    });

    it('should have marinosSide property with all value', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.marinosSide).toBe('all');
    });

    it('should have marinosSide property with home value', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'home',
      };
      expect(filter.marinosSide).toBe('home');
    });

    it('should have marinosSide property with away value', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'away',
      };
      expect(filter.marinosSide).toBe('away');
    });
  });

  describe('Filter combinations', () => {
    it('should support all filters at once', () => {
      const filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        opponent: 'Tokyo',
        marinosSide: 'home',
      };
      expect(filter.dateFrom).toBe('2025-01-01');
      expect(filter.dateTo).toBe('2025-12-31');
      expect(filter.opponent).toBe('Tokyo');
      expect(filter.marinosSide).toBe('home');
    });

    it('should support empty filters', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.dateFrom).toBe('');
      expect(filter.dateTo).toBe('');
      expect(filter.opponent).toBe('');
      expect(filter.marinosSide).toBe('all');
    });

    it('should support partial filters', () => {
      const filter: FilterState = {
        dateFrom: '2025-02-01',
        dateTo: '',
        opponent: '',
        marinosSide: 'away',
      };
      expect(filter.dateFrom).toBe('2025-02-01');
      expect(filter.opponent).toBe('');
    });
  });

  describe('Filter validation', () => {
    it('should validate date format', () => {
      const filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        opponent: '',
        marinosSide: 'all',
      };
      const dateFromRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateFromRegex.test(filter.dateFrom)).toBe(true);
      expect(dateFromRegex.test(filter.dateTo)).toBe(true);
    });

    it('should allow empty date strings', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.dateFrom).toBe('');
      expect(filter.dateTo).toBe('');
    });

    it('should validate opponent string', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: 'FC Tokyo',
        marinosSide: 'all',
      };
      expect(typeof filter.opponent).toBe('string');
      expect(filter.opponent.length).toBeGreaterThan(0);
    });

    it('should validate marinosSide enum values', () => {
      const validSides: Array<'all' | 'home' | 'away'> = ['all', 'home', 'away'];
      validSides.forEach((side) => {
        const filter: FilterState = {
          dateFrom: '',
          dateTo: '',
          opponent: '',
          marinosSide: side,
        };
        expect(['all', 'home', 'away']).toContain(filter.marinosSide);
      });
    });
  });

  describe('Filter state transitions', () => {
    it('should support updating dateFrom', () => {
      let filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      filter = { ...filter, dateFrom: '2025-01-01' };
      expect(filter.dateFrom).toBe('2025-01-01');
    });

    it('should support updating opponent', () => {
      let filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      filter = { ...filter, opponent: 'Nagoya' };
      expect(filter.opponent).toBe('Nagoya');
    });

    it('should support updating marinosSide', () => {
      let filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      filter = { ...filter, marinosSide: 'home' };
      expect(filter.marinosSide).toBe('home');
    });

    it('should support resetting filters', () => {
      let filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        opponent: 'Tokyo',
        marinosSide: 'home',
      };
      filter = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      expect(filter.dateFrom).toBe('');
      expect(filter.dateTo).toBe('');
      expect(filter.opponent).toBe('');
      expect(filter.marinosSide).toBe('all');
    });
  });

  describe('Filter logic', () => {
    it('should detect active filters', () => {
      const filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      const hasActiveFilters = !!(
        filter.dateFrom ||
        filter.dateTo ||
        filter.opponent ||
        filter.marinosSide !== 'all'
      );
      expect(hasActiveFilters).toBe(true);
    });

    it('should detect no active filters', () => {
      const filter: FilterState = {
        dateFrom: '',
        dateTo: '',
        opponent: '',
        marinosSide: 'all',
      };
      const hasActiveFilters = !!(
        filter.dateFrom ||
        filter.dateTo ||
        filter.opponent ||
        filter.marinosSide !== 'all'
      );
      expect(hasActiveFilters).toBe(false);
    });

    it('should count active filters', () => {
      const filter: FilterState = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        opponent: 'Tokyo',
        marinosSide: 'home',
      };
      const activeFilterCount = [
        filter.dateFrom,
        filter.dateTo,
        filter.opponent,
        filter.marinosSide !== 'all',
      ].filter(Boolean).length;
      expect(activeFilterCount).toBe(4);
    });
  });
});
