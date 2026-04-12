import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, ThumbsUp, Share2, Users, RefreshCw, Link, Save } from 'lucide-react';
import api from '../services/api';

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', color: '#3b82f6', placeholder: 'https://linkedin.com/in/seu-perfil' },
  { key: 'facebook', label: 'Facebook', color: '#6366f1', placeholder: 'https://facebook.com/sua-pagina' },
  { key: 'site', label: 'Site / Blog', color: '#10b981', placeholder: 'https://seusite.com.br' },
  { key: 'outro', label: 'Outra Plataforma', color: '#f59e0b', placeholder: 'https://instagram.com/...' },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({ linkedin: '', facebook: '', site: '', outro: '' });
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksSaved, setLinksSaved] = useState(false);

  async function load() {
    try {
      const [m, s, cfg] = await Promise.all([
        api.get('/metrics?days=30'),
        api.get('/metrics/summary'),
        api.get('/auth/settings'),
      ]);
      setMetrics(m.data);
      setSummary(s.data);
      if (cfg.data?.profileLinks) setLinks(cfg.data.profileLinks);
    } catch {} finally { setLoading(false); }
  }

  async function sync() {
    setSyncing(true);
    try { await api.post('/social/sync'); await load(); } catch {} finally { setSyncing(false); }
  }

  async function saveLinks() {
    setSavingLinks(true);
    try {
      await api.put('/auth/settings', { profileLinks: links });
      setLinksSaved(true);
      setTimeout(() => setLinksSaved(false), 2000);
    } catch {} finally { setSavingLinks(false); }
  }

  useEffect(() => { load(); }, []);

  const totals = (platform: string) => summary.find((s: any) => s.platform === platform)?._sum || {};

  const chartData = metrics.reduce((acc: any[], m) => {
    const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const existing = acc.find(a => a.date === date);
    if (existing) {
      existing[m.platform + '_views'] = (existing[m.platform + '_views'] || 0) + (m.views || 0);
      existing[m.platform + '_likes'] = (existing[m.platform + '_likes'] || 0) + (m.likes || 0);
    } else {
      acc.push({ date, [m.platform + '_views']: m.views || 0, [m.platform + '_likes']: m.likes || 0 });
    }
    return acc;
  }, []).slice(-14);

  const linkedinPosts = summary.find((s: any) => s.platform === 'linkedin')?._count?.id || totals('linkedin').shares || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">Visao geral do desempenho</p>
        </div>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Metricas'}
        </button>
      </div>

      {/* 4 janelas de perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map(p => (
          <div key={p.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <h3 className="text-white font-medium text-sm">{p.label}</h3>
            </div>
            <div className="flex gap-2">
              <input
                value={links[p.key] || ''}
                onChange={e => setLinks(prev => ({ ...prev, [p.key]: e.target.value }))}
                placeholder={p.placeholder}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
              />
              {links[p.key] && (
                <a href={links[p.key]} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <Link size={14} className="text-gray-300" />
                </a>
              )}
            </div>
            {/* Metricas da plataforma */}
            {(p.key === 'linkedin' || p.key === 'facebook') && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {p.key === 'linkedin' && (
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <Share2 size={12} className="mx-auto text-blue-400 mb-1" />
                    <p className="text-white text-lg font-bold">{linkedinPosts}</p>
                    <p className="text-gray-500 text-xs">Posts publicados</p>
                  </div>
                )}
                {p.key === 'facebook' && (
                  <>
                    <div className="bg-gray-800 rounded-lg p-2 text-center">
                      <Eye size={12} className="mx-auto text-indigo-400 mb-1" />
                      <p className="text-white text-lg font-bold">{totals('facebook').views || 0}</p>
                      <p className="text-gray-500 text-xs">Visualizacoes</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2 text-center">
                      <Users size={12} className="mx-auto text-indigo-400 mb-1" />
                      <p className="text-white text-lg font-bold">{totals('facebook').followers || 0}</p>
                      <p className="text-gray-500 text-xs">Seguidores</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2 text-center">
                      <ThumbsUp size={12} className="mx-auto text-indigo-400 mb-1" />
                      <p className="text-white text-lg font-bold">{totals('facebook').likes || 0}</p>
                      <p className="text-gray-500 text-xs">Engajamento</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={saveLinks} disabled={savingLinks}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${linksSaved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white'}`}>
          <Save size={14} /> {linksSaved ? '✓ Links salvos!' : savingLinks ? 'Salvando...' : 'Salvar links'}
        </button>
      </div>

      {/* Grafico de linha */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Desempenho ultimos 14 dias</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="linkedin_views" stroke="#3b82f6" strokeWidth={2} dot={false} name="LinkedIn visualiz." />
              <Line type="monotone" dataKey="facebook_views" stroke="#6366f1" strokeWidth={2} dot={false} name="Facebook visualiz." />
              <Line type="monotone" dataKey="facebook_likes" stroke="#10b981" strokeWidth={2} dot={false} name="Facebook likes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  );
}
