import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, TrendingUp, Calendar, Settings, LogOut, Zap, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conteudo', icon: FileText, label: 'Conteudo' },
  { to: '/base-conhecimento', icon: Database, label: 'Base de Conhecimento' },
  { to: '/funil', icon: TrendingUp, label: 'Funil de Vendas' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/configuracoes', icon: Settings, label: 'Configuracoes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-500" size={24} />
          <span className="font-bold text-white text-lg">MktManager</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
          }>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            {user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} /> : <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">{user.name[0]}</div>}
            <div className="min-w-0"><p className="text-sm font-medium text-white truncate">{user.name}</p><p className="text-xs text-gray-400 truncate">{user.email}</p></div>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
