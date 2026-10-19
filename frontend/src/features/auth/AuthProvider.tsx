import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, jsonBody } from '../../api/client';
import type { User } from '../orders/orders.types';

interface Auth { user: User | null; loading: boolean; error: unknown; refresh: () => void; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; setUser: (user: User) => void }
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const clear = () => setUser(null);
    window.addEventListener('sarh:unauthorized', clear);
    return () => window.removeEventListener('sarh:unauthorized', clear);
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    setLoading(true); setError(undefined);
    api<{ user: User }>('/api/auth/me', { signal: controller.signal }).then(
      result => { if (current) setUser(result.user); },
      error => { if (current && error?.status !== 401) setError(error); },
    ).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [revision]);
  return <AuthContext.Provider value={{ user, loading, error, refresh: () => setRevision(v => v + 1), setUser,
    login: async (email, password) => { const result = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: jsonBody({ email, password }) }); setUser(result.user); },
    logout: async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); },
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider required'); return value; }
