import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { setUser } from '../store/authSlice';

const examTargetOptions = ['BCS', 'Primary', 'NTRCA', 'Bank', 'Job Seeker'];

function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    password: '',
    confirmPassword: '',
    examTargets: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const identifierType = useMemo(() => (isEmail(form.identifier.trim()) ? 'email' : 'phone'), [form.identifier]);

  const toggleTarget = (target) => {
    setForm((prev) => ({
      ...prev,
      examTargets: prev.examTargets.includes(target)
        ? prev.examTargets.filter((item) => item !== target)
        : [...prev.examTargets, target]
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const identifier = form.identifier.trim();
    const password = form.password;

    if (!name) {
      toast.error('Name is required');
      return;
    }

    if (!identifier) {
      toast.error('Email or phone is required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        password,
        examTargets: form.examTargets
      };

      if (identifierType === 'email') {
        payload.email = identifier.toLowerCase();
      } else {
        payload.phone = identifier;
      }

      const { data } = await api.post('/auth/register', payload);
      dispatch(setUser(data.user));
      toast.success('Registration successful');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-1 text-sm text-slate-600">Registration is direct. OTP verification is disabled.</p>
        <form className="mt-5 space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email or Phone</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.identifier}
              onChange={(e) => setForm((prev) => ({ ...prev, identifier: e.target.value }))}
              placeholder="example@mail.com or 017xxxxxxxx"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>

          <div>
            <p className="text-sm font-medium">User Type / Target</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {examTargetOptions.map((target) => (
                <label key={target} className="flex items-center gap-2 rounded border px-2 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.examTargets.includes(target)}
                    onChange={() => toggleTarget(target)}
                  />
                  <span>{target}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Please wait...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
