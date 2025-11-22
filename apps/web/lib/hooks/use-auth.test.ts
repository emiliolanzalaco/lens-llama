import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './use-auth';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Mock the Privy hooks
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(),
  useWallets: vi.fn(),
}));

describe('useAuth', () => {
  it('returns auth state and wallet info', () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockWallet = { address: '0x1234567890123456789012345678901234567890' };

    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: true,
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      linkEmail: vi.fn(),
      linkGoogle: vi.fn(),
      linkWallet: vi.fn(),
    } as any);

    vi.mocked(useWallets).mockReturnValue({
      wallets: [mockWallet],
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.ready).toBe(true);
    expect(result.current.authenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.wallet).toEqual(mockWallet);
    expect(result.current.walletAddress).toBe(mockWallet.address);
  });

  it('returns null wallet when no wallets exist', () => {
    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: true,
      user: { id: '123' },
      login: vi.fn(),
      logout: vi.fn(),
      linkEmail: vi.fn(),
      linkGoogle: vi.fn(),
      linkWallet: vi.fn(),
    } as any);

    vi.mocked(useWallets).mockReturnValue({
      wallets: [],
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.wallet).toBeNull();
    expect(result.current.walletAddress).toBeNull();
  });

  it('provides auth action functions', () => {
    const mockLogin = vi.fn();
    const mockLogout = vi.fn();
    const mockLinkEmail = vi.fn();
    const mockLinkGoogle = vi.fn();
    const mockLinkWallet = vi.fn();

    vi.mocked(usePrivy).mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      linkEmail: mockLinkEmail,
      linkGoogle: mockLinkGoogle,
      linkWallet: mockLinkWallet,
    } as any);

    vi.mocked(useWallets).mockReturnValue({
      wallets: [],
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.login).toBe(mockLogin);
    expect(result.current.logout).toBe(mockLogout);
    expect(result.current.linkEmail).toBe(mockLinkEmail);
    expect(result.current.linkGoogle).toBe(mockLinkGoogle);
    expect(result.current.linkWallet).toBe(mockLinkWallet);
  });
});
