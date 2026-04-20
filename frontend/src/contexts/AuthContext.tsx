import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
}

interface AuthCtx {
  token: string | null;
  user: User | null;
  effectiveUser: User | null;
  users: User[];
  isAdminMode: boolean;
  login: (token: string, userData?: User, usersData?: User[]) => void;
  logout: () => void;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  token: null, user: null, effectiveUser: null, users: [], isAdminMode: false,
  login: () => {}, logout: () => {},
  impersonateUser: async () => {}, stopImpersonating: async () => {}, refreshUsers: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [effectiveUser, setEffectiveUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const isAdminMode = !!effectiveUser && !!user && effectiveUser.id !== user.id;

  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const impId = localStorage.getItem('impersonateUserId');
    if (impId) api.defaults.headers.common['X-Impersonate-User-Id'] = impId;

    api.get('/auth/me').then(r => {
      const u: User = r.data;
      setUser(u);
      if (u.role === 'ADMIN') {
        api.get('/admin/users').then(res => setUsers(res.data.users || [])).catch(() => {});
      }
      const storedEff = localStorage.getItem('effectiveUser');
      if (storedEff) {
        try { setEffectiveUser(JSON.parse(storedEff)); } catch { setEffectiveUser(u); }
      } else {
        setEffectiveUser(u);
      }
    }).catch(() => {
      setToken(null);
      localStorage.removeItem('token');
    });
  }, [token]);

  function login(t: string, userData?: User, usersData?: User[]) {
    localStorage.setItem('token', t);
    setToken(t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    if (userData) { setUser(userData); setEffectiveUser(userData); }
    if (usersData) setUsers(usersData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('impersonateUserId');
    localStorage.removeItem('effectiveUser');
    setToken(null); setUser(null); setEffectiveUser(null); setUsers([]);
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['X-Impersonate-User-Id'];
  }

  async function impersonateUser(userId: string) {
    await api.post('/auth/impersonate', { targetUserId: userId });
    localStorage.setItem('impersonateUserId', userId);
    api.defaults.headers.common['X-Impersonate-User-Id'] = userId;
    const target = users.find(u => u.id === userId);
    if (target) { setEffectiveUser(target); localStorage.setItem('effectiveUser', JSON.stringify(target)); }
    window.location.reload();
  }

  async function stopImpersonating() {
    await api.post('/auth/stop-impersonating').catch(() => {});
    localStorage.removeItem('impersonateUserId');
    localStorage.removeItem('effectiveUser');
    delete api.defaults.headers.common['X-Impersonate-User-Id'];
    setEffectiveUser(user);
    window.location.reload();
  }

  async function refreshUsers() {
    if (user?.role !== 'ADMIN') return;
    const res = await api.get('/admin/users').catch(() => ({ data: { users: [] } }));
    setUsers(res.data.users || []);
  }

  return (
    <AuthContext.Provider value={{ token, user, effectiveUser, users, isAdminMode, login, logout, impersonateUser, stopImpersonating, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
