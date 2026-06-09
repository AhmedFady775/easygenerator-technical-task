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
    <div className="mb-3.5">
      <div className="relative">
        <input
          {...registration}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="current-password"
          className={`w-full px-3.5 py-3 text-sm border rounded-md outline-none transition
            placeholder:text-gray-400 bg-white text-gray-900
            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
