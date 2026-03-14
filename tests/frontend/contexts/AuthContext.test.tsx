import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import React from 'react';
import * as api from '../../../services/api';

// Mock dependencies
vi.mock('../../../services/api');
vi.mock('../../../contexts/ShopContext', () => ({
  useShop: () => ({
    getUserForAuth: vi.fn(),
    verifyPinForAuth: vi.fn(),
    reloadData: vi.fn().mockResolvedValue(true)
  }),
  ShopProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

const TestComponent = () => {
  const { currentUser, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{currentUser ? currentUser.username : 'none'}</div>
      <button onClick={() => login('test', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial state from localStorage', () => {
    const mockUser = { username: 'stored-user' };
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    localStorage.setItem('token', 'stored-token');

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('user').textContent).toBe('stored-user');
  });

  it('successfully logs in and updates state', async () => {
    const mockUser = { username: 'logged-in' };
    vi.mocked(api.loginUser).mockResolvedValue({
      data: { success: true, token: 'new-token', user: mockUser }
    } as any);

    const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
        fireEvent.click(getByText('Login'));
    });

    await waitFor(() => {
      expect(getByTestId('user').textContent).toBe('logged-in');
      expect(localStorage.getItem('token')).toBe('new-token');
    });
  });
});
