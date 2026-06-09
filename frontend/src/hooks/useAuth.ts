import { useState, useCallback } from 'react';
import { setAccessToken, type User } from '../api/auth';

const USER_KEY = 'authUser';

function loadUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(loadUser);

  const login = useCallback((accessToken: string, userData: User) => {
    setAccessToken(accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return { user, login, logout, isAuthenticated: !!user };
}
