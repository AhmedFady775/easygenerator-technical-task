import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface Props {
  registration: UseFormRegisterReturn;
  placeholder?: string;
  error?: string;
}

export function PasswordInput({ registration, placeholder = 'Password', error }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="input-wrapper">
      <div className="password-field">
        <input
          {...registration}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className={`input ${error ? 'input-error' : ''}`}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="toggle-password"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
