import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLoginPage from '../AdminLoginPage';
import authReducer from '../../store/authSlice';
import { api } from '../../services/api';

const mockNavigate = vi.fn();

vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn()
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

function renderPage() {
  const store = configureStore({
    reducer: {
      auth: authReducer
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs in admin with fixed endpoint and redirects to dashboard', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: {
          id: 'a1',
          name: 'Admin',
          email: 'admin@jobprep.com',
          role: 'admin'
        }
      }
    });

    renderPage();
    const user = userEvent.setup();
    const identifierInput = document.querySelector('input[name="identifier"]');
    const passwordInput = document.querySelector('input[name="password"]');

    await user.type(identifierInput, 'admin@jobprep.com');
    await user.type(passwordInput, 'admin123');
    await user.click(screen.getByRole('button', { name: /login as admin/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/admin-login', {
        email: 'admin@jobprep.com',
        password: 'admin123'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
