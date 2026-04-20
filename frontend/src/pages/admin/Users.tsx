import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { useAuth, User } from '../../contexts/AuthContext';
import api from '../../services/api';

interface UserForm { name: string; email: string; password: string; role: 'ADMIN' | 'USER'; }

const emptyForm: UserForm = { name: '', email: '', password: '', role: 'USER' };

export default function AdminUsers() {
  const { users, refreshUsers } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { refreshUsers(); }, []);

  function openCreate() { setForm(emptyForm); setEditingUser(null); setShowForm(true); }
  function openEdit(u: User) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role || 'USER' });
    setEditingUser(u); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      if (editingUser) {
        const data: any = { name: form.name, email: form.email, role: form.role };
        if (form.password) data.password = form.password;
        await api.put(`/admin/users/${editingUser.id}`, data);
      } else {
        await api.post('/admin/users', form);
      }
      await refreshUsers();
      setShowForm(false);
      setMsg(editingUser ? 'Usuario atualizado!' : 'Usuario criado com sucesso!');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Erro ao salvar');
    } finally { setLoading(false); }
  }

  async function toggleActive(u: User) {
    await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive });
    refreshUsers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Gerenciar Usuarios</h1>
        <div className="flex gap-2">
          <button onClick={() => refreshUsers()} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm">
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Plus size={16} /> Novo Usuario
          </button>
        </div>
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.includes('Erro') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>{msg}</div>}

      {/* Modal de criação/edição */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-4">{editingUser ? 'Editar Usuario' : 'Novo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input required type="email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder={editingUser ? 'Nova senha (deixe vazio para manter)' : 'Senha'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'USER' }))}>
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de usuários */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Perfil</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-xs text-gray-400 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">{u.name[0]}</div>
                    <span className="text-white text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 text-gray-400'}`}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Usuario'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {u.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => toggleActive(u)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title={u.isActive ? 'Desativar' : 'Ativar'}>
                      {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum usuario encontrado</div>
        )}
      </div>
    </div>
  );
}
