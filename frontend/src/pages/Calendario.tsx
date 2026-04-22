import { useState, useEffect } from 'react';
import { Send, Clock, Calendar, CalendarDays } from 'lucide-react';
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

function getRefDate(post: Post): Date {
  return new Date(post.publishedAt || post.scheduledAt || post.createdAt);
}

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Retorna o bucket: negativo = futuro, 1..4 = semanas passadas, 5 = mais antigo */
function getBucket(dateStr: string): number {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 0;   // futuro
  if (diffDays < 7) return 1;
  if (diffDays < 14) return 2;
  if (diffDays < 21) return 3;
  return 4;
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

  const filtered = posts
    .filter(p => {
      const platOk = filterPlatform === 'all' || p.platform === filterPlatform;
      const statOk = filterStatus === 'all' || p.status === filterStatus;
      return platOk && statOk;
    })
    // Ordenar globalmente: mais recente primeiro
    .sort((a, b) => getRefDate(b).getTime() - getRefDate(a).getTime());

  // Agrupar: bucket 0 = próximas semanas (agendados futuros), 1..4 = passado
  const buckets: Record<number, Post[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  filtered.forEach(p => {
    const ref = p.publishedAt || p.scheduledAt || p.createdAt;
    const b = getBucket(ref);
    buckets[b].push(p);
  });

  // Bucket 0 (futuro) ordena crescente (mais próximo primeiro)
  buckets[0].sort((a, b) => getRefDate(a).getTime() - getRefDate(b).getTime());

  const bucketConfig = [
    { key: 0, label: 'Proximas publicacoes', icon: '📅', color: 'border-blue-800 bg-blue-900/10', future: true },
    { key: 1, label: 'Semana atual', icon: '📆', color: 'border-gray-700 bg-gray-900', future: false },
    { key: 2, label: 'Semana passada', icon: '🗓️', color: 'border-gray-700 bg-gray-900', future: false },
    { key: 3, label: 'Ha 2 semanas', icon: '🗓️', color: 'border-gray-700 bg-gray-900', future: false },
    { key: 4, label: 'Ha 3+ semanas', icon: '🗓️', color: 'border-gray-700 bg-gray-900', future: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-gray-400 text-sm">Historico e agendamentos — do mais recente ao mais antigo</p>
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

      {bucketConfig.map(({ key, label, icon, color, future }) => {
        const bPosts = buckets[key];
        if (bPosts.length === 0) return null;
        return (
          <div key={key} className={`border rounded-xl p-6 ${color}`}>
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CalendarDays size={16} className={future ? 'text-blue-400' : 'text-gray-400'} />
              <span>{icon} {label}</span>
              <span className="ml-auto text-xs text-gray-500">{bPosts.length} post{bPosts.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bPosts.map(post => {
                const ref = post.publishedAt || post.scheduledAt || post.createdAt;
                const isPublished = post.status === 'published';
                const isScheduled = post.status === 'scheduled';
                return (
                  <div key={post.id}
                    className={`rounded-xl border p-4 space-y-2 ${isPublished ? 'border-green-800 bg-green-900/10' : isScheduled ? 'border-yellow-800 bg-yellow-900/10' : 'border-gray-700 bg-gray-800'}`}>
                    {/* Header: plataforma + status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>
                        {post.platform === 'linkedin' ? '💼 LinkedIn' : '📘 Facebook'}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${isPublished ? 'text-green-400' : isScheduled ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {isPublished ? <><Send size={10} /> Publicado</> : isScheduled ? <><Clock size={10} /> Agendado</> : 'Rascunho'}
                      </span>
                    </div>

                    {/* Data e horário */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={11} className={isPublished ? 'text-green-500' : isScheduled ? 'text-yellow-500' : 'text-gray-600'} />
                      <span className="font-medium">{fmtDateTime(ref)}</span>
                    </div>

                    {/* Mostrar separadamente: criado em vs publicado/agendado */}
                    {post.publishedAt && post.publishedAt !== post.createdAt && (
                      <p className="text-gray-600 text-xs">Criado: {fmtTime(post.createdAt)} • {new Date(post.createdAt).toLocaleDateString('pt-BR')}</p>
                    )}
                    {post.scheduledAt && !post.publishedAt && post.scheduledAt !== post.createdAt && (
                      <p className="text-gray-600 text-xs">Gerado: {fmtTime(post.createdAt)} • {new Date(post.createdAt).toLocaleDateString('pt-BR')}</p>
                    )}

                    {/* Conteúdo */}
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
