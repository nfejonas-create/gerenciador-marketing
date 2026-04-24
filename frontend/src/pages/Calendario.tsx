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

// Retorna chave única do dia: "2026-04-22"
function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

// Label do cabeçalho do grupo: "Ter., 22/04/2026"
function fmtDayHeader(dayKey: string): string {
  return new Date(dayKey + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// Retorna label relativo: Hoje, Ontem, Amanha, ou data formatada
function getDayRelativeLabel(dayKey: string): string {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  
  if (dayKey === todayKey) return 'Hoje';
  if (dayKey === yesterdayKey) return 'Ontem';
  if (dayKey === tomorrowKey) return 'Amanha';
  return fmtDayHeader(dayKey);
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

  // 1. Ordenar todos os posts: mais recente primeiro
  const sorted = [...filtered].sort((a, b) =>
    getRefDate(b).getTime() - getRefDate(a).getTime()
  );

  // 2. Agrupar por dia
  const byDay = new Map<string, Post[]>();
  sorted.forEach(p => {
    const ref = p.publishedAt || p.scheduledAt || p.createdAt;
    const key = getDayKey(ref);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  });

  // 3. Dentro de cada dia, ordenar por horário crescente
  byDay.forEach(dayPosts => dayPosts.sort((a, b) =>
    getRefDate(a).getTime() - getRefDate(b).getTime()
  ));

  // 4. Dias ordenados do mais recente ao mais antigo
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-gray-400 text-sm">Posts por dia — do mais recente ao mais antigo</p>
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

      {days.map(dayKey => {
        const dayPosts = byDay.get(dayKey)!;
        const label = getDayRelativeLabel(dayKey);
        const isToday = label === 'Hoje';
        const isFuture = new Date(dayKey) > new Date();
        
        return (
          <div key={dayKey} className={`border rounded-xl p-6 ${isToday ? 'border-blue-700 bg-blue-900/10' : isFuture ? 'border-purple-700 bg-purple-900/10' : 'border-gray-700 bg-gray-900'}`}>
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CalendarDays size={16} className={isToday ? 'text-blue-400' : isFuture ? 'text-purple-400' : 'text-gray-400'} />
              <span>📅 {label}</span>
              <span className="text-xs text-gray-500 ml-2">{fmtDayHeader(dayKey)}</span>
              <span className="ml-auto text-xs text-gray-600">{dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dayPosts.map(post => {
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
