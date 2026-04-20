import { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserSwitcher() {
  const { user, effectiveUser, users, impersonateUser, stopImpersonating, isAdminMode } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (user?.role !== 'ADMIN') return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-white transition-colors"
      >
        <Users size={16} className="text-blue-400" />
        <span className="max-w-[120px] truncate">{effectiveUser?.name || user.name}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-xs text-gray-400">Gerenciar como:</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {/* Opção: voltar ao admin */}
            {isAdminMode && (
              <button
                onClick={() => { setOpen(false); stopImpersonating(); }}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-700 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{user.name}</p>
                  <p className="text-xs text-blue-400">Seu perfil (admin)</p>
                </div>
              </button>
            )}
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { setOpen(false); if (u.id !== effectiveUser?.id) impersonateUser(u.id); }}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-700 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.avatar ? <img src={u.avatar} className="w-7 h-7 rounded-full" alt="" /> : u.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                {effectiveUser?.id === u.id && <Check size={14} className="text-green-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
