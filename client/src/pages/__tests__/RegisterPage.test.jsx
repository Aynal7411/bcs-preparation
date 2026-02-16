import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../RegisterPage';
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
        <RegisterPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers user directly without OTP flow', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: {
          id: 'u2',
          name: 'New User',
          email: 'newuser@example.com',
          role: 'student'
        }
      }
    });

    renderPage();
    const user = userEvent.setup();

    const textInputs = document.querySelectorAll('input:not([type]), input[type="text"]');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const bcsCheckbox = screen.getByRole('checkbox', { name: /bcs/i });

    await user.type(textInputs[0], 'New User');
    await user.type(screen.getByPlaceholderText(/example@mail.com/i), 'newuser@example.com');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password123');
    await user.click(bcsCheckbox);
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        examTargets: ['BCS']
      });
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
      expect(api.post).not.toHaveBeenCalledWith('/auth/verify-otp', expect.anything());
    });
  });
});
