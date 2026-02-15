import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';

const schema = yup.object({
  identifier: yup.string().trim().required('Email or phone is required'),
  password: yup.string().min(6).required()
});

function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value || '');
}

export default function AdminLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const payload = {
        password: values.password
      };
      const identifier = values.identifier.trim();
      if (isEmail(identifier)) {
        payload.email = identifier.toLowerCase();
      } else {
        payload.phone = identifier;
      }

      const { data } = await api.post('/auth/admin-login', payload);
      dispatch(setUser(data.user));
      toast.success('Admin login successful');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin login failed');
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Only authorized administrators can access dashboard tools.</p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm font-medium">Email or Phone</label>
            <input {...register('identifier')} className="mt-1 w-full rounded-md border px-3 py-2" />
            <p className="mt-1 text-xs text-red-600">{errors.identifier?.message}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" {...register('password')} className="mt-1 w-full rounded-md border px-3 py-2" />
            <p className="mt-1 text-xs text-red-600">{errors.password?.message}</p>
          </div>
          <button disabled={isSubmitting} className="w-full rounded-lg bg-brand-700 py-2 font-semibold text-white hover:bg-brand-600">
            {isSubmitting ? 'Please wait...' : 'Login as Admin'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          User login?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Go to user login
          </Link>
        </p>
      </div>
    </main>
  );
}
