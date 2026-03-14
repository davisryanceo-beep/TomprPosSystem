import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Setup global mocks BEFORE importing component
vi.stubGlobal('location', { hostname: 'poscafesystem.vercel.app' });
vi.stubEnv('VITE_STAMP_ONLY', 'false');

// 2. Define intermediate mocks
const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
    login: mockLogin,
    loginWithGoogle: vi.fn(),
    currentUser: null,
    loading: false,
}));
const mockUseShop = vi.fn(() => ({
    appSettings: { registrationEnabled: true },
    loading: false,
    stores: [],
    currentStoreId: null,
}));

// 3. Mock the modules
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }: any) => <div>{children}</div>
}));

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

// Import AFTER mocking
import LoginScreen from '../../components/Auth/LoginScreen';

describe('POS LoginScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form items', () => {
        render(<LoginScreen />);
        expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    it('shows error on failed login', async () => {
        mockLogin.mockResolvedValue(false);
        render(<LoginScreen />);
        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'wrong' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
        await waitFor(() => {
            expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
        });
    });
});
