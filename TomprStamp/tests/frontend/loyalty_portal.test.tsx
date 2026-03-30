import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoyaltyLogin from '../../components/Loyalty/LoyaltyLogin';

// 1. Define the mocks
const mockUseShop = vi.fn();

// 2. Mock modules
vi.mock('../../contexts/ShopContext', () => ({
    useShop: () => mockUseShop(),
    ShopProvider: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../../contexts/KeyboardContext', () => ({
    useKeyboard: () => ({
        setTarget: vi.fn(),
        target: null,
        showKeyboard: false,
        setShowKeyboard: vi.fn()
    }),
    KeyboardProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock services/api
vi.mock('../../services/api', () => ({
    getPublicStores: vi.fn(() => Promise.resolve({ data: [{ id: 'store1', name: 'Downtown Cafe' }] })),
    publicLoginCustomer: vi.fn(),
}));

describe('Loyalty Portal Login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseShop.mockReturnValue({
            stores: [{ id: 'store1', name: 'Downtown Cafe' }],
            loading: false,
        });
    });

    it('renders loyalty login form', async () => {
        render(<LoyaltyLogin />);
        
        await waitFor(() => {
            expect(screen.getByText(/Welcome Back!/i)).toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText(/Enter your mobile number/i)).toBeInTheDocument();
    });

    it('displays store selection', async () => {
        render(<LoyaltyLogin />);
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options.length).toBeGreaterThan(0);
            expect(screen.getByText(/Downtown Cafe/i)).toBeInTheDocument();
        });
    });
});
