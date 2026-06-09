import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signUp } from '../api/auth';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
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
      const res = await signUp(data);
      login(res.accessToken, res.user);
      navigate('/app');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Sign up failed. Please try again.';
      setServerError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create account</h1>
          <p>Join EasyGenerator today</p>
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

          <div className="input-wrapper">
            <input
              {...register('name')}
              type="text"
              placeholder="Full name"
              className={`input ${errors.name ? 'input-error' : ''}`}
              autoComplete="name"
            />
            {errors.name && <p className="error-msg">{errors.name.message}</p>}
          </div>

          <PasswordInput
            registration={register('password')}
            placeholder="Password"
            error={errors.password?.message}
          />

          {serverError && <p className="server-error">{serverError}</p>}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
