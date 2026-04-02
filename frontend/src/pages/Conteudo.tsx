import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Save, Clock, CheckCircle, Upload, FileText, Image as ImageIcon,
  X, Send, Calendar, ChevronDown, Package, Zap, BookOpen, Star, Target, MessageSquare
} from 'lucide-react';
import api from '../services/api';

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
  const [loadingImage, setLoadingImage] = useState(false);
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

  useEffect(() => {
    loadProducts();
    if (tab === 'posts') loadPosts();
  }, [tab]);

  async function loadProducts() {
    try { const { data } = await api.get('/funnel/products'); setProducts(data); } catch {}
  }

  async function loadPosts() {
    try { const { data } = await api.get('/content/posts'); setPosts(data); } catch {}
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
    const t = (topic || generated?.content || '').substring(0, 200).toLowerCase();
    let subject = 'industrial electrical control panel with organized cables and circuit breakers';
    if (t.includes('motor')) subject = 'three-phase electric motor in industrial environment, copper windings';
    else if (t.includes('contator') || t.includes('rele')) subject = 'industrial contactors and relays on DIN rail inside control panel';
    else if (t.includes('painel') || t.includes('quadro')) subject = 'open industrial electrical panel with busbars and circuit breakers';
    else if (t.includes('cabo') || t.includes('fiacao')) subject = 'organized industrial cable tray with color-coded wires';
    else if (t.includes('grao') || t.includes('silo')) subject = 'grain storage silo with industrial electrical automation nearby';
    else if (t.includes('inversor')) subject = 'variable frequency drive VFD in industrial control cabinet';
    else if (t.includes('sensor')) subject = 'industrial limit switch and proximity sensors on machinery';

    const styleMap: Record<string, string> = {
      realista: 'professional industrial photography, photorealistic, dramatic lighting, sharp focus, dark blue and orange palette',
      ilustrativo: 'digital illustration, technical drawing style, clean lines, dark blue and orange palette, professional',
      criativo: 'creative conceptual art, dynamic composition, glowing electrical elements, dark dramatic background, orange and blue neon accents',
      post: 'square 1:1 format, centered composition, professional social media post',
      story: 'vertical 9:16 format, bold composition, optimized for Instagram Story or Reels',
    };

    return `${styleMap[style]}: ${subject}. No text, no logos, no visible human faces. High quality, suitable for social media.`;
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
        hashtags: postData.hashtags,
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

  // ---- MODAL PUBLICAR ----
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
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <Send size={16} /> {publishing === postId ? 'Publicando...' : 'Publicar agora'}
          </button>
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-sm text-gray-400 flex items-center gap-2"><Calendar size={14} /> Ou agendar para:</p>
            <input
              type="datetime-local"
              value={localDate}
              onChange={e => setLocalDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={() => localDate && publishPost(postId, localDate)}
              disabled={!localDate || publishing === postId}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm transition-colors"
            >
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
              <h3 className="text-white font-semibold">Publicar post</h3>
              <button onClick={() => setPublishModal(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <p className="text-gray-400 text-sm line-clamp-2">{publishModal.post.content}</p>
            <button
              onClick={() => publishPost(publishModal.post.id)}
              disabled={publishing === publishModal.post.id}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
            >
              <Send size={16} /> {publishing === publishModal.post.id ? 'Publicando...' : 'Publicar agora'}
            </button>
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-sm text-gray-400">Ou agendar:</p>
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <button
                onClick={() => scheduleDate && publishPost(publishModal.post.id, scheduleDate)}
                disabled={!scheduleDate || publishing === publishModal.post.id}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm"
              >
                <Calendar size={14} /> Agendar
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Conteudo</h1>

      <div className="flex gap-2 flex-wrap">
        {[['generate','Gerar Post'],['upload','Upload de Material'],['analyze','Analisar Texto'],['posts','Historico']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA: GERAR POST */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-white">Configurar Post</h2>

            {/* Plataforma */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">Plataforma</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            {/* Tema */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">Tema do post *</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm"
                placeholder="Ex: Como dimensionar um contator trifasico corretamente" />
            </div>

            {/* Tom */}
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

            {/* Produto/Servico */}
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
                      <p className="px-4 py-3 text-xs text-gray-600">Nenhum produto cadastrado. Vá em Funil de Vendas para adicionar.</p>
                    )}
                    {products.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setShowProducts(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            {p.url && <p className="text-blue-400 text-xs truncate">{p.url}</p>}
                            {p.type && <p className="text-gray-500 text-xs">{p.type}{p.price ? ` · R$ ${p.price}` : ''}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct?.url && (
                <p className="text-xs text-green-400 mt-1">IA vai mencionar: {selectedProduct.url}</p>
              )}
            </div>

            <button onClick={generate} disabled={!topic || loadingGen}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <Sparkles size={16} /> {loadingGen ? 'Gerando post...' : 'Gerar com IA'}
            </button>
          </div>

          {/* Resultado */}
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

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-200 whitespace-pre-wrap text-sm">{generated.content}</p>
                  </div>

                  {generated.cta && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-blue-300 text-sm font-medium">CTA: {generated.cta}</p>
                    </div>
                  )}

                  {generated.hashtags && (
                    <div className="flex flex-wrap gap-2">
                      {generated.hashtags.map((h: string, i: number) => (
                        <span key={i} className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded">{h}</span>
                      ))}
                    </div>
                  )}

                  {/* Gerador de prompt para imagem externa */}
                  <div className="border-t border-gray-800 pt-4">
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                      <ImageIcon size={12} /> Gerar prompt para imagem — copie e use no Midjourney, DALL-E, Leonardo ou outro gerador
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

      {/* ABA: UPLOAD DE MATERIAL */}
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
        </div>
      )}

      {/* ABA: ANALISAR TEXTO */}
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

      {/* ABA: HISTORICO */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 && <p className="text-gray-500 text-center py-8">Nenhum post salvo ainda.</p>}
          {posts.map(post => (
            <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${post.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>{post.platform}</span>
                <span className={`text-xs flex items-center gap-1 ${post.status === 'published' ? 'text-green-400' : post.status === 'scheduled' ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {post.status === 'published' ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {post.status === 'draft' ? 'Rascunho' : post.status === 'scheduled' ? `Agendado${post.scheduledAt ? ' · ' + new Date(post.scheduledAt).toLocaleString('pt-BR') : ''}` : 'Publicado'}
                </span>
              </div>
              {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
              <p className="text-gray-300 text-sm line-clamp-3">{post.content}</p>
              {post.cta && <p className="text-blue-400 text-xs mt-2">{post.cta}</p>}
              {post.status !== 'published' && (
                <button
                  onClick={() => setPublishModal({ post })}
                  className="mt-3 flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  <Send size={14} /> Publicar / Agendar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
