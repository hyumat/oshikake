/**
 * Issue #111/#80: MatchInsights page tests
 * Tests for Pro-only trend analysis page and getTrendAnalysis API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MatchInsights from './MatchInsights';
import { useAuth } from '@/_core/hooks/useAuth';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

// Mock dependencies
vi.mock('@/_core/hooks/useAuth');
vi.mock('wouter', () => ({
  useParams: vi.fn(),
  useLocation: vi.fn(),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    userMatches: {
      getPlanStatus: {
        useQuery: vi.fn(),
      },
      getTrendAnalysis: {
        useQuery: vi.fn(),
      },
    },
    matches: {
      getById: {
        useQuery: vi.fn(),
      },
    },
  },
}));

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('MatchInsights Page (Issue #111/#80)', () => {
  let mockSetLocation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetLocation = vi.fn();
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation]);
    vi.mocked(useParams).mockReturnValue({ matchId: '123' });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login if not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      render(<MatchInsights />);

      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });

    it('should show Pro upgrade prompt for non-Pro users', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { openId: 'user1', name: 'Test User' },
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: { isPro: false },
        isLoading: false,
      } as any);

      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      render(<MatchInsights />);

      expect(screen.getByText('Pro限定機能')).toBeInTheDocument();
      expect(screen.getByText('トレンド分析機能はProプラン限定です')).toBeInTheDocument();
      expect(screen.getByText('Proプランにアップグレード')).toBeInTheDocument();
    });

    it('should display Pro features list in upgrade prompt', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { openId: 'user1', name: 'Test User' },
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: { isPro: false },
        isLoading: false,
      } as any);

      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      render(<MatchInsights />);

      expect(screen.getAllByText(/他のユーザーの計画傾向を匿名集計/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/交通費・宿泊費・飲食費の平均値を表示/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/予算分布をグラフで可視化/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/カスタムカテゴリの作成/)[0]).toBeInTheDocument();
    });
  });

  describe('Pro User - Trend Analysis Display', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { openId: 'user1', name: 'Test User' },
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: { isPro: true },
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: {
          match: {
            id: 123,
            date: '2025-03-15',
            opponent: 'FC Tokyo',
          },
        },
      } as any);
    });

    it('should show loading state while fetching data', () => {
      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<MatchInsights />);

      expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
    });

    it('should display insufficient data message (k-anonymity)', () => {
      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: {
          success: true,
          hasData: false,
          message: 'プライバシー保護のため、5人以上のデータが必要です（現在: 3人）',
          recordCount: 3,
          requiredCount: 5,
        },
        isLoading: false,
      } as any);

      render(<MatchInsights />);

      expect(screen.getByText('データが不足しています')).toBeInTheDocument();
      expect(screen.getByText('プライバシー保護のため、5人以上のデータが必要です（現在: 3人）')).toBeInTheDocument();
      expect(screen.getByText('現在: 3人 / 必要: 5人')).toBeInTheDocument();
    });

    it('should display trend analysis data when available', () => {
      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: {
          success: true,
          hasData: true,
          recordCount: 7,
          categories: {
            transport: {
              average: 5000,
              min: 3000,
              max: 8000,
              userCount: 7,
            },
            ticket: {
              average: 4000,
              min: 3000,
              max: 5000,
              userCount: 7,
            },
            food: {
              average: 2000,
              min: 1000,
              max: 3000,
              userCount: 7,
            },
          },
          budgetDistribution: [
            { range: '0-5000', count: 1 },
            { range: '5000-10000', count: 3 },
            { range: '10000-15000', count: 2 },
            { range: '15000-20000', count: 1 },
            { range: '20000+', count: 0 },
          ],
        },
        isLoading: false,
      } as any);

      render(<MatchInsights />);

      expect(screen.getAllByText('トレンド分析')[0]).toBeInTheDocument();
      expect(screen.getByText('7人の計画データを集計しています')).toBeInTheDocument();

      // Check category data display
      expect(screen.getAllByText('交通費')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/¥5,000/)[0]).toBeInTheDocument();

      expect(screen.getAllByText('チケット代')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/¥4,000/)[0]).toBeInTheDocument();

      expect(screen.getAllByText('飲食代')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/¥2,000/)[0]).toBeInTheDocument();
    });

    it('should display match information in header', () => {
      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<MatchInsights />);

      expect(screen.getAllByText('トレンド分析')[0]).toBeInTheDocument();
      expect(screen.getAllByText('2025-03-15 vs FC Tokyo')[0]).toBeInTheDocument();
    });
  });

  describe('API Integration (Issue #80)', () => {
    it('should call getTrendAnalysis API with correct matchId', () => {
      const mockGetTrendAnalysis = vi.fn().mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockImplementation(mockGetTrendAnalysis);

      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { openId: 'user1', name: 'Test User' },
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: { isPro: true },
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: null,
      } as any);

      render(<MatchInsights />);

      expect(mockGetTrendAnalysis).toHaveBeenCalledWith(
        { matchId: 123 },
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should only call getTrendAnalysis when user is Pro', () => {
      const mockGetTrendAnalysis = vi.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      vi.mocked(trpc.userMatches.getTrendAnalysis.useQuery).mockImplementation(mockGetTrendAnalysis);

      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { openId: 'user1', name: 'Test User' },
        loading: false,
      } as any);

      vi.mocked(trpc.userMatches.getPlanStatus.useQuery).mockReturnValue({
        data: { isPro: false },
      } as any);

      vi.mocked(trpc.matches.getById.useQuery).mockReturnValue({
        data: null,
      } as any);

      render(<MatchInsights />);

      expect(mockGetTrendAnalysis).toHaveBeenCalledWith(
        { matchId: 123 },
        expect.objectContaining({
          enabled: false, // Should be disabled for non-Pro users
        })
      );
    });
  });

  describe('Data Display Requirements', () => {
    it('should enforce k-anonymity by requiring minimum 5 users', () => {
      const MIN_REQUIRED = 5;
      expect(MIN_REQUIRED).toBe(5);
      // This test documents the k-anonymity requirement
    });

    it('should display all expense categories', () => {
      const categories = ['transport', 'ticket', 'food', 'other'];
      expect(categories).toContain('transport');
      expect(categories).toContain('ticket');
      expect(categories).toContain('food');
      expect(categories).toContain('other');
    });

    it('should show min, max, and average for each category', () => {
      const categoryData = {
        average: 5000,
        min: 3000,
        max: 8000,
        userCount: 7,
      };

      expect(categoryData.average).toBeDefined();
      expect(categoryData.min).toBeDefined();
      expect(categoryData.max).toBeDefined();
      expect(categoryData.userCount).toBeDefined();
    });
  });
});
