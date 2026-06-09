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
      login(res.accessToken, res.user);
      navigate('/app');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="input-wrapper">
            <input
              {...register('email')}
              type="email"
              placeholder="Email address"
              className={`input ${errors.email ? 'input-error' : ''}`}
              autoComplete="email"
            />
            {errors.email && <p className="error-msg">{errors.email.message}</p>}
          </div>

          <PasswordInput
            registration={register('password')}
            placeholder="Password"
            error={errors.password?.message}
          />

          {serverError && <p className="server-error">{serverError}</p>}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
