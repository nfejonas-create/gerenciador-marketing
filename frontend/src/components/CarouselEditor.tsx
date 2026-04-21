// Componente de Editor de Carrossel Profissional para LinkedIn
import { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, ChevronUp, ChevronDown, X } from 'lucide-react';

export interface Slide {
  id: string;
  type: 'cover' | 'content' | 'cta';
  emoji: string;
  title: string;
  body: string;
  style: 'cover' | 'content' | 'cta';
}

interface CarouselEditorProps {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  onCopyText?: () => void;
}

let _id = 0;
const uid = () => `slide_${++_id}`;

export default function CarouselEditor({ slides, onChange, onCopyText }: CarouselEditorProps) {
  const [selId, setSelId] = useState<string>(slides[0]?.id || '');
  const [copied, setCopied] = useState(false);

  const sel = slides.find(s => s.id === selId) || slides[0];
  const selIdx = slides.findIndex(s => s.id === selId);

  const update = useCallback((id: string, patch: Partial<Slide>) => {
    const updated = slides.map(s => s.id === id ? { ...s, ...patch } : s);
    onChange(updated);
  }, [slides, onChange]);

  const addSlide = () => {
    const s: Slide = {
      id: uid(),
      type: 'content',
      emoji: '💡',
      title: 'Novo Slide',
      body: 'Conteúdo do slide...',
      style: 'content',
    };
    onChange([...slides, s]);
    setSelId(s.id);
  };

  const remove = (id: string) => {
    if (slides.length <= 1) return;
    const idx = slides.findIndex(s => s.id === id);
    const updated = slides.filter(s => s.id !== id);
    onChange(updated);
    setSelId(slides[idx === 0 ? 1 : idx - 1]?.id || updated[0]?.id);
  };

  const move = (idx: number, dir: number) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= slides.length) return;
    const a = [...slides];
    [a[idx], a[ni]] = [a[ni], a[idx]];
    onChange(a);
  };

  const copyText = () => {
    const txt = slides.map((s, i) => {
      return `Slide ${i + 1}: ${s.emoji} ${s.title}\n${s.body}`;
    }).join('\n\n');
    navigator.clipboard.writeText(txt);
    setCopied(true);
    onCopyText?.();
    setTimeout(() => setCopied(false), 2200);
  };

  const styleClasses = {
    cover: 'bg-gradient-to-br from-purple-600 to-purple-900',
    content: 'bg-gray-800',
    cta: 'bg-gradient-to-br from-blue-600 to-blue-800',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar - Thumbnails */}
      <div className="w-full lg:w-48 bg-gray-900 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto max-h-64 lg:max-h-full">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
          Slides ({slides.length})
        </div>
        
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSelId(s.id)}
            className={`p-3 rounded-lg text-left transition-all ${
              s.id === selId 
                ? 'bg-blue-600 ring-2 ring-blue-400' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xs font-medium truncate">{s.title}</div>
            <div className="text-[10px] text-gray-400">{i + 1}</div>
          </button>
        ))}
        
        <button
          onClick={addSlide}
          className="flex items-center justify-center gap-1 py-2 bg-green-600/20 border border-green-600/30 rounded-lg text-green-400 text-sm hover:bg-green-600/30 transition"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Center - Preview */}
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Preview do slide */}
        <div className={`w-full max-w-md aspect-square rounded-xl overflow-hidden ${styleClasses[sel.style]} relative`}>
          <div className="absolute inset-0 flex flex-col p-6">
            <div className="text-5xl mb-3">{sel.emoji}</div>
            <h3 className={`font-bold mb-3 ${sel.style === 'cover' ? 'text-3xl text-center' : 'text-xl'}`}>
              {sel.title}
            </h3>
            <p className={`flex-1 ${sel.style === 'cover' ? 'text-center text-lg' : 'text-sm'}`}>
              {sel.body}
            </p>
          </div>
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => move(selIdx, -1)}
            disabled={selIdx === 0}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-50"
          >
            <ChevronUp size={16} />
          </button>
          
          <span className="text-sm text-gray-400">
            Slide {selIdx + 1} de {slides.length}
          </span>
          
          <button
            onClick={() => move(selIdx, 1)}
            disabled={selIdx === slides.length - 1}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-50"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <button
            onClick={copyText}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              copied 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
          
          <button
            onClick={() => remove(sel.id)}
            disabled={slides.length <= 1}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition"
          >
            <Trash2 size={14} /> Remover
          </button>
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="w-full lg:w-72 bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider">
          Editar Slide {selIdx + 1}
        </div>

        {/* Emoji */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Emoji</label>
          <input
            type="text"
            value={sel.emoji}
            onChange={e => update(sel.id, { emoji: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xl text-center"
            maxLength={2}
          />
        </div>

        {/* Título */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Título</label>
          <input
            type="text"
            value={sel.title}
            onChange={e => update(sel.id, { title: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Corpo */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Conteúdo</label>
          <textarea
            value={sel.body}
            onChange={e => update(sel.id, { body: e.target.value })}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Estilo */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Estilo</label>
          <div className="flex gap-2">
            {(['cover', 'content', 'cta'] as const).map(style => (
              <button
                key={style}
                onClick={() => update(sel.id, { style, type: style })}
                className={`flex-1 py-2 rounded-lg text-xs capitalize transition ${
                  sel.style === style
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {style === 'cover' ? 'Capa' : style === 'content' ? 'Conteúdo' : 'CTA'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
