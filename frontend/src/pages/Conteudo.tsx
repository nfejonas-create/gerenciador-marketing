// Force Vercel rebuild v3 - Netlify fix
import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Save, Clock, CheckCircle, Upload, FileText, Image as ImageIcon,
  X, Send, Calendar, ChevronDown, Package, Zap, BookOpen, Star, Target,
  MessageSquare, Copy, CalendarDays, PlusCircle, LayoutList
} from 'lucide-react';
import api from '../services/api';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TONES = [
  { value: 'tecnico', label: 'Tecnico', icon: BookOpen, desc: 'Preciso e detalhado' },
  { value: 'curiosidade', label: 'Curiosidade', icon: Zap, desc: 'Provoca reflexao' },
  { value: 'autoridade', label: 'Autoridade', icon: Star, desc: 'Posiciona como especialista' },
  { value: 'direto', label: 'Direto', icon: Target, desc: 'Objetivo e pratico' },
  { value: 'inspiracional', label: 'Inspiracional', icon: MessageSquare, desc: 'Motiva e engaja' },
];

interface Product { id: string; name: string; url?: string; type?: string; price?: number; }
interface SavedPost { id: string; platform: string; status: string; content: string; cta?: string; hashtags?: string; scheduledAt?: string; imageUrl?: string; }

export default function Conteudo() {
  const [tab, setTab] = useState<'generate' | 'upload' | 'analyze' | 'posts'>('generate');

  // Gerar post
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [tone, setTone] = useState('tecnico');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState('realista');
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Upload de material
  const [file, setFile] = useState<File | null>(null);
  const [uploadPlatform, setUploadPlatform] = useState('linkedin');
  const [uploadTone, setUploadTone] = useState('tecnico');
  const [quantity, setQuantity] = useState('5');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analisar
  const [analyzeText, setAnalyzeText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);

  // Posts salvos
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishModal, setPublishModal] = useState<{ post: SavedPost } | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Filtros de posts
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Agendamento em lote (per-post datetime)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSelected, setBatchSelected] = useState<string[]>([]);
  const [batchSchedules, setBatchSchedules] = useState<Record<string, string>>({});
  const [schedulingBatch, setSchedulingBatch] = useState(false);
  const [recurringBase, setRecurringBase] = useState(''); // data/hora base para recorrente
  const [recurringTime, setRecurringTime] = useState('08:00'); // horario fixo

  // Importar post pronto
  const [importContent, setImportContent] = useState('');
  const [importCta, setImportCta] = useState('');
  const [importHashtags, setImportHashtags] = useState('');
  const [importPlatform, setImportPlatform] = useState('linkedin');
  const [savingImport, setSavingImport] = useState(false);

  // Gerador semanal
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyTopic, setWeeklyTopic] = useState('');
  const [weeklyPlatform, setWeeklyPlatform] = useState('linkedin');
  const [weeklyPosts, setWeeklyPosts] = useState<any[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<Record<number, string>>({});
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklyStep, setWeeklyStep] = useState<'config' | 'review'>('config');

  useEffect(() => {
    loadProducts();
    if (tab === 'posts') loadPosts();
  }, [tab]);

  async function loadProducts() {
    try { const { data } = await api.get('/funnel/products'); setProducts(data); } catch {}
  }

  async function loadPosts() {
    try {
      const { data } = await api.get('/content/posts');
      // Ordenar: agendados por data (mais próximo primeiro), depois rascunhos, depois publicados
      const sorted = [...data].sort((a: SavedPost, b: SavedPost) => {
        const order = (p: SavedPost) => p.status === 'scheduled' ? 0 : p.status === 'draft' ? 1 : 2;
        if (order(a) !== order(b)) return order(a) - order(b);
        if (a.status === 'scheduled' && b.status === 'scheduled') {
          return new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime();
        }
        return new Date(b.scheduledAt || 0).getTime() - new Date(a.scheduledAt || 0).getTime();
      });
      setPosts(sorted);
    } catch {}
  }

  // Aplica agendamento recorrente: distribui selecionados dia a dia a partir da base
  function applyRecurring() {
    if (!recurringBase) return;
    const base = new Date(recurringBase);
    const updated: Record<string, string> = { ...batchSchedules };
    batchSelected.forEach((id, idx) => {
      const d = new Date(base);
      d.setDate(d.getDate() + idx);
      updated[id] = d.toISOString().slice(0, 16); // formato datetime-local
    });
    setBatchSchedules(updated);
  }

  async function generate() {
    setLoadingGen(true); setGenerated(null); setGeneratedImage(null); setImageError(null); setImagePrompt(null); setSavedPostId(null);
    try {
      const toneLabel = TONES.find(t => t.value === tone)?.label || tone;
      const productStr = selectedProduct ? `${selectedProduct.name}${selectedProduct.url ? ' (link: ' + selectedProduct.url + ')' : ''}` : '';
      const { data } = await api.post('/content/generate', { topic, platform, tone: toneLabel, product: productStr });
      setGenerated(data);
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao gerar post'); }
    finally { setLoadingGen(false); }
  }

  const IMAGE_STYLES = [
    { value: 'realista', label: 'Realista', desc: 'Foto profissional' },
    { value: 'ilustrativo', label: 'Ilustrativo', desc: 'Arte digital' },
    { value: 'criativo', label: 'Criativo', desc: 'Conceitual/abstrato' },
    { value: 'post', label: 'Post feed', desc: '1:1 quadrado' },
    { value: 'story', label: 'Story/Reels', desc: '9:16 vertical' },
  ];

  function buildImagePrompt(style: string): string {
    const subject = `professional Brazilian business scene related to this post topic: ${(topic || generated?.content || '').substring(0, 220)}`;
    const styleMap: Record<string, string> = {
      realista: `Photorealistic professional photography, Canon DSLR, natural lighting, shallow depth of field. ${subject}. Real photograph look, no illustration. Suitable for LinkedIn post.`,
      ilustrativo: `Digital illustration, technical drawing style, clean lines, dark blue and orange palette. ${subject}. No real photograph.`,
      criativo: `Creative conceptual photography with dramatic lighting, orange and electric blue accent colors, cinematic look. ${subject}. High contrast, editorial style.`,
      post: `Square 1:1 format social media photo, centered composition. ${subject}. Clean background, real photograph.`,
      story: `Vertical 9:16 format, bold composition with empty space at top for text overlay. ${subject}. Real photograph style.`,
    };
    return `${styleMap[style]} No watermark, no text overlay, no logos. High quality, photorealistic, suitable for social media marketing.`;
  }

  function generateImagePrompt(style: string) {
    setImageStyle(style);
    const p = buildImagePrompt(style);
    setImagePrompt(p);
    setPromptCopied(false);
  }

  async function copyPrompt() {
    if (!imagePrompt) return;
    await navigator.clipboard.writeText(imagePrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  async function savePost(postData: any, plt: string, imageUrl?: string | null) {
    try {
      const { data } = await api.post('/content/posts', {
        platform: plt,
        content: postData.content,
        cta: postData.cta,
        hashtags: Array.isArray(postData.hashtags) ? postData.hashtags.join(' ') : postData.hashtags,
        status: 'draft',
        imageUrl: imageUrl || null,
      });
      setSavedPostId(data.id);
      setShowPublishModal(true);
    } catch { alert('Erro ao salvar'); }
  }

  async function publishPost(postId: string, scheduledAt?: string) {
    setPublishing(postId);
    try {
      if (scheduledAt) {
        await api.patch(`/content/posts/${postId}`, { status: 'scheduled', scheduledAt });
        alert('Post agendado com sucesso!');
      } else {
        await api.post('/content/publish', { postId });
        alert('Post publicado com sucesso!');
      }
      setShowPublishModal(false);
      setPublishModal(null);
      setScheduleDate('');
      setSavedPostId(null);
      loadPosts();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao publicar'); }
    finally { setPublishing(null); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setUploadResult(null); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoadingUpload(true); setUploadResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('platform', uploadPlatform);
      form.append('tone', TONES.find(t => t.value === uploadTone)?.label || uploadTone);
      form.append('quantity', quantity);
      const { data } = await api.post('/content/upload-material', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(data);
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao processar arquivo'); }
    finally { setLoadingUpload(false); }
  }

  async function analyze() {
    setLoadingAnalyze(true); setAnalysis(null);
    try { const { data } = await api.post('/content/analyze', { content: analyzeText }); setAnalysis(data); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro ao analisar'); }
    finally { setLoadingAnalyze(false); }
  }

  async function copyPostContent(post: SavedPost) {
    const parts = [post.content, post.cta, post.hashtags].filter(Boolean);
    await navigator.clipboard.writeText(parts.join('\n\n'));
    setCopiedPostId(post.id);
    setTimeout(() => setCopiedPostId(null), 2000);
  }

  async function confirmBatchSchedule() {
    const items = batchSelected
      .map(postId => ({ postId, scheduledAt: batchSchedules[postId] }))
      .filter(item => item.scheduledAt);
    if (items.length === 0) return alert('Defina data e hora para pelo menos um post selecionado');
    setSchedulingBatch(true);
    try {
      await api.post('/content/posts/schedule-batch', { items });
      alert(`${items.length} post(s) agendado(s) com sucesso!`);
      setShowBatchModal(false);
      setBatchSelected([]);
      setBatchSchedules({});
      loadPosts();
    } catch (e: any) { alert(e.response?.data?.error || 'Erro ao agendar em lote'); }
    finally { setSchedulingBatch(false); }
  }

  async function saveImportedPost() {
    if (!importContent.trim()) return alert('Digite o conteudo do post');
    setSavingImport(true);
    try {
      await api.post('/content/posts', {
        platform: importPlatform,
        content: importContent,
        cta: importCta || null,
        hashtags: importHashtags || null,
        status: 'draft',
      });
      setImportContent(''); setImportCta(''); setImportHashtags('');
      alert('Post salvo no historico!');
      if (tab === 'posts') loadPosts();
    } catch { alert('Erro ao salvar post'); }
    finally { setSavingImport(false); }
  }

  async function generateWeekly() {
    if (!weeklyTopic.trim()) return alert('Digite o tema da semana');
    setLoadingWeekly(true);
    setWeeklyPosts([]);
    setWeeklySchedules({});
    try {
      const { data } = await api.post('/content/generate-week', {
        topic: weeklyTopic,
        platform: weeklyPlatform,
      });
      if (!data.posts || data.posts.length === 0) {
        alert('Nenhum post foi gerado. Tente novamente.');
        return;
      }
      setWeeklyPosts(data.posts);
      // Pre-preenche horários sugeridos com datas da próxima semana
      const schedules: Record<number, string> = {};
      const today = new Date();
      const dayMap: Record<string, number> = {
        'Segunda': 1, 'Terca': 2, 'Quarta': 3, 'Quinta': 4,
        'Sexta': 5, 'Sabado': 6, 'Domingo': 0,
      };
      data.posts.forEach((p: any, i: number) => {
        const targetDay = dayMap[p.day] ?? i;
        const d = new Date(today);
        const diff = (targetDay - today.getDay() + 7) % 7 || 7;
        d.setDate(today.getDate() + diff);
        const [hh, mm] = (p.suggestedTime || '08:00').split(':');
        d.setHours(parseInt(hh), parseInt(mm || '0'), 0, 0);
        const local = d.toISOString().slice(0, 16);
        schedules[i] = local;
      });
      setWeeklySchedules(schedules);
      setWeeklyStep('review');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao gerar posts semanais');
    } finally {
      setLoadingWeekly(false);
    }
  }

  async function saveWeeklyPosts() {
    if (weeklyPosts.length === 0) return;
    setSavingWeekly(true);
    try {
      const postsToSave = weeklyPosts.map((p, i) => {
        const scheduledAt = weeklySchedules[i];
        return {
          platform: weeklyPlatform,
          content: p.content,
          cta: p.cta || null,
          hashtags: Array.isArray(p.hashtags) ? p.hashtags.join(' ') : (p.hashtags || null),
          status: scheduledAt ? 'scheduled' : 'draft',
          scheduledAt: scheduledAt || null,
        };
      });

      // Salvar em lote se possível, senão um por um
      try {
        await api.post('/content/posts/batch', { posts: postsToSave });
      } catch {
        // Fallback: salvar um por um
        for (const post of postsToSave) {
          await api.post('/content/posts', post);
        }
      }

      const scheduledCount = postsToSave.filter(p => p.status === 'scheduled').length;
      const draftCount = postsToSave.length - scheduledCount;

      alert(
        `${postsToSave.length} posts salvos!\n` +
        `${scheduledCount} agendados\n` +
        `${draftCount} como rascunho`
      );

      setShowWeeklyModal(false);
      setWeeklyPosts([]);
      setWeeklyTopic('');
      setWeeklyStep('config');
      setWeeklySchedules({});
      if (tab === 'posts') loadPosts();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao salvar posts');
    } finally {
      setSavingWeekly(false);
    }
  }

  // Lógica de filtro para posts
  const filteredPosts = posts.filter(p => {
    const statusOk = filterStatus === 'all' || p.status === filterStatus;
    const platOk = filterPlatform === 'all' || p.platform === filterPlatform;
    return statusOk && platOk;
  });

  // ─── MODALS ─────────────────────────────────────────────────────────────────

  function PublishModal({ postId, onClose }: { postId: string; onClose: () => void }) {
    const [localDate, setLocalDate] = useState('');
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">Post salvo! O que fazer agora?</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>
          <button
            onClick={() => publishPost(postId)}
            disabled={publishing === postId}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
            <Send size={16} /> {publishing === postId ? 'Publicando...' : 'Publicar agora'}
          </button>
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-sm text-gray-400 flex items-center gap-2"><Calendar size={14} /> Ou agendar para:</p>
            <input type="datetime-local" value={localDate} onChange={e => setLocalDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <button onClick={() => localDate && publishPost(postId, localDate)}
              disabled={!localDate || publishing === postId}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm transition-colors">
              <Calendar size={14} /> Agendar publicacao
            </button>
          </div>
          <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
            Deixar como rascunho por enquanto
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Modal publicar apos salvar */}
      {showPublishModal && savedPostId && (
        <PublishModal postId={savedPostId} onClose={() => { setShowPublishModal(false); setSavedPostId(null); }} />
      )}

      {/* Modal publicar do historico */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {publishModal.post.status === 'scheduled' ? 'Reagenda' : 'Publicar / Agendar'}
              </h3>
              <button onClick={() => setPublishModal(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            {publishModal.post.status === 'scheduled' && publishModal.post.scheduledAt && (
              <p className="text-yellow-400 text-xs flex items-center gap-1">
                <Clock size={12} /> Agendado para: {new Date(publishModal.post.scheduledAt).toLocaleString('pt-BR')}
              </p>
            )}
            <div className="max-h-24 overflow-y-auto bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-sm">{publishModal.post.content}</p>
            </div>
            <button onClick={() => publishPost(publishModal.post.id)} disabled={publishing === publishModal.post.id}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium">
              <Send size={16} /> {publishing === publishModal.post.id ? 'Publicando...' : 'Publicar agora'}
            </button>
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-sm text-gray-400">
                {publishModal.post.status === 'scheduled' ? 'Nova data e hora:' : 'Ou agendar para:'}
              </p>
              <input type="datetime-local"
                value={scheduleDate || (publishModal.post.scheduledAt ? publishModal.post.scheduledAt.slice(0,16) : '')}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <button onClick={() => scheduleDate && publishPost(publishModal.post.id, scheduleDate)}
                disabled={!scheduleDate || publishing === publishModal.post.id}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm">
                <Calendar size={14} /> {publishModal.post.status === 'scheduled' ? 'Confirmar reagendamento' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GERADOR SEMANAL ── */}
      {showWeeklyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl space-y-5 my-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <LayoutList size={18} className="text-blue-400" />
                {weeklyStep === 'config' ? 'Gerar semana de posts' : `${weeklyPosts.length} posts gerados — revise e agende`}
              </h3>
              <button onClick={() => { setShowWeeklyModal(false); setWeeklyStep('config'); setWeeklyPosts([]); }}
                className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>

            {weeklyStep === 'config' && (
              <>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Tema da semana *</label>
                  <textarea value={weeklyTopic} onChange={e => setWeeklyTopic(e.target.value)} rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm"
                    placeholder="Ex: Instalação de inversores de frequência para bombas industriais" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Plataforma</label>
                  <select value={weeklyPlatform} onChange={e => setWeeklyPlatform(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  A IA vai gerar 7 posts com angulos diferentes (dor, dica, erro, conceito, historia, comparacao, CTA).
                  Depois voce revisa, ajusta os horarios e salva todos de uma vez.
                </p>
                <button onClick={generateWeekly} disabled={loadingWeekly || !weeklyTopic.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
                  <Sparkles size={16} />
                  {loadingWeekly ? 'Gerando 7 posts com Claude...' : 'Gerar 7 posts'}
                </button>
                {loadingWeekly && (
                  <div className="text-center py-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">Pode levar 20-40 segundos...</p>
                  </div>
                )}
              </>
            )}

            {weeklyStep === 'review' && weeklyPosts.length > 0 && (
              <>
                <p className="text-xs text-gray-500">
                  Revise cada post. Ao salvar, todos vao para o Historico como rascunho. Depois agende pelo Historico.
                </p>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {weeklyPosts.map((p: any, i: number) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">
                          {p.day}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded capitalize">
                          {p.angle}
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-2">
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{p.content}</p>
                      </div>
                      {p.cta && <p className="text-blue-400 text-xs">CTA: {p.cta}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setWeeklyStep('config'); setWeeklyPosts([]); }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-xl text-sm transition-colors">
                    Voltar e regerar
                  </button>
                  <button onClick={saveWeeklyPosts} disabled={savingWeekly}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
                    <Save size={14} />
                    {savingWeekly ? 'Salvando...' : `Salvar ${weeklyPosts.length} posts`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL AGENDAR EM LOTE (per-post datetime) ── */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <CalendarDays size={18} /> Agendar rascunhos
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500">Selecione os posts e defina data/hora individual para cada um.</p>

            {/* Agendamento recorrente */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-purple-300 flex items-center gap-2">
                <CalendarDays size={14} /> Agendamento recorrente (1 post por dia)
              </p>
              <p className="text-xs text-gray-500">Escolha a data do 1º post — os outros seguem automaticamente (+1 dia cada).</p>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-gray-500 block mb-1">Data e hora do 1º post</label>
                  <input type="datetime-local" value={recurringBase} onChange={e => setRecurringBase(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm" />
                </div>
                <button onClick={applyRecurring} disabled={!recurringBase || batchSelected.length === 0}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                  <Zap size={13} /> Aplicar a {batchSelected.length} selecionado(s)
                </button>
              </div>
            </div>

            {posts.filter(p => p.status === 'draft' || p.status === 'scheduled').length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">Nenhum rascunho ou agendado disponivel.</p>
            )}

            <div className="space-y-3">
              {posts.filter(p => p.status === 'draft' || p.status === 'scheduled').map(post => (
                <div key={post.id} className={`rounded-xl border p-3 space-y-2 transition-colors ${batchSelected.includes(post.id) ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={batchSelected.includes(post.id)}
                      onChange={e => setBatchSelected(e.target.checked ? [...batchSelected, post.id] : batchSelected.filter(id => id !== post.id))}
                      className="mt-1 accent-purple-500" />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>{post.platform}</span>
                      {post.status === 'scheduled' && post.scheduledAt && (
                        <span className="text-xs text-yellow-400 mr-2">Agendado: {new Date(post.scheduledAt).toLocaleString('pt-BR')}</span>
                      )}
                      <span className="text-gray-300 text-sm">{post.content.substring(0, 80)}...</span>
                    </div>
                  </label>
                  {batchSelected.includes(post.id) && (
                    <div className="pl-7">
                      <label className="text-xs text-gray-500 block mb-1">Data e hora *</label>
                      <input type="datetime-local"
                        value={batchSchedules[post.id] || ''}
                        onChange={e => setBatchSchedules(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={confirmBatchSchedule} disabled={schedulingBatch || batchSelected.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <CalendarDays size={16} /> {schedulingBatch ? 'Agendando...' : `Agendar ${batchSelected.length} post(s)`}
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Conteudo</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['generate','Gerar Post'],['upload','Upload de Material'],['analyze','Analisar Texto'],['posts','Historico']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA: GERAR POST ── */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-white">Configurar Post</h2>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Plataforma</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Tema do post *</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm"
                placeholder="Ex: Como dimensionar um contator trifasico corretamente" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Tom da postagem</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TONES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.value} onClick={() => setTone(t.value)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${tone === t.value ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'}`}>
                      <Icon size={14} className="mb-1" />
                      <span className="text-xs font-medium">{t.label}</span>
                      <span className="text-xs opacity-70">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Produto/Servico (opcional)</label>
              <div className="relative">
                <button onClick={() => setShowProducts(!showProducts)}
                  className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:border-gray-600">
                  <span className={selectedProduct ? 'text-white' : 'text-gray-500'}>
                    {selectedProduct ? (
                      <span className="flex items-center gap-2"><Package size={14} className="text-blue-400" /> {selectedProduct.name}</span>
                    ) : 'Selecionar produto para a IA mencionar'}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
                {showProducts && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <button onClick={() => { setSelectedProduct(null); setShowProducts(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 transition-colors">
                      Nenhum produto
                    </button>
                    {products.length === 0 && (
                      <p className="px-4 py-3 text-xs text-gray-600">Nenhum produto cadastrado. Va em Funil de Vendas para adicionar.</p>
                    )}
                    {products.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setShowProducts(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            {p.url && <p className="text-blue-400 text-xs truncate">{p.url}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={generate} disabled={!topic || loadingGen}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <Sparkles size={16} /> {loadingGen ? 'Gerando post...' : 'Gerar com IA'}
            </button>

            <div className="border-t border-gray-700 pt-5 mt-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CalendarDays size={16} className="text-green-400" />
                Gerar Semana Completa
              </h3>
              <p className="text-xs text-gray-400 mb-3">Gere automaticamente posts para toda a semana (7 dias)</p>
              <button onClick={() => { setShowWeeklyModal(true); setWeeklyStep('config'); setWeeklyPosts([]); setWeeklyTopic(topic); }}
                disabled={loadingWeekly}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
                <LayoutList size={16} /> {loadingWeekly ? 'Gerando...' : 'Gerar 7 posts da semana'}
              </button>
            </div>
          </div>

          {(generated || loadingGen) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              {loadingGen && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Gerando post com Claude...</p>
                </div>
              )}
              {generated && !loadingGen && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white">Post Gerado</h2>
                    <button onClick={() => savePost(generated, platform, generatedImage)}
                      className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                      <Save size={14} /> Salvar rascunho
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-gray-200 whitespace-pre-wrap text-sm">{generated.content}</p>
                  </div>
                  {generated.cta && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-blue-300 text-sm font-medium">CTA: {generated.cta}</p>
                    </div>
                  )}
                  {generated.hashtags && (
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(generated.hashtags)
                        ? generated.hashtags
                        : ((generated.hashtags as unknown) as string).split(' ')
                      ).map((h: string, i: number) => (
                        <span key={i} className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded">{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-800 pt-4">
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                      <ImageIcon size={12} /> Gerar prompt para imagem — copie e use no Midjourney, DALL-E ou Leonardo
                    </p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {IMAGE_STYLES.map(s => (
                        <button key={s.value} onClick={() => generateImagePrompt(s.value)}
                          className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-all ${imageStyle === s.value && imagePrompt ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'}`}>
                          <span className="font-medium">{s.label}</span>
                          <span className="opacity-70">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                    {imagePrompt && (
                      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                        <p className="text-gray-300 text-xs leading-relaxed">{imagePrompt}</p>
                        <button onClick={copyPrompt}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${promptCopied ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                          {promptCopied ? '✓ Copiado!' : 'Copiar prompt'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: UPLOAD DE MATERIAL ── */}
      {tab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Plataforma alvo</label>
              <select value={uploadPlatform} onChange={e => setUploadPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Quantidade de posts</label>
              <select value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['3','5','7','10'].map(q => <option key={q} value={q}>{q} posts</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Tom</label>
              <select value={uploadTone} onChange={e => setUploadTone(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,image/*" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setUploadResult(null); }} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {file.type === 'application/pdf' ? <FileText size={20} className="text-red-400" /> : <ImageIcon size={20} className="text-blue-400" />}
                <span className="text-white font-medium">{file.name}</span>
                <button onClick={e => { e.stopPropagation(); setFile(null); setUploadResult(null); }} className="text-gray-500 hover:text-red-400"><X size={16} /></button>
              </div>
            ) : (
              <div>
                <Upload size={40} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-300 font-medium">Arraste ou clique para selecionar</p>
                <p className="text-gray-500 text-sm mt-1">PDF, PNG, JPG, TXT — ate 20MB</p>
              </div>
            )}
          </div>
          {file && !uploadResult && (
            <button onClick={handleUpload} disabled={loadingUpload}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <Sparkles size={18} /> {loadingUpload ? 'Analisando com Claude...' : `Gerar ${quantity} posts a partir deste arquivo`}
            </button>
          )}
          {loadingUpload && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Lendo o arquivo com Claude e gerando posts...</p>
            </div>
          )}
          {uploadResult && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Resumo do material</p>
                <p className="text-gray-300 text-sm">{uploadResult.summary}</p>
              </div>
              <h2 className="text-white font-semibold">{uploadResult.posts?.length} posts gerados</h2>
              {uploadResult.posts?.map((post: any, i: number) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded">{post.theme}</span>
                    <button onClick={() => savePost(post, uploadPlatform)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-300 transition-colors">
                      <Save size={14} /> Salvar
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-200 whitespace-pre-wrap text-sm">{post.content}</p>
                  </div>
                  {post.cta && <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-2"><p className="text-blue-300 text-sm">CTA: {post.cta}</p></div>}
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags?.map((h: string, j: number) => <span key={j} className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded">{h}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Importar post pronto */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><PlusCircle size={16} className="text-green-400" /> Importar Post Pronto para o Historico</h2>
            <p className="text-gray-500 text-xs">Cole um post que voce ja escreveu ou editou manualmente para salvar e depois publicar ou agendar.</p>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Plataforma</label>
              <select value={importPlatform} onChange={e => setImportPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Conteudo do post *</label>
              <textarea value={importContent} onChange={e => setImportContent(e.target.value)} rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm"
                placeholder="Cole aqui o texto completo do post..." />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">CTA (opcional)</label>
              <input value={importCta} onChange={e => setImportCta(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Ex: Acesse o Manual do Eletricista: go.hotmart.com/..." />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Hashtags (opcional)</label>
              <input value={importHashtags} onChange={e => setImportHashtags(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="#ManualDoEletricista #Eletricista" />
            </div>
            <button onClick={saveImportedPost} disabled={savingImport || !importContent.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <Save size={16} /> {savingImport ? 'Salvando...' : 'Salvar no Historico'}
            </button>
          </div>
        </div>
      )}

      {/* ── ABA: ANALISAR TEXTO ── */}
      {tab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white">Analisar Conteudo</h2>
            <textarea value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm"
              placeholder="Cole aqui o texto que deseja analisar..." />
            <button onClick={analyze} disabled={!analyzeText || loadingAnalyze}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg">
              <Sparkles size={16} /> {loadingAnalyze ? 'Analisando...' : 'Analisar com IA'}
            </button>
          </div>
          {analysis && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white">{analysis.score}/10</span>
                <span className="text-gray-400 text-sm">Score de qualidade</span>
              </div>
              {analysis.strengths?.length > 0 && <div><p className="text-green-400 text-sm font-medium mb-2">Pontos fortes</p>{analysis.strengths.map((s: string, i: number) => <p key={i} className="text-gray-300 text-sm">• {s}</p>)}</div>}
              {analysis.improvements?.length > 0 && <div><p className="text-yellow-400 text-sm font-medium mb-2">Melhorias sugeridas</p>{analysis.improvements.map((s: string, i: number) => <p key={i} className="text-gray-300 text-sm">• {s}</p>)}</div>}
              {analysis.rewritten && <div><p className="text-blue-400 text-sm font-medium mb-2">Versao reescrita</p><div className="bg-gray-800 rounded-lg p-3"><p className="text-gray-200 text-sm whitespace-pre-wrap">{analysis.rewritten}</p></div></div>}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: HISTORICO ── */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
            <p className="text-white text-sm font-medium mb-3">Filtros do historico</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Plataforma</label>
                <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="all">Todas plataformas</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="all">Todos status</option>
                  <option value="published">Publicados</option>
                  <option value="scheduled">Agendados</option>
                  <option value="draft">Rascunhos</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <p className="text-gray-400 text-sm">{filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} filtrado{filteredPosts.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setShowWeeklyModal(true); setWeeklyStep('config'); setWeeklyPosts([]); }}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  <LayoutList size={14} /> Gerar semana
                </button>
                <button onClick={() => setShowBatchModal(true)}
                  className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  <CalendarDays size={14} /> Agendar rascunhos
                </button>
              </div>
            </div>
          </div>

          {filteredPosts.length === 0 && <p className="text-gray-500 text-center py-8">Nenhum post encontrado com esses filtros.</p>}
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>{post.platform}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    post.status === 'draft' ? 'bg-yellow-600 text-yellow-100' :
                    post.status === 'scheduled' ? 'bg-blue-600 text-blue-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    {post.status === 'draft' ? '🟡 RASCUNHO' :
                     post.status === 'scheduled' ? '🔵 AGENDADO' :
                     '🟢 PUBLICADO'}
                  </span>
                </div>
                <span className={`text-xs flex items-center gap-1 ${post.status === 'published' ? 'text-green-400' : post.status === 'scheduled' ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {post.status === 'published' ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-BR') : ''}
                </span>
              </div>
              {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
              <p className="text-gray-300 text-sm line-clamp-3">{post.content}</p>
              {post.cta && <p className="text-blue-400 text-xs mt-2">{post.cta}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => copyPostContent(post)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${copiedPostId === post.id ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                  <Copy size={13} /> {copiedPostId === post.id ? '✓ Copiado!' : 'Copiar'}
                </button>
                {post.status !== 'published' && (
                  <button onClick={() => setPublishModal({ post })}
                    className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                    <Send size={13} /> {post.status === 'scheduled' ? 'Reagendar' : 'Publicar / Agendar'}
                  </button>
                )}
                {post.status === 'scheduled' && (
                  <button onClick={async () => {
                    if (!confirm('Cancelar agendamento? O post voltará para rascunho.')) return;
                    try {
                      await api.patch(`/content/posts/${post.id}`, { status: 'draft', scheduledAt: null });
                      alert('Agendamento cancelado!');
                      loadPosts();
                    } catch (e: any) {
                      alert(e.response?.data?.error || 'Erro ao cancelar');
                    }
                  }}
                    className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                    <X size={13} /> Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

