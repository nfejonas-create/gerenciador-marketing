import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, ExternalLink } from 'lucide-react';
import api from '../services/api';

const TYPES = ['ebook', 'curso', 'app', 'planilha', 'servico'];

export default function Funil() {
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'ebook', url: '', price: '' });
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [p, s] = await Promise.all([api.get('/funnel/products'), api.get('/funnel/suggestions').catch(() => ({ data: { suggestions: [] } }))]);
    setProducts(p.data);
    setSuggestions(s.data.suggestions || []);
  }

  async function addProduct(e: any) {
    e.preventDefault();
    try { await api.post('/funnel/products', { ...form, price: form.price ? Number(form.price) : null }); setForm({ name: '', type: 'ebook', url: '', price: '' }); loadData(); }
    catch { alert('Erro ao adicionar produto'); }
  }

  async function deleteProduct(id: string) {
    await api.delete(`/funnel/products/${id}`); loadData();
  }

  async function refreshSuggestions() {
    setLoading(true);
    try { const { data } = await api.get('/funnel/suggestions'); setSuggestions(data.suggestions || []); }
    catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Funil de Vendas</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Adicionar Produto</h2>
            <form onSubmit={addProduct} className="space-y-3">
              <input placeholder="Nome do produto" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="URL de venda" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input placeholder="Preco (opcional)" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"><Plus size={16} /> Adicionar</button>
            </form>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-3">Produtos ({products.length})</h2>
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white text-sm font-medium">{p.name}</p>
                    <span className="text-xs text-gray-400">{p.type}{p.price ? ` • R$ ${p.price}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14} className="text-gray-400 hover:text-white" /></a>
                    <button onClick={() => deleteProduct(p.id)}><Trash2 size={14} className="text-gray-500 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Nenhum produto cadastrado.</p>}
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Sugestoes de CTA</h2>
            <button onClick={refreshSuggestions} disabled={loading} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
              <Sparkles size={14} /> {loading ? 'Gerando...' : 'Atualizar'}
            </button>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white text-sm font-medium">{s.productName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>{s.platform}</span>
                </div>
                <p className="text-blue-300 text-sm font-medium mb-1">{s.cta}</p>
                <p className="text-gray-400 text-xs">{s.strategy}</p>
              </div>
            ))}
            {suggestions.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Adicione produtos e clique em Atualizar para gerar sugestoes.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
