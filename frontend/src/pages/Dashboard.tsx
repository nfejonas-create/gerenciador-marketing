import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, ThumbsUp, Share2, Users, RefreshCw, Link, Save, MessageCircle, TrendingUp } from 'lucide-react';
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
  const counts = (platform: string) => summary.find((s: any) => s.platform === platform)?._count?.id || 0;
  const latestMetric = (platform: string) => [...metrics].filter((m: any) => m.platform === platform).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || {};
  const totalViews = summary.reduce((sum, s: any) => sum + (s._sum?.views || 0), 0);
  const totalEngagement = summary.reduce((sum, s: any) => sum + (s._sum?.likes || 0) + (s._sum?.comments || 0) + (s._sum?.shares || 0), 0);
  const totalFollowers = ['linkedin', 'facebook', 'site'].reduce((sum, platform) => sum + (latestMetric(platform).followers || 0), 0);

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
  const platformBars = ['linkedin', 'facebook', 'site'].map(platform => ({
    platform,
    visualizacoes: totals(platform).views || 0,
    engajamento: (totals(platform).likes || 0) + (totals(platform).comments || 0) + (totals(platform).shares || 0),
    seguidores: latestMetric(platform).followers || 0,
  }));
  const recentMetrics = [...metrics].slice(-10).reverse();

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Views acumuladas', value: totalViews, icon: Eye, color: 'text-blue-400' },
          { label: 'Engajamento acumulado', value: totalEngagement, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Seguidores atuais', value: totalFollowers, icon: Users, color: 'text-purple-400' },
          { label: 'Coletas', value: metrics.length, icon: RefreshCw, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{Number(value || 0).toLocaleString('pt-BR')}</p>
          </div>
        ))}
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
                    <p className="text-gray-500 text-xs">Coletas/posts</p>
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
                      <p className="text-white text-lg font-bold">{latestMetric('facebook').followers || 0}</p>
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
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Desempenho ultimos 14 dias</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="linkedin_views" stroke="#3b82f6" strokeWidth={2} dot={false} name="LinkedIn visualiz." />
                <Line type="monotone" dataKey="facebook_views" stroke="#6366f1" strokeWidth={2} dot={false} name="Facebook visualiz." />
                <Line type="monotone" dataKey="facebook_likes" stroke="#10b981" strokeWidth={2} dot={false} name="Facebook engaj." />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Comparativo por canal</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={platformBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="platform" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="visualizacoes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engajamento" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Últimas métricas coletadas</h2>
        {recentMetrics.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Nenhuma métrica sincronizada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Canal</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Engaj.</th>
                  <th className="text-right py-2">Seguidores</th>
                </tr>
              </thead>
              <tbody>
                {recentMetrics.map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-800/60 text-gray-300">
                    <td className="py-2">{new Date(m.date).toLocaleString('pt-BR')}</td>
                    <td className="py-2 capitalize">{m.platform}</td>
                    <td className="py-2 text-right"><Eye size={12} className="inline mr-1 text-blue-400" />{m.views || 0}</td>
                    <td className="py-2 text-right"><MessageCircle size={12} className="inline mr-1 text-green-400" />{(m.likes || 0) + (m.comments || 0) + (m.shares || 0)}</td>
                    <td className="py-2 text-right">{m.followers || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  );
}
