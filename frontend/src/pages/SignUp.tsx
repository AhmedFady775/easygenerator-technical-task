import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signUp } from '../api/auth';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../hooks/useAuth';

const schema = z
  .object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(3, 'Name must be at least 3 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function SignUp() {
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
      const { confirmPassword: _, ...payload } = data;
      const res = await signUp(payload);
      login(res.user);
      navigate('/app');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Sign up failed. Please try again.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-10 py-12">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Create account</h1>

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

            <div className="mb-3.5">
              <input
                {...register('name')}
                type="text"
                placeholder="Full name"
                autoComplete="name"
                className={`w-full px-3.5 py-3 text-sm border rounded-md outline-none transition
                  placeholder:text-gray-400 bg-white text-gray-900
                  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${errors.name ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <PasswordInput
              registration={register('password')}
              placeholder="Password"
              error={errors.password?.message}
            />

            <PasswordInput
              registration={register('confirmPassword')}
              placeholder="Confirm password"
              error={errors.confirmPassword?.message}
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
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/signin" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="relative hidden w-[45%] shrink-0 overflow-hidden bg-linear-to-br from-blue-400 to-blue-700 lg:flex items-center justify-center">
        <div className="animate-float      absolute top-[12%]  left-[18%]  h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="animate-float-slow absolute bottom-[15%] right-[12%]  h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-drift      absolute top-[45%]  right-[28%]  h-40 w-40 rounded-full bg-blue-300/20 blur-xl" />
        <div className="animate-float-slow absolute top-[10%]  right-[10%]  h-24 w-24 rounded-full border border-white/20" />
        <div className="animate-float      absolute bottom-[20%] left-[10%] h-16 w-16 rounded-full border border-white/15" />
      </div>
    </div>
  );
}
