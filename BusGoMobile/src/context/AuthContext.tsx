import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, readToken, readUser, saveSession } from '@/lib/storage';

type User = { id?: string; name?: string; mobile?: string; email?: string };
type AuthValue = {
  ready: boolean; token: string | null; user: User | null;
  signIn: (token: string, user: User) => Promise<void>; signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false); const [token, setToken] = useState<string | null>(null); const [user, setUser] = useState<User | null>(null);
  useEffect(() => { (async () => { setToken(await readToken()); setUser(await readUser<User>()); setReady(true); })(); }, []);
  const value = useMemo<AuthValue>(() => ({ ready, token, user,
    signIn: async (nextToken, nextUser) => { await saveSession(nextToken, nextUser); setToken(nextToken); setUser(nextUser); },
    signOut: async () => { await clearSession(); setToken(null); setUser(null); }
  }), [ready, token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
