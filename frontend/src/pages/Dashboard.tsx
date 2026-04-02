import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, ThumbsUp, MessageCircle, Share2, Users, RefreshCw } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      const [m, s] = await Promise.all([api.get('/metrics?days=30'), api.get('/metrics/summary')]);
      setMetrics(m.data);
      setSummary(s.data);
    } catch {} finally { setLoading(false); }
  }

  async function sync() {
    setSyncing(true);
    try { await api.post('/social/sync'); await load(); } catch {} finally { setSyncing(false); }
  }

  useEffect(() => { load(); }, []);

  const chartData = metrics.reduce((acc: any[], m) => {
    const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const existing = acc.find(a => a.date === date);
    if (existing) { existing[m.platform + '_views'] = m.views; existing[m.platform + '_likes'] = m.likes; }
    else acc.push({ date, [m.platform + '_views']: m.views, [m.platform + '_likes']: m.likes });
    return acc;
  }, []);

  const totals = (platform: string) => summary.find(s => s.platform === platform)?._sum || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Dashboard</h1><p className="text-gray-400 text-sm">Visao geral do desempenho</p></div>
        <button onClick={sync} disabled={syncing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando...' : 'Sincronizar Metricas'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><h2 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">LinkedIn <span className="text-gray-600 text-xs font-normal">(curtidas e comentarios dos ultimos posts · conexoes do perfil)</span></h2></div>
        <MetricCard title="Conexoes" value={totals('linkedin').followers || 0} icon={<Users size={18} />} platform="linkedin" />
        <MetricCard title="Curtidas" value={totals('linkedin').likes || 0} icon={<ThumbsUp size={18} />} platform="linkedin" />
        <MetricCard title="Comentarios" value={totals('linkedin').comments || 0} icon={<MessageCircle size={18} />} platform="linkedin" />
        <MetricCard title="Posts publicados" value={totals('linkedin').shares || 0} icon={<Share2 size={18} />} platform="linkedin" />
        <div className="col-span-2 mt-2"><h2 className="text-sm font-medium text-indigo-400 mb-2">Facebook</h2></div>
        <MetricCard title="Visualizacoes" value={totals('facebook').views || 0} icon={<Eye size={18} />} platform="facebook" />
        <MetricCard title="Engajamento" value={totals('facebook').likes || 0} icon={<ThumbsUp size={18} />} platform="facebook" />
        <MetricCard title="Seguidores" value={totals('facebook').followers || 0} icon={<Users size={18} />} platform="facebook" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Engajamento — ultimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="linkedin_views" name="LinkedIn - Views" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="facebook_views" name="Facebook - Views" stroke="#818CF8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {loading && <p className="text-gray-500 text-center py-8">Carregando metricas...</p>}
      {!loading && metrics.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-400">Nenhuma metrica encontrada. Conecte suas contas em Configuracoes e sincronize.</p>
        </div>
      )}
    </div>
  );
}
