/**
 * Issue #150/#152: Landing page auto-redirect tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Landing from './Landing';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

// Mock dependencies
vi.mock('@/_core/hooks/useAuth');
vi.mock('wouter', () => ({
  useLocation: vi.fn(),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/AccountMenu', () => ({
  AccountMenu: () => <div>Account Menu</div>,
}));

vi.mock('@/const', () => ({
  getLoginUrl: () => '/login',
  getSignUpUrl: () => '/signup',
}));

describe('Landing Page - Auto Redirect (#150/#152)', () => {
  let mockSetLocation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetLocation = vi.fn();
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation]);

    // Reset window.location.search
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
      },
      writable: true,
    });
  });

  it('should redirect logged-in user to /app', async () => {
    // ログイン済みユーザー
    vi.mocked(useAuth).mockReturnValue({
      user: { openId: 'user1', name: 'Test User' },
      loading: false,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/app');
    });
  });

  it('should NOT redirect when user is not logged in', async () => {
    // 未ログインユーザー
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should NOT redirect when lp=1 parameter is present', async () => {
    // lp=1パラメータがある場合
    Object.defineProperty(window, 'location', {
      value: {
        search: '?lp=1',
      },
      writable: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { openId: 'user1', name: 'Test User' },
      loading: false,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should NOT redirect while auth is loading', async () => {
    // 認証チェック中
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should handle lp=1 parameter with logged-in user', async () => {
    // ログイン済みユーザーでもlp=1があればLPを表示
    Object.defineProperty(window, 'location', {
      value: {
        search: '?lp=1&other=value',
      },
      writable: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { openId: 'user1', name: 'Test User' },
      loading: false,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should redirect when lp parameter is not 1', async () => {
    // lp=0 や lp=true など、1以外の値ではリダイレクト
    Object.defineProperty(window, 'location', {
      value: {
        search: '?lp=0',
      },
      writable: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { openId: 'user1', name: 'Test User' },
      loading: false,
    } as any);

    render(<Landing />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/app');
    });
  });
});
