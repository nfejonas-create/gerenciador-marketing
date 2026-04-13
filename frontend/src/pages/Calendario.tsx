import { useState, useEffect } from 'react';
import { Send, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function Calendario() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get('/content/posts')
      .then(r => {
        const sorted = [...r.data].sort((a: Post, b: Post) => {
          const order = (p: Post) => p.status === 'scheduled' ? 0 : p.status === 'published' ? 1 : 2;
          if (order(a) !== order(b)) return order(a) - order(b);
          if (a.status === 'scheduled')
            return new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime();
          if (a.status === 'published')
            return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
          return 0;
        });
        setPosts(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p => {
    const platOk = filterPlatform === 'all' || p.platform === filterPlatform;
    const statOk = filterStatus === 'all' || p.status === filterStatus;
    return platOk && statOk;
  });

  const scheduled = filtered.filter(p => p.status === 'scheduled');
  const published  = filtered.filter(p => p.status === 'published');
  const drafts     = filtered.filter(p => p.status === 'draft');

  function PostCard({ post }: { post: Post }) {
    const isOpen = expanded[post.id];
    return (
      <div className={`rounded-xl border p-4 space-y-2 ${
        post.status === 'published' ? 'border-green-800 bg-green-900/10' :
        post.status === 'scheduled' ? 'border-yellow-800 bg-yellow-900/10' :
        'border-gray-700 bg-gray-800'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>
            {post.platform === 'linkedin' ? '💼 LinkedIn' : '📘 Facebook'}
          </span>
          <span className={`text-xs flex items-center gap-1 font-medium ${post.status === 'published' ? 'text-green-400' : post.status === 'scheduled' ? 'text-yellow-400' : 'text-gray-500'}`}>
            {post.status === 'published' ? <><Send size={10} /> Publicado</> : post.status === 'scheduled' ? <><Clock size={10} /> Agendado</> : 'Rascunho'}
          </span>
        </div>

        {post.status === 'scheduled' && post.scheduledAt && (
          <p className="text-yellow-300 text-xs font-semibold flex items-center gap-1">
            <Clock size={11} /> {formatDateTime(post.scheduledAt)}
          </p>
        )}
        {post.status === 'published' && post.publishedAt && (
          <p className="text-green-300 text-xs font-semibold flex items-center gap-1">
            <Send size={11} /> {formatDateTime(post.publishedAt)}
          </p>
        )}

        <div className={`transition-all ${isOpen ? 'max-h-96 overflow-y-auto' : 'max-h-16 overflow-hidden'}`}>
          <p className="text-gray-200 text-sm whitespace-pre-wrap">{post.content}</p>
        </div>
        <button onClick={() => setExpanded(prev => ({ ...prev, [post.id]: !isOpen }))}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
          {isOpen ? <><ChevronUp size={12} /> Recolher</> : <><ChevronDown size={12} /> Ver completo</>}
        </button>

        {post.cta && <p className="text-blue-400 text-xs border-t border-gray-700 pt-2">{post.cta}</p>}
        {post.hashtags && <p className="text-gray-600 text-xs">{post.hashtags}</p>}
      </div>
    );
  }

  function Section({ title, items, color }: { title: string; items: Post[]; color: string }) {
    if (items.length === 0) return null;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className={`font-semibold mb-4 flex items-center gap-2 ${color}`}>
          <Calendar size={16} /> {title}
          <span className="ml-auto text-xs text-gray-600 font-normal">{items.length} post{items.length !== 1 ? 's' : ''}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendário</h1>
          <p className="text-gray-400 text-sm">Agendados: mais próximo primeiro · Publicados: mais recente primeiro</p>
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
            <option value="scheduled">Agendados</option>
            <option value="published">Publicados</option>
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
        </div>
      )}

      <Section title="📅 Agendados — do mais próximo ao mais distante" items={scheduled} color="text-yellow-400" />
      <Section title="✅ Publicados — do mais recente ao mais antigo"   items={published}  color="text-green-400" />
      <Section title="📝 Rascunhos" items={drafts} color="text-gray-400" />
    </div>
  );
}
