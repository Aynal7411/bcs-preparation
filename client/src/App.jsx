import { Suspense, lazy, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import { useAuth } from './hooks/useAuth';
import { logout, setUser } from './store/authSlice';
import { api } from './services/api';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminExamManagerPage = lazy(() => import('./pages/AdminExamManagerPage'));
const QuestionBankPage = lazy(() => import('./pages/QuestionBankPage'));
const LiveExamPage = lazy(() => import('./pages/LiveExamPage'));
const ExamResultsPage = lazy(() => import('./pages/ExamResultsPage'));
const ExamResultDetailPage = lazy(() => import('./pages/ExamResultDetailPage'));

function ProtectedRoute({ children, isReady }) {
  const { isAuthenticated } = useAuth();
  if (!isReady) {
    return <RouteFallback />;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children, isReady }) {
  const { isAuthenticated, user } = useAuth();
  if (!isReady) {
    return <RouteFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return user?.role === 'admin' ? children : <Navigate to="/profile" replace />;
}

function RouteFallback() {
  return <main className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">Loading...</main>;
}

export default function App() {
  const dispatch = useDispatch();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        dispatch(setUser({ id: data.id || data._id, name: data.name, email: data.email, role: data.role }));
      } catch {
        dispatch(logout());
      } finally {
        setIsAuthReady(true);
      }
    };

    hydrateAuth();
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute isReady={isAuthReady}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <AdminRoute isReady={isAuthReady}>
                <AdminExamManagerPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute isReady={isAuthReady}>
                <AdminExamManagerPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/exams"
            element={
              <AdminRoute isReady={isAuthReady}>
                <AdminExamManagerPage />
              </AdminRoute>
            }
          />

          <Route
            path="/question-bank"
            element={
              <ProtectedRoute isReady={isAuthReady}>
                <QuestionBankPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/live-exam/:id"
            element={
              <ProtectedRoute isReady={isAuthReady}>
                <LiveExamPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/results"
            element={
              <ProtectedRoute isReady={isAuthReady}>
                <ExamResultsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/results/:id"
            element={
              <ProtectedRoute isReady={isAuthReady}>
                <ExamResultDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}
