// Componente de Editor de Carrossel Profissional para LinkedIn
// Baseado no design do Claude - adaptado para nosso projeto

import { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';

// Temas de cores profissionais
const THEMES = {
  indigo: { bg: "#0f0f1a", accent: "#818cf8", text: "#f8fafc", sub: "#a5b4fc" },
  navy:   { bg: "#0a1628", accent: "#22d3ee", text: "#e2e8f0", sub: "#67e8f9" },
  ember:  { bg: "#1a0500", accent: "#f97316", text: "#fff7ed", sub: "#fdba74" },
  forest: { bg: "#021207", accent: "#4ade80", text: "#f0fdf4", sub: "#86efac" },
  rose:   { bg: "#1a0010", accent: "#f472b6", text: "#fdf2f8", sub: "#f9a8d4" },
};

const THEME_NAMES: Record<string, string> = { 
  indigo: "Índigo", 
  navy: "Navy", 
  ember: "Âmbar", 
  forest: "Floresta", 
  rose: "Rosa" 
};

let _id = 0;
const uid = () => `slide_${++_id}`;

export interface Slide {
  id: string;
  type: 'cover' | 'content' | 'cta';
  theme: keyof typeof THEMES;
  badge?: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  cta?: string;
  note?: string;
}

export const makeSlide = (type: Slide['type'] = 'content'): Slide => {
  if (type === 'cover') return {
    id: uid(), type: 'cover', theme: 'indigo',
    badge: 'Seu Negócio',
    title: 'Título Impactante do Carrossel',
    subtitle: 'Subtítulo que complementa a mensagem',
    bullets: [], cta: '', note: '1 / 5',
  };
  if (type === 'cta') return {
    id: uid(), type: 'cta', theme: 'navy',
    badge: '', title: 'Gostou do conteúdo?',
    subtitle: 'Compartilhe com quem precisa ver isso',
    bullets: [], cta: 'Siga para mais dicas', note: '@seunegocio',
  };
  return {
    id: uid(), type: 'content', theme: 'indigo',
    badge: '', title: 'Título do Slide',
    subtitle: '',
    bullets: ['Primeiro ponto importante', 'Segundo ponto relevante', 'Terceira informação'],
    cta: '', note: '',
  };
};

interface CarouselEditorProps {
  initialSlides?: Slide[];
  onChange?: (slides: Slide[]) => void;
  onCopyText?: () => void;
}

// Renderizador de Slide
function SlideRenderer({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  const t = THEMES[slide.theme] || THEMES.indigo;
  const S = 1080 * scale;
  const px = (n: number) => `${Math.round(n * scale)}px`;

  const wrap: React.CSSProperties = {
    width: S, height: S, background: t.bg, color: t.text,
    position: "relative", overflow: "hidden", flexShrink: 0,
    boxSizing: "border-box", fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const circle = (w: number, h: number, top: number | null, left: number | null, opacity = 0.18) => ({
    position: "absolute" as const, borderRadius: "50%", pointerEvents: "none",
    width: px(w), height: px(h), background: t.accent,
    filter: `blur(${px(w * 0.35)})`, opacity,
    ...(top !== null ? { top: px(top) } : {}),
    ...(left !== null ? { left: px(left) } : {}),
  });

  // Slide tipo CAPA
  if (slide.type === 'cover') {
    return (
      <div style={wrap}>
        <div style={circle(440, 440, -120, null, 0.22)} />
        <div style={circle(280, 280, null, -60, 0.14)} />
        {slide.badge && (
          <div style={{
            position: "absolute", top: px(60), left: px(60),
            background: t.accent + "22", border: `${scale}px solid ${t.accent}55`,
            borderRadius: px(100), padding: `${px(8)} ${px(22)}`,
            fontSize: px(19), color: t.accent, fontWeight: 600,
            letterSpacing: "0.07em", textTransform: "uppercase",
          }}>{slide.badge}</div>
        )}
        <div style={{ position: "absolute", bottom: px(110), left: px(68), right: px(68) }}>
          <div style={{ 
            width: px(56), height: px(6), background: t.accent, 
            borderRadius: px(3), marginBottom: px(36) 
          }} />
          <div style={{ 
            fontSize: px(72), fontWeight: 800, lineHeight: 1.08, 
            marginBottom: px(28), letterSpacing: "-0.025em" 
          }}>{slide.title}</div>
          {slide.subtitle && (
            <div style={{ fontSize: px(28), color: t.sub, fontWeight: 400, lineHeight: 1.45 }}>{slide.subtitle}</div>
          )}
        </div>
        {slide.note && (
          <div style={{ 
            position: "absolute", bottom: px(44), right: px(68), 
            fontSize: px(17), color: t.sub, opacity: 0.5 
          }}>{slide.note}</div>
        )}
      </div>
    );
  }

  // Slide tipo CTA
  if (slide.type === 'cta') {
    return (
      <div style={wrap}>
        <div style={circle(600, 600, null, null, 0.12)} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: px(90), textAlign: "center",
        }}>
          <div style={{ fontSize: px(72), marginBottom: px(32), lineHeight: 1 }}>🎯</div>
          <div style={{ fontSize: px(56), fontWeight: 800, lineHeight: 1.15, marginBottom: px(22) }}>{slide.title}</div>
          {slide.subtitle && (
            <div style={{ fontSize: px(27), color: t.sub, marginBottom: px(48), lineHeight: 1.4 }}>{slide.subtitle}</div>
          )}
          {slide.cta && (
            <div style={{
              background: t.accent, color: t.bg, fontWeight: 700,
              fontSize: px(24), padding: `${px(20)} ${px(44)}`, borderRadius: px(12),
              marginBottom: slide.note ? px(30) : 0,
            }}>👉 {slide.cta}</div>
          )}
          {slide.note && (
            <div style={{ fontSize: px(22), color: t.accent, fontWeight: 600, marginTop: px(8) }}>{slide.note}</div>
          )}
        </div>
      </div>
    );
  }

  // Slide tipo CONTEÚDO
  return (
    <div style={wrap}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: px(7), background: t.accent }} />
      <div style={circle(180, 180, -30, null, 0.12)} />
      <div style={{
        position: "absolute", inset: 0,
        padding: `${px(80)} ${px(70)} ${px(70)}`,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ fontSize: px(46), fontWeight: 800, lineHeight: 1.18, marginBottom: px(48), color: t.text }}>{slide.title}</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: px(26), flex: 1 }}>
          {(slide.bullets || []).map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: px(20) }}>
              <div style={{
                width: px(34), height: px(34), borderRadius: "50%",
                background: t.accent, color: t.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: px(16), fontWeight: 700, flexShrink: 0, marginTop: px(3),
              }}>{i + 1}</div>
              <div style={{ fontSize: px(29), lineHeight: 1.5, color: t.text }}>{b}</div>
            </div>
          ))}
        </div>
        
        {slide.note && (
          <div style={{ fontSize: px(16), color: t.sub, opacity: 0.45, marginTop: px(18) }}>{slide.note}</div>
        )}
      </div>
    </div>
  );
}

// Componente Principal
export default function CarouselEditor({ initialSlides, onChange, onCopyText }: CarouselEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides || [makeSlide('cover')]);
  const [selId, setSelId] = useState<string>(slides[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const sel = slides.find(s => s.id === selId) || slides[0];
  const selIdx = slides.findIndex(s => s.id === selId);

  const update = useCallback((id: string, patch: Partial<Slide>) => {
    const updated = slides.map(s => s.id === id ? { ...s, ...patch } : s);
    setSlides(updated);
    onChange?.(updated);
  }, [slides, onChange]);

  const addSlide = (type: Slide['type']) => {
    const s = makeSlide(type);
    const updated = [...slides, s];
    setSlides(updated);
    setSelId(s.id);
    onChange?.(updated);
  };

  const remove = (id: string) => {
    if (slides.length <= 1) return;
    const idx = slides.findIndex(s => s.id === id);
    const updated = slides.filter(s => s.id !== id);
    setSlides(updated);
    setSelId(slides[idx === 0 ? 1 : idx - 1]?.id || updated[0]?.id);
    onChange?.(updated);
  };

  const move = (idx: number, dir: number) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= slides.length) return;
    const a = [...slides];
    [a[idx], a[ni]] = [a[ni], a[idx]];
    setSlides(a);
    onChange?.(a);
  };

  // Drag & Drop
  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const a = [...slides];
    const [item] = a.splice(dragIdx, 1);
    a.splice(idx, 0, item);
    setSlides(a);
    setDragIdx(idx);
    onChange?.(a);
  };

  const updateBullet = (i: number, v: string) => {
    const b = [...(sel.bullets || [])];
    b[i] = v;
    update(sel.id, { bullets: b });
  };
  
  const addBullet = () => update(sel.id, { bullets: [...(sel.bullets || []), "Novo ponto"] });
  const removeBullet = (i: number) => update(sel.id, { bullets: (sel.bullets || []).filter((_, j) => j !== i) });

  const copyText = () => {
    const txt = slides.map((s, i) => {
      const lines = [`━━ Slide ${i + 1} (${s.type}) ━━`, s.title];
      if (s.subtitle) lines.push(s.subtitle);
      (s.bullets || []).forEach(b => lines.push(`• ${b}`));
      if (s.cta) lines.push(`→ ${s.cta}`);
      if (s.note) lines.push(s.note);
      return lines.join("\n");
    }).join("\n\n");
    navigator.clipboard.writeText(txt);
    setCopied(true);
    onCopyText?.();
    setTimeout(() => setCopied(false), 2200);
  };

  const THUMB_SCALE = 0.12;
  const PREV_SCALE = 0.45;
  const THUMB_SIZE = Math.round(1080 * THUMB_SCALE);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#07070f] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar - Thumbnails */}
      <div className="w-32 min-w-32 bg-[#0d0d1a] border-r border-white/5 flex flex-col">
        <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
          Slides ({slides.length})
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={e => onDragStart(e, i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              onClick={() => setSelId(s.id)}
              className={`mb-2 cursor-pointer rounded-md transition-all ${
                s.id === selId ? 'ring-2 ring-indigo-400' : 'ring-2 ring-transparent hover:ring-gray-700'
              } ${dragIdx === i ? 'opacity-40' : 'opacity-100'}`}
003e
              <div 
                className="overflow-hidden rounded" 
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
              >
                <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: "top left" }}>
                  <SlideRenderer slide={s} scale={1} />
                </div>
              </div>
              <div className="absolute bottom-1 left-1 bg-black/65 rounded text-[9px] text-gray-400 px-1">{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Add buttons */}
        <div className="p-2 border-t border-white/5 flex flex-col gap-1">
          {[
            ['cover', 'Capa'],
            ['content', 'Conteúdo'],
            ['cta', 'CTA']
          ].map(([t, l]) => (
            <button
              key={t}
              onClick={() => addSlide(t as Slide['type'])}
              className="flex items-center justify-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 text-[10px] py-1.5 hover:bg-indigo-500/20 transition"
            >
              <Plus size={10} /> {l}
            </button>
          ))}
        </div>
      </div>

      {/* Center - Preview */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a14] gap-5">
        <div 
          className="overflow-hidden rounded-lg shadow-2xl"
          style={{ width: 1080 * PREV_SCALE, height: 1080 * PREV_SCALE }}
        >
          <div style={{ transform: `scale(${PREV_SCALE})`, transformOrigin: "top left" }}>
            <SlideRenderer slide={sel} scale={1} />
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex gap-2">
          {slides.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelId(s.id)}
              className={`w-2 h-2 rounded-full transition ${
                s.id === selId ? 'bg-indigo-400' : 'bg-white/20 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 items-center">
          <button
            onClick={copyText}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              copied 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar texto'}
          </button>

          <button
            onClick={() => move(selIdx, -1)}
            disabled={selIdx === 0}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronUp size={14} />
          </button>

          <button
            onClick={() => move(selIdx, 1)}
            disabled={selIdx === slides.length - 1}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronDown size={14} />
          </button>

          <button
            onClick={() => remove(sel.id)}
            disabled={slides.length <= 1}
            className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 disabled:opacity-30 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="w-64 min-w-64 bg-[#0d0d1a] border-l border-white/5 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
          Editar Slide {selIdx + 1}
        </div>

        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Type */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Tipo</label>
            <select
              value={sel.type}
              onChange={e => update(sel.id, { type: e.target.value as Slide['type'] })}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="cover">Capa</option>
              <option value="content">Conteúdo</option>
              <option value="cta">CTA</option>
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Tema</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  title={THEME_NAMES[key]}
                  onClick={() => update(sel.id, { theme: key as keyof typeof THEMES })}
                  className={`w-6 h-6 rounded-full transition ${
                    sel.theme === key ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d1a]' : ''
                  }`}
                  style={{ background: t.accent, border: `2px solid ${t.bg}` }}
                />
              ))}
            </div>
          </div>

          {/* Badge (cover only) */}
          {sel.type === 'cover' && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Badge</label>
              <input
                value={sel.badge || ''}
                onChange={e => update(sel.id, { badge: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
                placeholder="Ex: Manual do Eletricista"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Título</label>
            <textarea
              value={sel.title}
              onChange={e => update(sel.id, { title: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          {/* Subtitle */}
          {(sel.type === 'cover' || sel.type === 'cta') && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Subtítulo</label>
              <textarea
                value={sel.subtitle || ''}
                onChange={e => update(sel.id, { subtitle: e.target.value })}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
          )}

          {/* Bullets */}
          {sel.type === 'content' && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Pontos</label>
              <div className="flex flex-col gap-1">
                {(sel.bullets || []).map((b, i) => (
                  <div key={i} className="flex gap-1">
                    <textarea
                      value={b}
                      onChange={e => updateBullet(i, e.target.value)}
                      rows={2}
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50 resize-none"
                    />
                    <button
                      onClick={() => removeBullet(i)}
                      className="p-1 text-gray-500 hover:text-red-400 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(sel.bullets || []).length < 5 && (
                  <button
                    onClick={addBullet}
                    className="py-1.5 bg-indigo-500/10 border border-dashed border-indigo-500/30 rounded text-indigo-400 text-xs hover:bg-indigo-500/20 transition"
                  >
                    + Adicionar ponto
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          {sel.type === 'cta' && (
            <>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Botão CTA</label>
                <input
                  value={sel.cta || ''}
                  onChange={e => update(sel.id, { cta: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
                  placeholder="Ex: Siga para mais dicas"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">@handle</label>
                <input
                  value={sel.note || ''}
                  onChange={e => update(sel.id, { note: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
                  placeholder="@seunegocio"
                />
              </div>
            </>
          )}

          {/* Note */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Nota / Contador</label>
            <input
              value={sel.note || ''}
              onChange={e => update(sel.id, { note: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"
              placeholder="Ex: 2 / 5"
            />
          </div>
        </div>

        {/* Tips */}
        <div className="mx-4 mb-4 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-1">Dica</div>
          <div className="text-[10px] text-gray-500 leading-relaxed">
            Carrosséis com 5–8 slides performam melhor. Use capa forte + 3–5 conteúdos + CTA no final.
          </div>
        </div>
      </div>
    </div>
  );
}
