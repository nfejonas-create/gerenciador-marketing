import { useState } from 'react';
import { BarChart3, Facebook, Linkedin, Loader2, AlertCircle, Eye, Heart, MessageCircle, Share2, Users } from 'lucide-react';
import api from '../services/api';

interface FacebookPost {
  id: string;
  message: string;
  createdTime: string;
  likes: number;
  comments: number;
  shares: number;
}

interface FacebookMetrics {
  pageName: string;
  followers: number;
  likes: number;
  posts: FacebookPost[];
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

interface LinkedInMetrics {
  status: string;
  message: string;
  note: string;
}

interface MetricsData {
  facebook: FacebookMetrics | null;
  linkedin: LinkedInMetrics;
}

function MetricCard({ title, value, icon: Icon, color = 'blue' }: { title: string; value: string | number; icon: any; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
    green: 'bg-green-900/30 text-green-400 border-green-800',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  };
  
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} />
        <span className="text-sm font-medium opacity-80">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function SocialMetrics() {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookToken, setFacebookToken] = useState('');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchMetrics() {
    setLoading(true);
    setError('');
    
    try {
      const requests: Promise<any>[] = [
        api.get('/metrics/linkedin-profile'),
      ];

      if (facebookPageId && facebookToken) {
        requests.push(
          api.post('/metrics/facebook', { 
            pageId: facebookPageId, 
            accessToken: facebookToken 
          })
        );
      }

      const [linkedinRes, facebookRes] = await Promise.all(requests);

      setMetrics({
        linkedin: linkedinRes.data,
        facebook: facebookRes?.data || null,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar métricas');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400" />
            Métricas Sociais
          </h1>
          <p className="text-gray-400 text-sm">
            Dashboard de performance LinkedIn + Facebook
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LinkedIn Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Linkedin size={20} />
            <h2 className="font-semibold text-white">LinkedIn</h2>
          </div>
          
          <div>
            <label className="text-sm text-gray-400 block mb-1">Link do perfil LinkedIn</label>
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/seu-perfil"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-400 text-xs">
              Perfis pessoais do LinkedIn têm limitações de API. 
              Para métricas completas, conecte uma Company Page.
            </p>
          </div>
        </div>

        {/* Facebook Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Facebook size={20} />
            <h2 className="font-semibold text-white">Facebook Page</h2>
          </div>
          
          <div>
            <label className="text-sm text-gray-400 block mb-1">Link da página</label>
            <input
              type="text"
              value={facebookPageUrl}
              onChange={(e) => setFacebookPageUrl(e.target.value)}
              placeholder="https://facebook.com/sua-pagina"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Page ID *</label>
            <input
              type="text"
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              placeholder="123456789"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Access Token *</label>
            <input
              type="password"
              value={facebookToken}
              onChange={(e) => setFacebookToken(e.target.value)}
              placeholder="EAAB..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="text-gray-500 text-xs mt-1">
              Token de acesso da página (não é armazenado no servidor)
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={fetchMetrics}
        disabled={loading || (!facebookPageId || !facebookToken)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Buscando métricas...
          </>
        ) : (
          <>
            <BarChart3 size={18} />
            Gerar Métricas
          </>
        )}
      </button>

      {/* Results */}
      {metrics && (
        <div className="space-y-6">
          {/* Facebook Metrics */}
          {metrics.facebook && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Facebook size={20} className="text-blue-400" />
                  <h2 className="font-semibold text-white">{metrics.facebook.pageName}</h2>
                </div>
                <span className="text-xs text-gray-500">Facebook Page</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                  title="Seguidores" 
                  value={metrics.facebook.followers.toLocaleString()} 
                  icon={Users} 
                  color="blue"
                />
                <MetricCard 
                  title="Curtidas na Página" 
                  value={metrics.facebook.likes.toLocaleString()} 
                  icon={Heart} 
                  color="purple"
                />
                <MetricCard 
                  title="Posts Analisados" 
                  value={metrics.facebook.posts.length} 
                  icon={Eye} 
                  color="green"
                />
                <MetricCard 
                  title="Engajamento Total" 
                  value={(metrics.facebook.totalLikes + metrics.facebook.totalComments + metrics.facebook.totalShares).toLocaleString()} 
                  icon={Share2} 
                  color="yellow"
                />
              </div>

              {/* Posts Breakdown */}
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Últimos Posts</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <Heart size={16} className="mx-auto text-red-400 mb-1" />
                    <p className="text-lg font-bold text-white">{metrics.facebook.totalLikes}</p>
                    <p className="text-xs text-gray-500">Curtidas</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <MessageCircle size={16} className="mx-auto text-blue-400 mb-1" />
                    <p className="text-lg font-bold text-white">{metrics.facebook.totalComments}</p>
                    <p className="text-xs text-gray-500">Comentários</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <Share2 size={16} className="mx-auto text-green-400 mb-1" />
                    <p className="text-lg font-bold text-white">{metrics.facebook.totalShares}</p>
                    <p className="text-xs text-gray-500">Compartilhamentos</p>
                  </div>
                </div>
              </div>

              {/* Posts List */}
              <div className="border-t border-gray-800 pt-4 space-y-3 max-h-64 overflow-y-auto">
                {metrics.facebook.posts.map((post) => (
                  <div key={post.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <p className="text-gray-300 text-sm line-clamp-2">{post.message || '(Sem texto)'}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(post.createdTime)}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart size={12} className="text-red-400" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} className="text-blue-400" /> {post.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 size={12} className="text-green-400" /> {post.shares}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn Metrics */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Linkedin size={20} className="text-blue-400" />
              <h2 className="font-semibold text-white">LinkedIn</h2>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">{metrics.linkedin.message}</p>
                <p className="text-yellow-500/80 text-xs mt-1">{metrics.linkedin.note}</p>
              </div>
            </div>

            {linkedinUrl && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-xs">Perfil analisado:</p>
                <a 
                  href={linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline break-all"
                >
                  {linkedinUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
