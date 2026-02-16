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
  const profileOwnerName = user?.name?.trim() || 'User';
  const profileImageUrl = user?.profileImage?.url || '';
  const profileInitials =
    profileOwnerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
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

          <NavLink to="/about" className={linkClass}>
            About
          </NavLink>

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
              <Link
                to="/profile"
                title={`Profile owner: ${profileOwnerName}`}
                aria-label={`Profile owner: ${profileOwnerName}`}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-2 py-1 hover:bg-slate-100"
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={profileOwnerName}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                    {profileInitials}
                  </span>
                )}
                <span className="max-w-[140px] truncate text-xs font-semibold text-slate-700">{profileOwnerName}</span>
              </Link>
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
