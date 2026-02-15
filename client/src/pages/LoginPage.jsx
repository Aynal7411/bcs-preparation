import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';

const schema = yup.object({
  identifier: yup.string().trim().required('Email or phone is required'),
  password: yup.string().min(6).required()
});

function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value || '');
}

export default function LoginPage() {
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
      const { data } = await api.post('/auth/login', payload);
      dispatch(setUser(data.user));
      toast.success('Logged in successfully');
      navigate(data.user?.role === 'admin' ? '/dashboard' : '/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Login</h1>
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
          <button disabled={isSubmitting} className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700">
            {isSubmitting ? 'Please wait...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          New user?{' '}
          <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => navigate('/register')}>
            Create account
          </button>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Admin?{' '}
          <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => navigate('/admin/login')}>
            Login here
          </button>
        </p>
      </div>
    </main>
  );
}
