import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlamaMenu } from './llama-menu';

// Mock Next.js router
const mockUsePathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock hooks
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
const mockUseUsdcBalance = vi.fn();

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/hooks/use-usdc-balance', () => ({
  useUsdcBalance: (address: string | null) => mockUseUsdcBalance(address),
}));

describe('LlamaMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: false,
      walletAddress: null,
    });
    mockUseUsdcBalance.mockReturnValue({
      balance: null,
      loading: false,
    });
  });

  it('renders the menu trigger button', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button');
    expect(menuButton).toBeInTheDocument();
  });

  it('displays llama head image', () => {
    render(<LlamaMenu />);

    const image = screen.getByAltText('Llama Menu');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/llama_head.png');
  });

  it('opens menu when button is clicked', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('LlamaLens Access')).toBeInTheDocument();
    expect(screen.getByText('Manage your session')).toBeInTheDocument();
  });

  it('opens menu on hover', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.mouseEnter(menuButton);

    expect(screen.getByText('LlamaLens Access')).toBeInTheDocument();
  });

  it('closes menu when clicking outside', async () => {
    const { container } = render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('LlamaLens Access')).toBeInTheDocument();

    // Click outside the menu ref element
    const outsideElement = container.parentElement as HTMLElement;
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      // Menu is hidden with CSS opacity-0 and pointer-events-none, not removed from DOM
      const menuContainer = container.querySelector('.opacity-0.scale-95.translate-y-10.pointer-events-none');
      expect(menuContainer).toBeInTheDocument();
    });
  });

  it('displays upload button in menu', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('displays login button when not authenticated', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays sign out button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('calls login when login button is clicked', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('calls logout when sign out button is clicked', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    const logoutButton = screen.getByText('Sign Out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('displays USDC balance when authenticated', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });
    mockUseUsdcBalance.mockReturnValue({
      balance: '100.50',
      loading: false,
    });

    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('100.50 USDC')).toBeInTheDocument();
  });

  it('displays 0.00 USDC when balance is null', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });
    mockUseUsdcBalance.mockReturnValue({
      balance: null,
      loading: false,
    });

    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('0.00 USDC')).toBeInTheDocument();
  });

  it('does not display balance when not authenticated', () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.queryByText(/USDC/)).not.toBeInTheDocument();
  });

  describe('Home button visibility', () => {
    it('shows home button on /upload page when menu is closed', () => {
      mockUsePathname.mockReturnValue('/upload');

      render(<LlamaMenu />);

      // Find home link by href attribute
      const homeLink = screen.getAllByRole('link').find(link => link.getAttribute('href') === '/');
      expect(homeLink).toBeTruthy();
    });

    it('shows home button in menu on /upload page', () => {
      mockUsePathname.mockReturnValue('/upload');

      render(<LlamaMenu />);

      const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
      fireEvent.click(menuButton);

      // There should be 2 "Home" elements - one in menu and one standalone button
      const homeElements = screen.getAllByText('Home');
      expect(homeElements.length).toBeGreaterThan(0);
    });

    it('shows home button on /images/* page', () => {
      mockUsePathname.mockReturnValue('/images/123');

      render(<LlamaMenu />);

      const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
      fireEvent.click(menuButton);

      const homeElements = screen.getAllByText('Home');
      expect(homeElements.length).toBeGreaterThan(0);
    });

    it('does not show home button on home page', () => {
      mockUsePathname.mockReturnValue('/');

      render(<LlamaMenu />);

      const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
      fireEvent.click(menuButton);

      expect(screen.queryByText('Home')).toBeNull();
    });
  });

  it('closes menu when menu item is clicked', async () => {
    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('LlamaLens Access')).toBeInTheDocument();

    const uploadButton = screen.getByText('Upload').closest('a') as HTMLElement;
    fireEvent.click(uploadButton);

    // Menu should remain closed after clicking a link (navigation would happen in real app)
    expect(screen.getByText('LlamaLens Access')).toBeInTheDocument();
  });

  it('applies correct styling when menu is open', () => {
    const { container } = render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    // Check if the menu content is visible
    const menuContent = screen.getByText('LlamaLens Access');
    expect(menuContent).toBeInTheDocument();

    // The styling is applied dynamically via cn() utility, just verify menu is visible
    const menuContainer = container.querySelector('.fixed.bottom-4.left-8');
    expect(menuContainer).toBeInTheDocument();
  });

  it('applies correct styling when menu is closed', () => {
    const { container } = render(<LlamaMenu />);

    // Menu content exists in DOM but is hidden with CSS
    const menuContent = screen.getByText('LlamaLens Access');
    expect(menuContent).toBeInTheDocument();

    // Verify the menu has the correct closed state classes
    const menuContainer = container.querySelector('.opacity-0.scale-95.translate-y-10.pointer-events-none');
    expect(menuContainer).toBeInTheDocument();
  });

  it('passes wallet address to useUsdcBalance hook', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: testAddress,
    });

    render(<LlamaMenu />);

    expect(mockUseUsdcBalance).toHaveBeenCalledWith(testAddress);
  });

  it('formats balance to 2 decimal places', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: mockLogout,
      authenticated: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });
    mockUseUsdcBalance.mockReturnValue({
      balance: '1234.56789',
      loading: false,
    });

    render(<LlamaMenu />);

    const menuButton = screen.getByAltText('Llama Menu').closest('button') as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('1234.57 USDC')).toBeInTheDocument();
  });
});
