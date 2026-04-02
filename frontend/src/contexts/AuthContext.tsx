import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User { id: string; name: string; email: string; avatar?: string; }
interface AuthCtx { token: string | null; user: User | null; login: (token: string) => void; logout: () => void; }

const AuthContext = createContext<AuthCtx>({ token: null, user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => { setToken(null); localStorage.removeItem('token'); });
    }
  }, [token]);

  function login(t: string) {
    localStorage.setItem('token', t);
    setToken(t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  }
  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  }
  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
