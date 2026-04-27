import { useState, useEffect } from 'react';
import {
  Sparkles, Calendar, Clock, Trash2, Copy, Check, Send, Save,
  RefreshCw, Newspaper, Linkedin, X, ChevronRight, Loader2
} from 'lucide-react';
import api from '../services/api';

interface Suggestion {
  id: string;
  headline: string;
  url: string;
  source: string;
  snippet?: string;
  publishedAt: string;
}

interface GeneratedContent {
  id: string;
  text: string;
  hashtags: string[];
  readTime: number;
  template: string;
}

interface ScheduledItem {
  id: string;
  content: string;
  source: string;
  headline: string;
  publishAt: string;
  recurrence: string;
  platform: string;
  status: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

export default function ContentGenerator() {
  const [activeTab, setActiveTab] = useState<'google' | 'linkedin'>('google');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, GeneratedContent>>({});
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  
  // Modal de agendamento
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContentId, setScheduleContentId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleRecurrence, setScheduleRecurrence] = useState<'none' | 'daily'>('none');
  const [scheduling, setScheduling] = useState(false);

  // Carregar sugestões
  const loadSuggestions = async (source: 'google' | 'linkedin') => {
    setLoadingSuggestions(true);
    try {
      const { data } = await api.get(`/content-generator/suggestions?source=${source}`);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Erro ao carregar sugestões:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Carregar agendamentos
  const loadScheduled = async () => {
    setLoadingScheduled(true);
    try {
      const { data } = await api.get('/content-generator/scheduled');
      setScheduled(data || []);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoadingScheduled(false);
    }
  };

  useEffect(() => {
    loadSuggestions(activeTab);
    loadScheduled();
  }, [activeTab]);

  // Gerar conteúdo
  const handleGenerate = async (suggestion: Suggestion) => {
    setGeneratingId(suggestion.id);
    try {
      const { data } = await api.post('/content/generate', {
        suggestionId: suggestion.id,
        source: activeTab,
        template: 'post',
      });
      setGenerated(prev => ({ ...prev, [suggestion.id]: data }));
    } catch (err: any) {
      alert('Erro ao gerar: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingId(null);
    }
  };

  // Abrir modal de agendamento
  const openScheduleModal = (contentId: string) => {
    setScheduleContentId(contentId);
    // Default: amanhã às 8h
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    setScheduleDate(tomorrow.toISOString().slice(0, 16));
    setScheduleRecurrence('none');
    setShowScheduleModal(true);
  };

  // Confirmar agendamento
  const confirmSchedule = async () => {
    if (!scheduleContentId || !scheduleDate) return;
    setScheduling(true);
    try {
      await api.post('/content-generator/schedule', {
        contentId: scheduleContentId,
        publishAt: scheduleDate,
        recurrence: scheduleRecurrence,
        platform: 'linkedin',
      });
      setShowScheduleModal(false);
      loadScheduled();
      alert('Agendado com sucesso!');
    } catch (err: any) {
      alert('Erro ao agendar: ' + (err.response?.data?.error || err.message));
    } finally {
      setScheduling(false);
    }
  };

  // Cancelar agendamento
  const cancelSchedule = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await api.delete(`/content-generator/scheduled/${id}`);
      loadScheduled();
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.error || err.message));
    }
  };

  // Copiar texto
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Sparkles className="text-yellow-400" /> Gerador de Conteúdo Inteligente
      </h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            activeTab === 'google' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Newspaper size={16} /> Google Trends
        </button>
        <button
          onClick={() => setActiveTab('linkedin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            activeTab === 'linkedin' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Linkedin size={16} /> LinkedIn Notícias
        </button>
      </div>

      {/* Lista de sugestões */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Tendências de {activeTab === 'google' ? 'Ontem' : 'LinkedIn'}
          </h2>
          <button
            onClick={() => loadSuggestions(activeTab)}
            disabled={loadingSuggestions}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
          >
            <RefreshCw size={14} className={loadingSuggestions ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma tendência encontrada para ontem.</p>
        ) : (
          suggestions.map((s) => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-white">{s.headline}</h3>
                  <p className="text-sm text-gray-400 mt-1">{s.snippet?.substring(0, 200)}...</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>Fonte: {s.source}</span>
                    <span>·</span>
                    <span>{fmtDate(s.publishedAt)}</span>
                  </div>
                </div>
                
                {!generated[s.id] && (
                  <button
                    onClick={() => handleGenerate(s)}
                    disabled={generatingId === s.id}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    {generatingId === s.id ? (
                      <><Loader2 size={14} className="animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles size={14} /> Gerar post</>
                    )}
                  </button>
                )}
              </div>

              {/* Conteúdo gerado */}
              {generated[s.id] && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <textarea
                    value={generated[s.id].text}
                    onChange={(e) => setGenerated(prev => ({
                      ...prev,
                      [s.id]: { ...prev[s.id], text: e.target.value }
                    }))}
                    className="w-full bg-transparent text-gray-200 text-sm resize-none outline-none"
                    rows={6}
                  />
                  
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    {(Array.isArray(generated[s.id].hashtags)
                      ? generated[s.id].hashtags
                      : ((generated[s.id].hashtags as unknown) as string).split(' ')
                    ).map((h: string, i: number) => <span key={i}>{h}</span>)}
                    <span className="text-gray-500">· {generated[s.id].readTime} min de leitura</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyText(generated[s.id].text + '\n\n' + (typeof generated[s.id].hashtags === 'string' ? generated[s.id].hashtags : generated[s.id].hashtags.join(' ')))}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                    >
                      <Copy size={12} /> Copiar
                    </button>
                    
                    <button
                      onClick={() => openScheduleModal(generated[s.id].id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                    >
                      <Calendar size={12} /> Agendar
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          // Primeiro salva o post no banco
                          const postToSave = generated[s.id];
                          console.log('Salvando post:', postToSave);
                          const { data: savedPost } = await api.post('/content/posts', {
                            platform: 'linkedin',
                            content: postToSave.text,
                            hashtags: postToSave.hashtags.join(' '),
                            status: 'draft',
                          });
                          console.log('Post salvo:', savedPost);
                          // Depois publica usando o ID real
                          await api.post('/content/publish', { postId: savedPost.id });
                          alert('Post publicado com sucesso!');
                        } catch (e: any) {
                          console.error('Erro ao publicar:', e);
                          alert(e.response?.data?.error || 'Erro ao publicar');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    >
                      <Send size={12} /> Postar agora
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Agendamentos ativos */}
      <div className="bg-gray-900 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock size={18} /> Agendamentos Ativos
          </h2>
          <button
            onClick={loadScheduled}
            disabled={loadingScheduled}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ↻ Atualizar
          </button>
        </div>

        {loadingScheduled ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : scheduled.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum agendamento ativo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2">Conteúdo</th>
                  <th className="text-left py-2">Fonte</th>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Recorrência</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {scheduled.map((s) => (
                  <tr key={s.id} className="border-b border-gray-800/50">
                    <td className="py-3 max-w-xs truncate">{s.content}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        s.source === 'google' ? 'bg-blue-900/50 text-blue-400' : 'bg-indigo-900/50 text-indigo-400'
                      }`}>
                        {s.source}
                      </span>
                    </td>
                    <td className="py-3">{fmtDate(s.publishAt)}</td>
                    <td className="py-3">
                      {s.recurrence === 'daily' ? (
                        <span className="text-yellow-400">📅 Todo dia</span>
                      ) : (
                        'Única'
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        s.status === 'scheduled' ? 'bg-purple-900/50 text-purple-400' :
                        s.status === 'published' ? 'bg-green-900/50 text-green-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => cancelSchedule(s.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Cancelar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Agendamento */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Agendar Publicação</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Data e hora</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurrence"
                checked={scheduleRecurrence === 'daily'}
                onChange={(e) => setScheduleRecurrence(e.target.checked ? 'daily' : 'none')}
                className="w-4 h-4 rounded border-gray-600"
              />
              <label htmlFor="recurrence" className="text-sm text-gray-300">
                Repetir diariamente
              </label>
            </div>

            {scheduleRecurrence === 'daily' && scheduleDate && (
              <p className="text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded-lg">
                📅 Publicará todo dia às {new Date(scheduleDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
              </p>
            )}

            <button
              onClick={confirmSchedule}
              disabled={scheduling || !scheduleDate}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
            >
              {scheduling ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              {scheduling ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
