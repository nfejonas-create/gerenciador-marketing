import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Link } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Configuracoes() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [li, setLi] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [fb, setFb] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [saving, setSaving] = useState('');

  useEffect(() => {
    api.get('/social/accounts').then(r => setAccounts(r.data)).catch(() => {});
  }, []);

  const isConnected = (platform: string) => accounts.some(a => a.platform === platform && a.connected);

  async function connect(platform: string, data: any) {
    setSaving(platform);
    try {
      await api.post(`/social/connect/${platform}`, data);
      const r = await api.get('/social/accounts');
      setAccounts(r.data);
      alert(`${platform} conectado com sucesso!`);
    } catch { alert('Erro ao conectar'); } finally { setSaving(''); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          {user?.avatar ? <img src={user.avatar} className="w-14 h-14 rounded-full" alt={user.name} /> : <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">{user?.name?.[0]}</div>}
          <div><p className="text-white font-medium">{user?.name}</p><p className="text-gray-400 text-sm">{user?.email}</p></div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">LinkedIn</h2>
          {isConnected('linkedin') ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Conectado</span> : <span className="flex items-center gap-1 text-gray-500 text-sm"><AlertCircle size={14} /> Nao conectado</span>}
        </div>
        <input placeholder="Access Token" value={li.accessToken} onChange={e => setLi(x => ({ ...x, accessToken: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <input placeholder="Organization ID (pageId)" value={li.pageId} onChange={e => setLi(x => ({ ...x, pageId: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <input placeholder="Nome da pagina" value={li.pageName} onChange={e => setLi(x => ({ ...x, pageName: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <button onClick={() => connect('linkedin', li)} disabled={!li.accessToken || saving === 'linkedin'} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
          <Link size={14} /> {saving === 'linkedin' ? 'Salvando...' : 'Conectar LinkedIn'}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Facebook / Meta</h2>
          {isConnected('facebook') ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Conectado</span> : <span className="flex items-center gap-1 text-gray-500 text-sm"><AlertCircle size={14} /> Nao conectado</span>}
        </div>
        <input placeholder="Page Access Token" value={fb.accessToken} onChange={e => setFb(x => ({ ...x, accessToken: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <input placeholder="Page ID" value={fb.pageId} onChange={e => setFb(x => ({ ...x, pageId: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <input placeholder="Nome da pagina" value={fb.pageName} onChange={e => setFb(x => ({ ...x, pageName: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <button onClick={() => connect('facebook', fb)} disabled={!fb.accessToken || saving === 'facebook'} className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
          <Link size={14} /> {saving === 'facebook' ? 'Salvando...' : 'Conectar Facebook'}
        </button>
      </div>
    </div>
  );
}
