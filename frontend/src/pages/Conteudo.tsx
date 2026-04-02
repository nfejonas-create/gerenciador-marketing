import { useState, useEffect, useRef } from 'react';
import { Sparkles, Save, Clock, CheckCircle, Upload, FileText, Image, X, Plus, Send } from 'lucide-react';
import api from '../services/api';

export default function Conteudo() {
  const [tab, setTab] = useState<'generate' | 'upload' | 'analyze' | 'posts'>('generate');

  // Gerar post
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [tone, setTone] = useState('profissional e engajador');
  const [product, setProduct] = useState('');
  const [generated, setGenerated] = useState<any>(null);
  const [loadingGen, setLoadingGen] = useState(false);

  // Upload de material
  const [file, setFile] = useState<File | null>(null);
  const [uploadPlatform, setUploadPlatform] = useState('linkedin');
  const [uploadTone, setUploadTone] = useState('profissional e engajador');
  const [quantity, setQuantity] = useState('5');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analisar conteudo
  const [analyzeText, setAnalyzeText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);

  // Posts salvos
  const [posts, setPosts] = useState<any[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);

  async function publishSavedPost(postId: string) {
    setPublishing(postId);
    try {
      await api.post('/content/publish', { postId });
      alert('Post publicado com sucesso!');
      loadPosts();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao publicar');
    } finally { setPublishing(null); }
  }

  async function generate() {
    setLoadingGen(true); setGenerated(null);
    try { const { data } = await api.post('/content/generate', { topic, platform, tone, product }); setGenerated(data); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro ao gerar post'); }
    finally { setLoadingGen(false); }
  }

  async function savePost(postData: any, plt: string) {
    try {
      await api.post('/content/posts', {
        platform: plt,
        content: postData.content,
        cta: postData.cta,
        hashtags: postData.hashtags,
        status: 'draft',
      });
      alert('Post salvo como rascunho!');
    } catch { alert('Erro ao salvar'); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoadingUpload(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', uploadPlatform);
      formData.append('tone', uploadTone);
      formData.append('quantity', quantity);
      const { data } = await api.post('/content/upload-material', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao processar arquivo');
    } finally { setLoadingUpload(false); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function getFileIcon(f: File) {
    if (f.type === 'application/pdf') return <FileText size={20} className="text-red-400" />;
    if (f.type.startsWith('image/')) return <Image size={20} className="text-blue-400" />;
    return <FileText size={20} className="text-gray-400" />;
  }

  async function analyze() {
    setLoadingAnalyze(true); setAnalysis(null);
    try { const { data } = await api.post('/content/analyze', { content: analyzeText }); setAnalysis(data); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro ao analisar'); }
    finally { setLoadingAnalyze(false); }
  }

  async function loadPosts() {
    try { const { data } = await api.get('/content/posts'); setPosts(data); } catch {}
  }

  useEffect(() => { if (tab === 'posts') loadPosts(); }, [tab]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Conteudo</h1>
      <div className="flex gap-2 flex-wrap">
        {[
          ['generate', 'Gerar Post'],
          ['upload', 'Upload de Material'],
          ['analyze', 'Analisar Texto'],
          ['posts', 'Historico'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA: GERAR POST */}
      {tab === 'generate' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white">Configurar Post</h2>
            <div><label className="text-sm text-gray-400 block mb-1">Plataforma</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                <option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option>
              </select>
            </div>
            <div><label className="text-sm text-gray-400 block mb-1">Tema do post *</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none" placeholder="Ex: Como aumentar engajamento no LinkedIn em 30 dias" />
            </div>
            <div><label className="text-sm text-gray-400 block mb-1">Tom desejado</label>
              <input type="text" value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div><label className="text-sm text-gray-400 block mb-1">Produto/Servico (opcional)</label>
              <input type="text" value={product} onChange={e => setProduct(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Ex: Curso de Marketing Digital" />
            </div>
            <button onClick={generate} disabled={!topic || loadingGen} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors">
              <Sparkles size={16} /> {loadingGen ? 'Gerando...' : 'Gerar com IA'}
            </button>
          </div>
          {generated && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">Post Gerado</h2>
                <button onClick={() => savePost(generated, platform)} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"><Save size={14} /> Salvar</button>
              </div>
              <div className="bg-gray-800 rounded-lg p-4"><p className="text-gray-200 whitespace-pre-wrap text-sm">{generated.content}</p></div>
              {generated.cta && <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3"><p className="text-blue-300 text-sm font-medium">CTA: {generated.cta}</p></div>}
              {generated.hashtags && (
                <div className="flex flex-wrap gap-2">{generated.hashtags.map((h: string, i: number) => (
                  <span key={i} className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded">{h}</span>
                ))}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA: UPLOAD DE MATERIAL */}
      {tab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Plataforma alvo</label>
              <select value={uploadPlatform} onChange={e => setUploadPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Quantidade de posts</label>
              <select value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['3', '5', '7', '10'].map(q => <option key={q} value={q}>{q} posts</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Tom</label>
              <input value={uploadTone} onChange={e => setUploadTone(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>

          {/* Zona de drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,image/*" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setUploadResult(null); }} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {getFileIcon(file)}
                <span className="text-white font-medium">{file.name}</span>
                <span className="text-gray-400 text-sm">({(file.size / 1024).toFixed(0)} KB)</span>
                <button onClick={e => { e.stopPropagation(); setFile(null); setUploadResult(null); }} className="text-gray-500 hover:text-red-400 ml-1"><X size={16} /></button>
              </div>
            ) : (
              <div>
                <Upload size={40} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-300 font-medium">Arraste ou clique para selecionar</p>
                <p className="text-gray-500 text-sm mt-1">PDF, imagem (PNG, JPG, screenshot de app) ou TXT — ate 20MB</p>
              </div>
            )}
          </div>

          {file && !uploadResult && (
            <button onClick={handleUpload} disabled={loadingUpload} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              <Sparkles size={18} /> {loadingUpload ? 'Analisando com IA...' : `Gerar ${quantity} posts a partir deste arquivo`}
            </button>
          )}

          {loadingUpload && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Lendo o arquivo e gerando posts com GPT-4...</p>
            </div>
          )}

          {/* Resultado */}
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
                    <button onClick={() => savePost(post, uploadPlatform)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-300 transition-colors">
                      <Save size={14} /> Salvar
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-200 whitespace-pre-wrap text-sm">{post.content}</p>
                  </div>
                  {post.cta && <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-2"><p className="text-blue-300 text-sm">CTA: {post.cta}</p></div>}
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags?.map((h: string, j: number) => (
                      <span key={j} className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded">{h}</span>
                    ))}
                  </div>
                  <button onClick={() => savePost(post, uploadPlatform)} className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                    <Plus size={14} /> Adicionar ao historico
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: ANALISAR TEXTO */}
      {tab === 'analyze' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-white">Analisar Conteudo</h2>
            <textarea value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} rows={10} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none text-sm" placeholder="Cole aqui o texto que deseja analisar..." />
            <button onClick={analyze} disabled={!analyzeText || loadingAnalyze} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg">
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
                <span className={`text-xs flex items-center gap-1 ${post.status === 'published' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {post.status === 'published' ? <CheckCircle size={12} /> : <Clock size={12} />} {post.status}
                </span>
              </div>
              <p className="text-gray-300 text-sm line-clamp-3">{post.content}</p>
              {post.cta && <p className="text-blue-400 text-xs mt-2">{post.cta}</p>}
              {post.status !== 'published' && (
                <button
                  onClick={() => publishSavedPost(post.id)}
                  disabled={publishing === post.id}
                  className="mt-3 flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <Send size={14} /> {publishing === post.id ? 'Publicando...' : `Publicar no ${post.platform}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
