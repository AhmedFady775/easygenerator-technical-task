import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, type User } from '../api/auth';
import { AuthContext } from '../hooks/useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((userData: User) => setUser(userData), []);
  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
