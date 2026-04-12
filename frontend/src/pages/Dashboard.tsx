import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, ThumbsUp, MessageCircle, Share2, Users, RefreshCw, TrendingUp, ExternalLink } from 'lucide-react';
import { analyticsApi, settingsApi } from '../services/api/v3';

interface AnalyticsSnapshot {
  id: string;
  platform: string;
  followers: number;
  views: number;
  shares: number;
  likes: number;
  comments: number;
  sales: number;
  snapshotDate: string;
  analysisText?: string;
}

interface PlatformData {
  followers: number;
  views: number;
  shares: number;
  likes: number;
  comments: number;
  sales: number;
  url?: string;
}

export default function Dashboard() {
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [latest, setLatest] = useState<Record<string, AnalyticsSnapshot>>({});
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [snapRes, latestRes, settingsRes] = await Promise.all([
        analyticsApi.getAll({ limit: 30 }),
        analyticsApi.getLatest(),
        settingsApi.get(),
      ]);
      setSnapshots(snapRes.data.snapshots);
      setLatest(latestRes.data.latest);
      setSettings(settingsRes.data.settings);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAnalytics() {
    setRefreshing(true);
    try {
      await analyticsApi.refresh();
      await loadData();
    } catch (err) {
      console.error('Error refreshing analytics:', err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Preparar dados para o gráfico
  const chartData = snapshots
    .reduce((acc: any[], snap) => {
      const date = new Date(snap.snapshotDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      const existing = acc.find((a) => a.date === date);
      if (existing) {
        existing[`${snap.platform.toLowerCase()}_views`] = snap.views;
      } else {
        acc.push({
          date,
          [`${snap.platform.toLowerCase()}_views`]: snap.views,
        });
      }
      return acc;
    }, [])
    .reverse();

  const platforms = [
    { key: 'LINKEDIN', name: 'LinkedIn', color: '#3B82F6', icon: 'linkedin' },
    { key: 'FACEBOOK', name: 'Facebook', color: '#8B5CF6', icon: 'facebook' },
    { key: 'SITE', name: 'Site', color: '#10B981', icon: 'site' },
    { key: 'OTHER', name: 'Outra', color: '#F59E0B', icon: 'other' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Métricas e análise de desempenho</p>
        </div>

        <button
          onClick={refreshAnalytics}
          disabled={refreshing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Atualizando...' : 'Atualizar Métricas'}
        </button>
      </div>

      {/* Cards de Plataformas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((platform) => {
          const data = latest[platform.key];
          const url = settings?.[`${platform.key.toLowerCase()}Url`];

          return (
            <div
              key={platform.key}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <h3 className="font-semibold text-white">{platform.name}</h3>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {data ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{data.followers.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Users size={12} /> Seguidores
                    </p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{data.views.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye size={12} /> Visualizações
                    </p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{data.likes.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <ThumbsUp size={12} /> Curtidas
                    </p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{data.comments.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MessageCircle size={12} /> Comentários
                    </p>
                  </div>
                  {platform.key === 'SITE' && (
                    <div className="bg-gray-700/50 rounded-lg p-2 col-span-2">
                      <p className="text-lg font-bold text-green-400">{data.sales.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Vendas/Conversões</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Nenhum dado</p>
                  <p className="text-gray-600 text-xs mt-1">Configure em Configurações</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Visualizações — Últimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="linkedin_views"
                name="LinkedIn"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="facebook_views"
                name="Facebook"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="site_views"
                name="Site"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Análise GPT */}
      {Object.values(latest).some((l: any) => l?.analysisText) && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Análise de Desempenho (GPT-4o)</h2>
          <div className="space-y-4">
            {Object.entries(latest).map(([platform, data]: [string, any]) =>
              data?.analysisText ? (
                <div key={platform} className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-400 mb-2">{platform}</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{data.analysisText}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}
