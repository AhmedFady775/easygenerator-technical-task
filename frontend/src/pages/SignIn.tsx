import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signIn } from '../api/auth';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const res = await signIn(data);
      login(res.user);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-10 py-12">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome back</h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-3.5">
              <input
                {...register('email')}
                type="email"
                placeholder="Email address"
                autoComplete="email"
                className={`w-full px-3.5 py-3 text-sm border rounded-md outline-none transition
                  placeholder:text-gray-400 bg-white text-gray-900
                  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${errors.email ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <PasswordInput
              registration={register('password')}
              placeholder="Password"
              error={errors.password?.message}
            />

            {serverError && (
              <div className="mb-3.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="relative hidden w-[45%] shrink-0 overflow-hidden bg-linear-to-br from-blue-400 to-blue-700 lg:flex items-center justify-center">
        {/* Orbs */}
        <div className="animate-float      absolute top-[12%]  left-[18%]  h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="animate-float-slow absolute bottom-[15%] right-[12%]  h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-drift      absolute top-[45%]  right-[28%]  h-40 w-40 rounded-full bg-blue-300/20 blur-xl" />
        <div className="animate-float-slow absolute top-[10%]  right-[10%]  h-24 w-24 rounded-full border border-white/20" />
        <div className="animate-float      absolute bottom-[20%] left-[10%] h-16 w-16 rounded-full border border-white/15" />
      </div>
    </div>
  );
}
