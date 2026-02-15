import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { logout } from '../store/authSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
      dispatch(logout());
      toast.success('Logged out');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-700 hover:text-brand-700'}`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-slate-900">
          Govt Job Live
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>

          {isAuthenticated && !isAdmin && (
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
          )}

          {isAuthenticated && isAdmin && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink to="/question-bank" className={linkClass}>
              Question Bank
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink to="/results" className={linkClass}>
              Results
            </NavLink>
          )}

          {!isAuthenticated && (
            <NavLink to="/login" className={linkClass}>
              Login
            </NavLink>
          )}

          {!isAuthenticated && (
            <NavLink to="/register" className={linkClass}>
              Register
            </NavLink>
          )}

          {isAuthenticated && (
            <>
              <span className="text-xs text-slate-500">{user?.name || 'User'}</span>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
