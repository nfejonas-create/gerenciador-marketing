import { useState, useEffect } from 'react';
import {
  Sparkles, Save, Send, Calendar, Copy, Check, Trash2,
  Eye, CheckCircle, Clock, X, ChevronLeft, ChevronRight, FileDown
} from 'lucide-react';
import api from '../services/api';
import CarouselEditor from '../components/CarouselEditor';
import { Slide } from '../components/CarouselEditor';

interface Carousel {
  id: string;
  title: string;
  slides: Slide[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Preview modal de um carrossel completo ──────────────────────────────────
function ViewModal({ carousel, onClose }: { carousel: Carousel; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const slides = carousel.slides || [];

  const styleClasses: Record<string, string> = {
    cover: 'bg-gradient-to-br from-purple-600 to-purple-900',
    content: 'bg-gray-800',
    cta: 'bg-gradient-to-br from-blue-600 to-blue-800',
  };

  const fontSizeClass: Record<string, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
  const textAlignClass: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">{carousel.title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Slide preview */}
        {slide && (
          <div className={`w-full aspect-square rounded-xl overflow-hidden ${styleClasses[slide.style] || 'bg-gray-800'} relative max-w-sm mx-auto`}>
            <div className={`absolute inset-0 flex flex-col p-6 ${textAlignClass[slide.textAlign || (slide.style === 'cover' ? 'center' : 'left')]}`}>
              <div className="text-5xl mb-3">{slide.emoji}</div>
              <h3 className="font-bold mb-3 text-xl">{slide.title}</h3>
              <p className={`flex-1 ${fontSizeClass[slide.fontSize || 'md']}`}>{slide.body}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-700"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${
                  i === current ? 'w-4 h-2 bg-purple-400' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-gray-400">{current + 1} / {slides.length}</span>

          <button
            onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))}
            disabled={current === slides.length - 1}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Slide list mini */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-purple-500' : 'border-gray-700 opacity-60 hover:opacity-100'
              } ${styleClasses[s.style] || 'bg-gray-800'} flex flex-col items-center justify-center`}
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="text-[9px] text-white/70 px-0.5 truncate w-full text-center">{i + 1}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition">
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Carrossel() {
  const [tab, setTab] = useState<'generate' | 'history'>('generate');

  // Geração
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [title, setTitle] = useState('');

  // Salvamento/Publicação
  const [saving, setSaving] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Histórico
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewModal, setViewModal] = useState<Carousel | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/content/carousels');
      setCarousels(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Por favor, digite um tema para o carrossel');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post('/content/generate-carousel', {
        topic,
        count,
        platform: 'linkedin',
      });
      const slidesWithIds = (data.slides || []).map((s: Slide, i: number) => ({
        ...s,
        id: s.id || `slide_${i + 1}_${Date.now()}_${i}`,
      }));
      setSlides(slidesWithIds);
      setTitle(`Carrossel: ${topic}`);
    } catch (err) {
      console.error('Erro ao gerar carrossel:', err);
      alert('Erro ao gerar carrossel. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled' = 'draft') => {
    if (!title.trim() || slides.length === 0) {
      alert('Título ou slides vazios');
      return;
    }
    setSaving(true);
    try {
      await api.post('/content/carousels', {
        title,
        slides,
        status,
        scheduledAt: status === 'scheduled' && scheduleDate ? scheduleDate : null,
      });
      alert(status === 'scheduled' ? 'Carrossel agendado!' : 'Carrossel salvo como rascunho!');
      setSlides([]);
      setTopic('');
      setTitle('');
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || slides.length === 0) {
      alert('Título ou slides vazios');
      return;
    }
    setPublishing(true);
    try {
      const { data: saved } = await api.post('/content/carousels', {
        title,
        slides,
        status: 'draft',
      });
      const pubResponse = await api.post(`/content/carousels/${saved.id}/publish`);
      if (pubResponse.data.linkedInPostUrn) {
        alert('Carrossel publicado! ID: ' + pubResponse.data.linkedInPostUrn);
      } else {
        alert('Publicação enviada (sem ID retornado — verifique o LinkedIn).');
      }
      setSlides([]);
      setTopic('');
      setTitle('');
    } catch (err: any) {
      alert('Erro ao publicar: ' + (err.response?.data?.error || err.message));
    } finally {
      setPublishing(false);
    }
  };

  // ── Histórico: ações ────────────────────────────────────────────────────────
  const copyCarouselText = (c: Carousel) => {
    const txt = (c.slides || []).map((s, i) =>
      `Slide ${i + 1}: ${s.emoji} ${s.title}\n${s.body}`
    ).join('\n\n');
    navigator.clipboard.writeText(txt);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteCarousel = async (c: Carousel) => {
    if (!confirm(`Deletar "${c.title}"?`)) return;
    setDeletingId(c.id);
    try {
      await api.delete(`/content/carousels/${c.id}`);
      setCarousels(prev => prev.filter(x => x.id !== c.id));
    } catch (err: any) {
      alert('Erro ao deletar: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const markAsPosted = async (c: Carousel) => {
    if (!confirm(`Marcar "${c.title}" como postado agora?`)) return;
    setMarkingId(c.id);
    try {
      const { data } = await api.patch(`/content/carousels/${c.id}`, {
        status: 'published',
        publishedAt: new Date().toISOString(),
      });
      setCarousels(prev => prev.map(x => x.id === c.id ? { ...x, ...data } : x));
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.error || err.message));
    } finally {
      setMarkingId(null);
    }
  };

  const downloadPdf = async (c: Carousel) => {
    setDownloadingId(c.id);
    try {
      const response = await api.get(`/content/carousels/${c.id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${c.title.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'carrossel'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erro ao baixar PDF: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const generateSlideImage = async (slideIndex: number): Promise<string> => {
    const slide = slides[slideIndex];
    const { data } = await api.post('/content/generate-image', {
      prompt: `Imagem profissional para LinkedIn sobre: ${slide.title}. ${slide.body}. Estilo moderno, corporativo.`,
    });
    return data.imageUrl;
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Modal */}
      {viewModal && <ViewModal carousel={viewModal} onClose={() => setViewModal(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Carrossel</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Gerar
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* ── ABA GERAR ── */}
      {tab === 'generate' && (
        <div className="space-y-6">
          {!slides.length ? (
            <div className="bg-gray-900 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tema do carrossel</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder="Ex: 5 erros na gestão de RH"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Quantidade de slides: <span className="text-white font-semibold">{count}</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>3</span><span>10</span>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || generating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium"
              >
                <Sparkles size={18} />
                {generating ? 'Gerando...' : 'Gerar Carrossel com IA'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl p-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold text-white border-b border-gray-700 pb-2 outline-none"
                  placeholder="Título do carrossel"
                />
              </div>

              <CarouselEditor
                slides={slides}
                onChange={setSlides}
                onGenerateImage={generateSlideImage}
              />

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Rascunho'}
                </button>

                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Send size={16} />
                  {publishing ? 'Publicando...' : 'Publicar Agora'}
                </button>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Calendar size={14} /> Agendar para depois:
                </p>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
                <button
                  onClick={() => handleSave('scheduled')}
                  disabled={!scheduleDate || saving}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg"
                >
                  <Calendar size={16} />
                  Agendar Publicação
                </button>
              </div>

              <button
                onClick={() => { setSlides([]); setTopic(''); setTitle(''); }}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                ← Voltar e criar novo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{carousels.length} carrossel{carousels.length !== 1 ? 'is' : ''} salvo{carousels.length !== 1 ? 's' : ''}</p>
            <button onClick={loadHistory} className="text-xs text-gray-500 hover:text-gray-300 transition">
              ↻ Atualizar
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : carousels.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhum carrossel salvo ainda.</p>
          ) : (
            carousels.map((c) => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{c.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {c.slides?.length || 0} slide{(c.slides?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                    c.status === 'published' ? 'bg-green-900/60 text-green-400' :
                    c.status === 'scheduled' ? 'bg-purple-900/60 text-purple-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {c.status === 'published' ? '✓ Publicado' : c.status === 'scheduled' ? '⏱ Agendado' : 'Rascunho'}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Criado: {fmtDate(c.createdAt)}
                  </span>
                  {c.scheduledAt && c.status === 'scheduled' && (
                    <span className="flex items-center gap-1 text-purple-400">
                      <Calendar size={10} /> Agendado: {fmtDate(c.scheduledAt)}
                    </span>
                  )}
                  {c.publishedAt && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle size={10} /> Postado: {fmtDate(c.publishedAt)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Visualizar */}
                  <button
                    onClick={() => setViewModal(c)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
                  >
                    <Eye size={12} /> Ver
                  </button>

                  {/* Copiar */}
                  <button
                    onClick={() => copyCarouselText(c)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition ${
                      copiedId === c.id ? 'bg-green-700 text-green-200' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {copiedId === c.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === c.id ? 'Copiado!' : 'Copiar'}
                  </button>

                  {/* Baixar PDF */}
                  <button
                    onClick={() => downloadPdf(c)}
                    disabled={downloadingId === c.id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/50 text-blue-400 rounded-lg transition disabled:opacity-50"
                    title="Baixar como PDF para upload manual no LinkedIn"
                  >
                    <FileDown size={12} />
                    {downloadingId === c.id ? 'Gerando...' : 'Baixar PDF'}
                  </button>

                  {/* Marcar como postado */}
                  {c.status !== 'published' && (
                    <button
                      onClick={() => markAsPosted(c)}
                      disabled={markingId === c.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-700/40 hover:bg-green-700/60 text-green-400 rounded-lg transition disabled:opacity-50"
                    >
                      <CheckCircle size={12} />
                      {markingId === c.id ? 'Marcando...' : 'Marcar postado'}
                    </button>
                  )}

                  {/* Deletar */}
                  <button
                    onClick={() => deleteCarousel(c)}
                    disabled={deletingId === c.id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition disabled:opacity-50 ml-auto"
                  >
                    <Trash2 size={12} />
                    {deletingId === c.id ? 'Deletando...' : 'Deletar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
