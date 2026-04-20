import { useState, useEffect } from 'react';
import { Send, Clock, Calendar, Linkedin, Facebook } from 'lucide-react';
import api from '../services/api';

type Post = {
  id: string;
  platform: string;
  status: string;
  content: string;
  cta?: string;
  hashtags?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
};

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return 1;
  if (diffDays < 14) return 2;
  if (diffDays < 21) return 3;
  return 4;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

export default function Calendario() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    api.get('/content/posts')
      .then(r => setPosts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p => {
    const platOk = filterPlatform === 'all' || p.platform === filterPlatform;
    const statOk = filterStatus === 'all' || p.status === filterStatus;
    return platOk && statOk;
  });

  // Agrupa por semana (1 = mais recente)
  const byWeek: Record<number, Post[]> = { 1: [], 2: [], 3: [], 4: [] };
  filtered.forEach(p => {
    const ref = p.publishedAt || p.scheduledAt || p.createdAt;
    const week = getWeekNumber(ref);
    if (week >= 1 && week <= 4) byWeek[week].push(p);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-gray-400 text-sm">Posts das ultimas 4 semanas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="all">Todas plataformas</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value="all">Todos status</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Agendados</option>
            <option value="draft">Rascunhos</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <Calendar size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">Nenhum post encontrado.</p>
          <p className="text-gray-600 text-sm mt-1">Va em Conteudo para criar e publicar posts.</p>
        </div>
      )}

      {[1, 2, 3, 4].map(week => {
        const weekPosts = byWeek[week];
        if (weekPosts.length === 0) return null;
        const label = week === 1 ? 'Semana atual' : week === 2 ? 'Semana passada' : `Ha ${week} semanas`;
        return (
          <div key={week} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-blue-400" />
              Semana {week} — <span className="text-gray-400 font-normal text-sm">{label}</span>
              <span className="ml-auto text-xs text-gray-600">{weekPosts.length} post{weekPosts.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weekPosts.map(post => {
                const ref = post.publishedAt || post.scheduledAt || post.createdAt;
                return (
                  <div key={post.id}
                    className={`rounded-xl border p-4 space-y-2 ${post.status === 'published' ? 'border-green-800 bg-green-900/10' : post.status === 'scheduled' ? 'border-yellow-800 bg-yellow-900/10' : 'border-gray-700 bg-gray-800'}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>
                        {post.platform === 'linkedin' ? '💼 LinkedIn' : '📘 Facebook'}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${post.status === 'published' ? 'text-green-400' : post.status === 'scheduled' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {post.status === 'published' ? <><Send size={10} /> Publicado</> : post.status === 'scheduled' ? <><Clock size={10} /> Agendado</> : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">{getDayLabel(ref)}</p>
                    {/* Texto completo com rolagem */}
                    <div className="max-h-28 overflow-y-auto pr-1">
                      <p className="text-gray-200 text-sm whitespace-pre-wrap">{post.content}</p>
                    </div>
                    {post.cta && <p className="text-blue-400 text-xs border-t border-gray-700 pt-2">{post.cta}</p>}
                    {post.hashtags && <p className="text-gray-600 text-xs">{post.hashtags}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
