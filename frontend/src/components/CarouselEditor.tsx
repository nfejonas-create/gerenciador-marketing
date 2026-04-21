// Componente de Editor de Carrossel Profissional para LinkedIn
import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, ChevronUp, ChevronDown, AlignLeft, AlignCenter, AlignRight, Smile, X } from 'lucide-react';

export interface Slide {
  id: string;
  type: 'cover' | 'content' | 'cta';
  emoji: string;
  title: string;
  body: string;
  style: 'cover' | 'content' | 'cta';
  imageUrl?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  textAlign?: 'left' | 'center' | 'right';
}

interface CarouselEditorProps {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  onCopyText?: () => void;
  onGenerateImage?: (slideIndex: number) => Promise<string>;
}

let _id = 0;
const uid = () => `slide_${++_id}`;

// ─── Emoji Categories ────────────────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Negócios',
    emojis: ['💼','📊','📈','📉','💡','🎯','🏆','🥇','🚀','⚡','💰','🤝','📋','✅','❌','⚠️','🔥','💪','🧠','👔','🏢','📌','🔑','💎','🌟','⭐','🎖️','🏅','📣','📢'],
  },
  {
    label: 'Tecnologia',
    emojis: ['💻','🖥️','📱','⌨️','🖱️','🔧','🔨','⚙️','🛠️','🔌','💾','💿','📡','🤖','🧬','🔬','🔭','🛰️','🌐','📶','🔐','🔒','🛡️','⚡','🔋','💡','🧪','🧫','🔩','🔗'],
  },
  {
    label: 'Educação',
    emojis: ['📚','📖','✏️','📝','🎓','🏫','📐','📏','🔍','💬','🗣️','👨‍🏫','👩‍🏫','📜','🎒','🖊️','📓','📔','📒','📕','📗','📘','📙','🗒️','📃','📄','📑','🗂️','🗃️','💭'],
  },
  {
    label: 'Sentimentos',
    emojis: ['😀','😃','😄','😁','😆','🥹','😊','😇','🙂','🤩','😍','🥰','😎','🤓','🧐','🤔','💪','👏','🙌','👍','👎','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💝'],
  },
  {
    label: 'Símbolos',
    emojis: ['✨','🌈','🎉','🎊','🎁','🎀','🎗️','🎟️','🏷️','🔖','📍','🗺️','🌍','🌎','🌏','♻️','💫','🌀','🔄','↩️','↪️','⬆️','⬇️','⬅️','➡️','🔼','🔽','◀️','▶️','⏩'],
  },
  {
    label: 'Pessoas',
    emojis: ['👤','👥','🧑‍💼','👨‍💼','👩‍💼','🧑‍🔧','👨‍🔧','👩‍🔧','🧑‍🍳','👨‍🍳','👩‍🍳','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍🏫','🧑‍💻','👨‍💻','👩‍💻','🧑‍🎨','🧑‍🚀','🧑‍⚕️','👮','💂','🕵️','👷','🤵','🎩','👑','🦸','🦹'],
  },
  {
    label: 'Natureza',
    emojis: ['🌱','🌿','🍀','🌾','🌵','🌲','🌳','🌴','🍁','🍂','🍃','🌸','🌺','🌻','🌹','🌷','🌼','🪴','☘️','🌊','🔥','❄️','⛅','🌤️','🌩️','⚡','🌈','🌙','☀️','⭐'],
  },
];

// ─── EmojiPicker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bottom-full mb-2 left-0 w-72 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex overflow-x-auto gap-1 p-2 border-b border-gray-700 scrollbar-hide">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveCategory(i)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 transition-colors ${
              activeCategory === i ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            className="text-xl hover:bg-gray-700 rounded p-1 transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CarouselEditor({ slides, onChange, onCopyText }: CarouselEditorProps) {
  const [selId, setSelId] = useState<string>(slides[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Sync selId when slides change (e.g. new slides loaded from API)
  useEffect(() => {
    if (slides.length > 0 && !slides.find(s => s.id === selId)) {
      setSelId(slides[0].id);
    }
  }, [slides, selId]);

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

  const navigateTo = (dir: number) => {
    const ni = selIdx + dir;
    if (ni >= 0 && ni < slides.length) setSelId(slides[ni].id);
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

  // Append emoji to current emoji field
  const appendEmoji = (emoji: string) => {
    if (!sel) return;
    update(sel.id, { emoji: (sel.emoji || '') + emoji });
  };

  const styleClasses = {
    cover: 'bg-gradient-to-br from-purple-600 to-purple-900',
    content: 'bg-gray-800',
    cta: 'bg-gradient-to-br from-blue-600 to-blue-800',
  };

  const fontSizeClass: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const textAlignClass: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const fs = fontSizeClass[sel?.fontSize || 'md'];
  const ta = textAlignClass[sel?.textAlign || (sel?.style === 'cover' ? 'center' : 'left')];

  if (!sel) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── Sidebar - Thumbnails ── */}
      <div className="w-full lg:w-48 bg-gray-900 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto max-h-64 lg:max-h-full">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
          Slides ({slides.length})
        </div>

        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSelId(s.id)}
            className={`p-3 rounded-lg text-left transition-all relative border-2 ${
              s.id === selId
                ? 'bg-purple-800 border-purple-400 shadow-lg shadow-purple-900/50'
                : 'bg-gray-800 border-transparent hover:bg-gray-700 hover:border-gray-600'
            }`}
          >
            {s.id === selId && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-purple-300 rounded-full ring-2 ring-purple-800" />
            )}
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xs font-medium truncate">{s.title}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {i + 1} · {s.style === 'cover' ? 'Capa' : s.style === 'cta' ? 'CTA' : 'Conteúdo'}
            </div>
          </button>
        ))}

        <button
          onClick={addSlide}
          className="flex items-center justify-center gap-1 py-2 bg-green-600/20 border border-green-600/30 rounded-lg text-green-400 text-sm hover:bg-green-600/30 transition"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* ── Center - Preview ── */}
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Slide indicator */}
        <div className="text-xs text-gray-500">
          Slide <span className="text-white font-semibold">{selIdx + 1}</span> de{' '}
          <span className="text-white font-semibold">{slides.length}</span>
        </div>

        {/* Preview do slide */}
        <div className={`w-full max-w-md aspect-square rounded-xl overflow-hidden ${styleClasses[sel.style]} relative`}>
          <div className={`absolute inset-0 flex flex-col p-6 ${ta}`}>
            <div className="text-5xl mb-3">{sel.emoji}</div>
            <h3 className={`font-bold mb-3 text-xl ${ta}`}>
              {sel.title}
            </h3>
            <p className={`flex-1 ${fs} ${ta}`}>
              {sel.body}
            </p>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(-1)}
            disabled={selIdx === 0}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition"
          >
            <ChevronUp size={16} />
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelId(s.id)}
                className={`rounded-full transition-all ${
                  s.id === selId ? 'w-4 h-2 bg-purple-400' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => navigateTo(1)}
            disabled={selIdx === slides.length - 1}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap justify-center">
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
            onClick={() => move(selIdx, -1)}
            disabled={selIdx === 0}
            className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition text-xs"
          >
            ↑ Mover
          </button>

          <button
            onClick={() => move(selIdx, 1)}
            disabled={selIdx === slides.length - 1}
            className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition text-xs"
          >
            ↓ Mover
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

      {/* ── Right Panel - Editor ── */}
      <div className="w-full lg:w-72 bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider">
          Editar Slide {selIdx + 1}
        </div>

        {/* Emoji + Picker */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Emoji(s)</label>
          <div className="relative flex gap-2">
            <input
              type="text"
              value={sel.emoji}
              onChange={e => update(sel.id, { emoji: e.target.value })}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xl text-center"
            />
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              className={`p-2 rounded-lg border transition-colors ${
                showEmojiPicker
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
              title="Abrir seletor de emojis"
            >
              <Smile size={18} />
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={(e) => appendEmoji(e)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => update(sel.id, { emoji: '' })}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition"
            >
              Limpar
            </button>
          </div>
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

        {/* Tamanho da fonte */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tamanho da Fonte</label>
          <div className="flex gap-2">
            {([['sm', 'P'], ['md', 'M'], ['lg', 'G']] as const).map(([size, label]) => (
              <button
                key={size}
                onClick={() => update(sel.id, { fontSize: size })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  (sel.fontSize || 'md') === size
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Alinhamento */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Alinhamento</label>
          <div className="flex gap-2">
            {([
              ['left', <AlignLeft size={14} key="l" />],
              ['center', <AlignCenter size={14} key="c" />],
              ['right', <AlignRight size={14} key="r" />],
            ] as [string, React.ReactNode][]).map(([align, icon]) => (
              <button
                key={align}
                onClick={() => update(sel.id, { textAlign: align as 'left' | 'center' | 'right' })}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center transition ${
                  (sel.textAlign || (sel.style === 'cover' ? 'center' : 'left')) === align
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
