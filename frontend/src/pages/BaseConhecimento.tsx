// frontend/src/pages/BaseConhecimento.tsx
import { useState, useEffect, useRef } from 'react';
import { Database, Upload, Link2, FileText, Image, Trash2, Tag, Plus, Search, X } from 'lucide-react';
import api from '../services/api';

interface KbItem {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'link' | 'text';
  filename?: string;
  tags?: string;
  fileSize?: number;
  url?: string;
  createdAt: string;
}

export default function BaseConhecimento() {
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'list' | 'upload' | 'link'>('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkTags, setLinkTags] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  async function loadItems() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      const { data } = await api.get('/knowledge', { params });
      setItems(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadItems(); }, [filterType]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name);
      form.append('tags', tags);
      await api.post('/knowledge/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null); setTitle(''); setTags('');
      setTab('list');
      loadItems();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao fazer upload');
    } finally { setUploading(false); }
  }

  async function handleAddLink() {
    if (!linkUrl) return;
    setSavingLink(true);
    try {
      await api.post('/knowledge/link', { url: linkUrl, title: linkTitle, description: linkDesc, tags: linkTags });
      setLinkUrl(''); setLinkTitle(''); setLinkDesc(''); setLinkTags('');
      setTab('list');
      loadItems();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao salvar link');
    } finally { setSavingLink(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este item da base?')) return;
    await api.delete(`/knowledge/${id}`);
    loadItems();
  }

  function typeIcon(type: string) {
    if (type === 'pdf') return <FileText size={16} className="text-red-400" />;
    if (type === 'image') return <Image size={16} className="text-blue-400" />;
    if (type === 'link') return <Link2 size={16} className="text-green-400" />;
    return <FileText size={16} className="text-gray-400" />;
  }

  function typeLabel(type: string) {
    const map: Record<string, string> = { pdf: 'PDF', image: 'Imagem', link: 'Link', text: 'Texto' };
    return map[type] || type;
  }

  function formatSize(bytes?: number) {
    if (!bytes) return '';
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const filtered = items.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.tags || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('upload')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Upload size={14} /> Upload
          </button>
          <button onClick={() => setTab('link')} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Link2 size={14} /> Adicionar Link
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm">
        Arquivos e links salvos aqui ficam disponiveis para a IA buscar ao gerar posts. Adicione seus ebooks, prints, esquemas e referencias.
      </p>

      {tab === 'list' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por titulo ou tag..." className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Todos os tipos</option>
              <option value="pdf">PDF</option>
              <option value="image">Imagens</option>
              <option value="link">Links</option>
              <option value="text">Texto</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Database size={40} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500">Base vazia. Adicione ebooks, prints ou links.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(item => (
                <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors">
                  <div className="flex-shrink-0">{typeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm truncate">{item.title}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded flex-shrink-0">{typeLabel(item.type)}</span>
                      {item.fileSize && <span className="text-xs text-gray-600 flex-shrink-0">{formatSize(item.fileSize)}</span>}
                    </div>
                    {item.tags && (
                      <div className="flex gap-1 flex-wrap">
                        {item.tags.split(',').map((tag, i) => tag.trim() && (
                          <span key={i} className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">
                            <Tag size={9} /> {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline truncate block mt-1">{item.url}</a>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-600">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'upload' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Upload para a Base</h2>
            <button onClick={() => setTab('list')} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {file.type === 'application/pdf' ? <FileText size={20} className="text-red-400" /> : <Image size={20} className="text-blue-400" />}
                <span className="text-white">{file.name}</span>
                <span className="text-gray-500 text-sm">({formatSize(file.size)})</span>
              </div>
            ) : (
              <>
                <Upload size={36} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-300 font-medium">Arraste ou clique para selecionar</p>
                <p className="text-gray-500 text-sm mt-1">PDF, PNG, JPG, TXT — ate 20MB</p>
              </>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Titulo (opcional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={file?.name || 'Ex: Manual Vol. 1 - Motores'} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tags (separadas por virgula)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Ex: motores, vol1, automacao, graos" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <p className="text-xs text-gray-600 mt-1">Tags ajudam a IA a encontrar o material certo para cada tema.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTab('list')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition-colors">Cancelar</button>
            <button onClick={handleUpload} disabled={!file || uploading} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm transition-colors">
              <Plus size={14} /> {uploading ? 'Salvando e indexando...' : 'Salvar na Base'}
            </button>
          </div>
        </div>
      )}

      {tab === 'link' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Adicionar Link</h2>
            <button onClick={() => setTab('list')} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">URL *</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Titulo</label>
            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Ex: Artigo sobre automacao de silos" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Descricao / contexto</label>
            <textarea value={linkDesc} onChange={e => setLinkDesc(e.target.value)} rows={3} placeholder="O que tem neste link? A IA usa essa descricao para gerar posts." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tags</label>
            <input value={linkTags} onChange={e => setLinkTags(e.target.value)} placeholder="Ex: hotmart, vol1, vendas" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTab('list')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition-colors">Cancelar</button>
            <button onClick={handleAddLink} disabled={!linkUrl || savingLink} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm transition-colors">
              <Link2 size={14} /> {savingLink ? 'Salvando...' : 'Salvar Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
