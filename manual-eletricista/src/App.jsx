import { useState, useEffect, useRef } from "react";

const APP_VERSION = "4.0.0";
const SITE_ID = "7626c051-f75b-45e5-9319-057e2446df8b";

// ── STORAGE LOCAL ─────────────────────────────────────────────────────────
const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── TEMA ──────────────────────────────────────────────────────────────────
const c = {
  bg: "#0a0e1a", bg2: "#0f1629", bg3: "#162033", bg4: "#1e2d45",
  border: "#1e3a5f", blue: "#3b82f6", amber: "#f59e0b",
  green: "#22c55e", red: "#ef4444", purple: "#8b5cf6",
  text: "#e2e8f0", muted: "#64748b", subtle: "#94a3b8",
};

// ── CONTEXTO DO NEGÓCIO ───────────────────────────────────────────────────
const BUSINESS = `
EMPRESA: Manual do Eletricista | DONO: Jonas Dimes Breitenbach | Dourados, MS
NICHO: Eletricistas e técnicos industriais brasileiros
PRODUTOS:
- Vol.1 Comandos Elétricos Industriais: https://go.hotmart.com/E104935068T
- Vol.2 Dimensionamento Elétrico: https://go.hotmart.com/A105044012Q
- Vol.3 Instalações/NBR5410: https://go.hotmart.com/H105179973J
- App Orçamento em Campo: R$19,90 lançamento (15/04/2026) → depois R$25, acesso vitalício
FUNIL: LinkedIn Post → Comentário → DM → Site → Compra
CTAs PADRÃO: "Comenta CLP" | "Comenta QUEDA" | "Comenta APP" | "Comenta PLANILHA"
ESTRUTURA POST LINKEDIN: 1.Gancho forte 2.Explicação simples 3.Consequência real 4.Solução prática 5.CTA
REGRA: Tom direto, técnico, de eletricista para eletricista. Máx 250 palavras.
`;

const TONES = [
  { id: "tecnico",      label: "Técnico",      icon: "📐", desc: "Preciso e detalhado" },
  { id: "curiosidade",  label: "Curiosidade",  icon: "⚡", desc: "Provoca reflexão" },
  { id: "autoridade",   label: "Autoridade",   icon: "🎯", desc: "Posiciona como especialista" },
  { id: "direto",       label: "Direto",       icon: "🔧", desc: "Objetivo e prático" },
  { id: "inspiracional",label: "Inspiracional",icon: "🚀", desc: "Motiva e engaja" },
];

const PRODUCTS = [
  { id: "", label: "Nenhum (post educativo)" },
  { id: "app", label: "App Orçamento — R$19,90" },
  { id: "vol1", label: "Vol.1 — Comandos Elétricos" },
  { id: "vol2", label: "Vol.2 — Dimensionamento" },
  { id: "vol3", label: "Vol.3 — Instalações/NBR5410" },
];

const CATEGORIES = ["Lançamento App", "Educativo", "Dor do cliente", "CLP/Automação", "Dimensionamento", "NBR 5410", "Orçamento", "Carreira"];

// ── API CALLS ─────────────────────────────────────────────────────────────
async function claudeAPI(system, userMsg, history = []) {
  const key = ls.get("ak", "");
  if (!key) throw new Error("Configure sua chave Anthropic na aba ⚙️ Config");
  const messages = [...history.slice(-8), { role: "user", content: userMsg }];
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system, messages, _apiKey: key }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error?.message || JSON.stringify(data.error));
  return data.content?.[0]?.text || "";
}

async function postLinkedIn(text) {
  const res = await fetch("/api/linkedin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, _liToken: ls.get("lt", ""), _liUrn: ls.get("lu", "") }),
  });
  return res.json();
}

async function generateImage(prompt) {
  const res = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  return data.data?.[0]?.url || null;
}

async function apiPosts(method, body = null) {
  const res = await fetch("/api/posts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function apiHistory(method, body = null) {
  const res = await fetch("/api/history", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── COMPONENTS ────────────────────────────────────────────────────────────
const Spinner = ({ size = 16 }) => <span style={{ display: "inline-block", width: size, height: size, border: `2px solid #ffffff33`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />;

const Badge = ({ children, color = c.blue, small }) => (
  <span style={{ background: color + "22", border: `1px solid ${color}44`, color, borderRadius: 20, padding: small ? "2px 8px" : "3px 12px", fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{children}</span>
);

const Btn = ({ children, onClick, disabled, variant = "primary", color, small, full, icon }) => {
  const variants = {
    primary: { bg: c.blue, fg: "#fff" },
    amber:   { bg: c.amber, fg: "#000" },
    green:   { bg: c.green, fg: "#fff" },
    ghost:   { bg: "transparent", fg: c.subtle },
    danger:  { bg: c.red, fg: "#fff" },
  };
  const v = color ? { bg: color, fg: "#fff" } : variants[variant] || variants.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
      background: disabled ? c.bg4 : v.bg, color: disabled ? c.muted : v.fg,
      border: variant === "ghost" ? `1px solid ${c.border}` : "none",
      borderRadius: 8, padding: small ? "5px 12px" : "9px 18px",
      fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "default" : "pointer",
      width: full ? "100%" : "auto", transition: "opacity .15s", opacity: disabled ? 0.6 : 1,
      whiteSpace: "nowrap",
    }}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, ...style }}>{children}</div>
);

const Input = ({ label, value, onChange, placeholder, type = "text", rows, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: c.subtle, letterSpacing: 0.5 }}>{label}</label>}
    {rows ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none", ...style }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, outline: "none", ...style }} />
    )}
  </div>
);

// ── STRIP MARKDOWN ────────────────────────────────────────────────────────
const strip = (t) => t?.replace(/#{1,6}\s*/g, "").replace(/\*\*/g, "").replace(/\*/g, "").trim() || "";

// ── CONTENT GENERATOR ────────────────────────────────────────────────────
const ContentPage = ({ onSchedule }) => {
  const [platform, setPlatform] = useState("linkedin");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("direto");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("Educativo");
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("07:30");
  const [schedSaved, setSchedSaved] = useState(false);
  const [histLocal, setHistLocal] = useState(() => ls.get("local_history", []));

  const saveHist = (post) => {
    const updated = [{ id: Date.now(), ...post, ts: new Date().toISOString() }, ...histLocal].slice(0, 200);
    setHistLocal(updated); ls.set("local_history", updated);
  };

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setResult(null); setImageUrl(null);
    const productMap = { app: "App Orçamento R$19,90", vol1: "Vol.1 Comandos", vol2: "Vol.2 Dimensionamento", vol3: "Vol.3 NBR5410" };
    const isLI = platform === "linkedin";
    const system = `Você é especialista em criação de conteúdo para ${isLI ? "LinkedIn" : "Facebook"} no nicho de eletricistas industriais.\n${BUSINESS}\nCrie um post com as seguintes especificações:\n- Plataforma: ${isLI ? "LinkedIn" : "Facebook"}\n- Tom: ${tone}\n- ${product ? `Produto a mencionar: ${productMap[product]}` : "Post educativo (sem venda direta)"}\n\nFORMATO OBRIGATÓRIO (sem markdown, sem asteriscos, texto limpo):\n${isLI ? `TÍTULO: [título curto]\n\nPOST LINKEDIN:\n[texto completo limpo — sem #, sem *, pronto para copiar]\n\nCTA: Comenta [PALAVRA]\nHORÁRIO: 07:30\nESTIMATIVA: [~X impressões]` : `TÍTULO: [descrição curta]\n\nVERSÃO PÁGINA:\n[texto para página — pode mencionar produto]\n\nVERSÃO GRUPOS:\n[texto adaptado para grupos técnicos — foco em ajuda, sem venda direta]\n\nHORÁRIO: 12:00`}`;

    try {
      const reply = await claudeAPI(system, `Tema: ${topic}`);
      setResult(reply);
    } catch (e) {
      setResult(`❌ Erro: ${e.message}`);
    }
    setBusy(false);
  };

  const generateImg = async () => {
    if (!result) return;
    setGenImg(true);
    const prompt = `Professional electrical engineering infographic for LinkedIn. Dark blue background, yellow/orange accents. Topic: ${topic}. Clean, technical, modern design. No text in image.`;
    try {
      const url = await generateImage(prompt);
      setImageUrl(url);
    } catch (e) { alert("Erro ao gerar imagem: " + e.message); }
    setGenImg(false);
  };

  const copy = () => {
    const text = strip(result?.match(/(?:POST LINKEDIN:|VERSÃO PÁGINA:)\n([\s\S]+?)(?:\n\n[A-Z]|$)/)?.[1] || result);
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    saveHist({ texto: text, plataforma: platform, categoria: category, status: "copiado" });
  };

  const postLI = async () => {
    const text = strip(result?.match(/POST LINKEDIN:\n([\s\S]+?)(?:\n\nCTA:|$)/)?.[1] || result);
    setPosting(true);
    try {
      const r = await postLinkedIn(text);
      if (r.success) { alert("✅ Postado no LinkedIn!"); saveHist({ texto: text, plataforma: "linkedin", categoria: category, status: "publicado" }); }
      else alert("❌ " + (r.error || JSON.stringify(r.data)));
    } catch (e) { alert("❌ " + e.message); }
    setPosting(false);
  };

  const schedule = async () => {
    if (!schedDate || !schedTime) return;
    const scheduledAt = new Date(`${schedDate}T${schedTime}:00`).toISOString();
    const text = strip(result?.match(/(?:POST LINKEDIN:|VERSÃO PÁGINA:)\n([\s\S]+?)(?:\n\n[A-Z]|$)/)?.[1] || result);
    try {
      await apiPosts("POST", { texto: text, plataforma: platform, scheduledAt, categoria: category, imagemUrl: imageUrl });
      setSchedSaved(true); setTimeout(() => { setSchedSaved(false); setScheduleOpen(false); }, 2000);
      onSchedule?.();
    } catch (e) { alert("Erro: " + e.message); }
  };

  const cleanPost = result ? strip(result?.match(/(?:POST LINKEDIN:|VERSÃO PÁGINA:)\n([\s\S]+?)(?:\n\n[A-Z]|$)/)?.[1] || result) : "";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, height: "100%", overflow: "hidden" }}>
      {/* PAINEL ESQUERDO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: c.text, marginBottom: 16 }}>⚙️ Configurar Post</div>

          {/* Plataforma */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subtle, marginBottom: 8 }}>PLATAFORMA</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "linkedin", label: "💼 LinkedIn" }, { id: "facebook", label: "📘 Facebook" }].map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: platform === p.id ? `1px solid ${c.blue}` : `1px solid ${c.border}`, background: platform === p.id ? c.blue + "22" : c.bg3, color: platform === p.id ? c.blue : c.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tema */}
          <div style={{ marginBottom: 14 }}>
            <Input label="TEMA DO POST *" value={topic} onChange={setTopic} placeholder="Ex: eletricista perde cliente por demorar o orçamento" rows={3} />
          </div>

          {/* Tom */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subtle, marginBottom: 8 }}>TOM</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: "10px", borderRadius: 8, border: tone === t.id ? `1px solid ${c.blue}` : `1px solid ${c.border}`, background: tone === t.id ? c.blue + "18" : c.bg3, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tone === t.id ? c.blue : c.text }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: c.muted }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Produto */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subtle, marginBottom: 8 }}>PRODUTO (opcional)</div>
            <select value={product} onChange={e => setProduct(e.target.value)} style={{ width: "100%", background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, outline: "none" }}>
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* Categoria */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.subtle, marginBottom: 8 }}>CATEGORIA</div>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, outline: "none" }}>
              {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>

          <Btn onClick={generate} disabled={busy || !topic.trim()} full variant="primary" icon={busy ? null : "✨"}>
            {busy ? <><Spinner /> Gerando...</> : "Gerar com IA"}
          </Btn>
        </Card>
      </div>

      {/* PAINEL DIREITO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        {!result && !busy && (
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: c.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
            <div style={{ fontWeight: 700, color: c.text, marginBottom: 4 }}>Configure e gere seu post</div>
            <div style={{ fontSize: 13 }}>Preencha o tema e clique em Gerar com IA</div>
          </Card>
        )}

        {busy && (
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
            <Spinner size={32} />
            <div style={{ color: c.subtle, fontSize: 14 }}>Gerando post...</div>
          </Card>
        )}

        {result && !busy && (
          <>
            {/* Texto gerado */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: c.text }}>📝 Post Gerado</div>
                <Badge color={platform === "linkedin" ? c.blue : "#1877f2"}>{platform === "linkedin" ? "💼 LinkedIn" : "📘 Facebook"}</Badge>
              </div>
              <div style={{ background: c.bg3, borderRadius: 8, padding: 16, fontSize: 13, color: c.subtle, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto", marginBottom: 14, animation: "fadeIn .3s ease" }}>
                {cleanPost || strip(result)}
              </div>

              {/* Imagem */}
              {imageUrl && (
                <div style={{ marginBottom: 14 }}>
                  <img src={imageUrl} alt="Imagem gerada" style={{ width: "100%", borderRadius: 8, maxHeight: 260, objectFit: "cover" }} />
                </div>
              )}

              {/* Ações */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={copy} variant="ghost" small icon={copied ? "✓" : "📋"}>{copied ? "Copiado!" : "Copiar texto"}</Btn>
                {platform === "linkedin" && <Btn onClick={postLI} disabled={posting} color="#0a66c2" small icon="💼">{posting ? <><Spinner size={12} /> Postando...</> : "Postar LinkedIn"}</Btn>}
                {platform === "facebook" && <Btn onClick={() => { navigator.clipboard.writeText(cleanPost); setCopied(true); setTimeout(() => setCopied(false), 2000); }} color="#1877f2" small icon="📘">Copiar p/ Facebook</Btn>}
                <Btn onClick={generateImg} disabled={genImg} variant="ghost" small icon="🎨">{genImg ? <><Spinner size={12} /> Gerando...</> : "Gerar Imagem"}</Btn>
                <Btn onClick={() => setScheduleOpen(true)} variant="amber" small icon="📅">Agendar</Btn>
              </div>
            </Card>

            {/* Painel de agendamento */}
            {scheduleOpen && (
              <Card style={{ border: `1px solid ${c.amber}55` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: c.amber, marginBottom: 14 }}>📅 Agendar Publicação</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <Input label="DATA" value={schedDate} onChange={setSchedDate} type="date" />
                  <Input label="HORÁRIO" value={schedTime} onChange={setSchedTime} type="time" />
                </div>
                <div style={{ background: c.bg3, borderRadius: 8, padding: 12, fontSize: 12, color: c.subtle, marginBottom: 14 }}>
                  ⏰ O sistema vai publicar automaticamente no horário marcado (verificação a cada 15 min)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={schedule} variant="amber" icon={schedSaved ? "✓" : "📅"}>{schedSaved ? "Agendado!" : "Confirmar Agendamento"}</Btn>
                  <Btn onClick={() => setScheduleOpen(false)} variant="ghost">Cancelar</Btn>
                </div>
              </Card>
            )}

            {/* Versão Facebook (se foi gerado para LI mas quer adaptar) */}
            {result.includes("VERSÃO GRUPOS:") && (
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1877f2", marginBottom: 10 }}>📘 Versão Grupos Facebook</div>
                <div style={{ background: c.bg3, borderRadius: 8, padding: 12, fontSize: 13, color: c.subtle, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                  {strip(result.match(/VERSÃO GRUPOS:\n([\s\S]+?)(?:\n\nHORÁRIO:|$)/)?.[1] || "")}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Btn onClick={() => { navigator.clipboard.writeText(strip(result.match(/VERSÃO GRUPOS:\n([\s\S]+?)(?:\n\nHORÁRIO:|$)/)?.[1] || "")); }} color="#1877f2" small icon="📋">Copiar versão grupos</Btn>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Histórico local recente */}
        {histLocal.length > 0 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 13, color: c.text, marginBottom: 12 }}>🕐 Recente</div>
            {histLocal.slice(0, 3).map(h => (
              <div key={h.id} style={{ background: c.bg3, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <Badge color={h.plataforma === "linkedin" ? c.blue : "#1877f2"} small>{h.plataforma}</Badge>
                  <Badge color={h.status === "publicado" ? c.green : c.amber} small>{h.status}</Badge>
                  <span style={{ color: c.muted, marginLeft: "auto" }}>{new Date(h.ts).toLocaleDateString("pt-BR")}</span>
                </div>
                <div style={{ color: c.subtle, lineHeight: 1.5 }}>{h.texto?.slice(0, 100)}...</div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

// ── CALENDAR ──────────────────────────────────────────────────────────────
const CalendarPage = ({ refresh }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState("list");

  const load = async () => {
    setLoading(true);
    try { const data = await apiPosts("GET"); setPosts(Array.isArray(data) ? data : []); }
    catch { setPosts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const del = async (id) => {
    setDeleting(id);
    await apiPosts("DELETE", { id });
    await load();
    setDeleting(null);
  };

  const statusColor = { pendente: c.amber, publicado: c.green, erro: c.red };
  const statusIcon  = { pendente: "⏳", publicado: "✅", erro: "❌" };

  const pending   = posts.filter(p => p.status === "pendente");
  const published = posts.filter(p => p.status === "publicado");
  const errors    = posts.filter(p => p.status === "erro");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: c.amber, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{pending.length}</div>
            <div style={{ color: c.muted, fontSize: 11 }}>Agendados</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: c.green, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{published.length}</div>
            <div style={{ color: c.muted, fontSize: 11 }}>Publicados</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: c.red, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{errors.length}</div>
            <div style={{ color: c.muted, fontSize: 11 }}>Erros</div>
          </div>
        </div>
        <Btn onClick={load} variant="ghost" small icon="🔄">Atualizar</Btn>
      </div>

      {loading ? (
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
          <Spinner size={24} /><span style={{ color: c.muted }}>Carregando...</span>
        </Card>
      ) : posts.length === 0 ? (
        <Card style={{ textAlign: "center", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, color: c.text, marginBottom: 4 }}>Nenhum post agendado</div>
          <div style={{ color: c.muted, fontSize: 13 }}>Gere um post e clique em "Agendar"</div>
        </Card>
      ) : (
        <>
          {/* Pendentes */}
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.amber, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>⏳ Agendados ({pending.length})</div>
              {pending.map(post => <PostCard key={post.id} post={post} onDelete={del} deleting={deleting} />)}
            </div>
          )}
          {/* Publicados */}
          {published.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.green, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>✅ Publicados ({published.length})</div>
              {published.map(post => <PostCard key={post.id} post={post} onDelete={del} deleting={deleting} />)}
            </div>
          )}
          {/* Erros */}
          {errors.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.red, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>❌ Erros ({errors.length})</div>
              {errors.map(post => <PostCard key={post.id} post={post} onDelete={del} deleting={deleting} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PostCard = ({ post, onDelete, deleting }) => {
  const [exp, setExp] = useState(false);
  const [cop, setCop] = useState(false);
  const sc = { pendente: c.amber, publicado: c.green, erro: c.red };
  const copy = () => { navigator.clipboard.writeText(post.texto); setCop(true); setTimeout(() => setCop(false), 2000); };

  return (
    <Card style={{ marginBottom: 10, border: `1px solid ${sc[post.status]}33` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }} onClick={() => setExp(!exp)}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: sc[post.status] + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {post.plataforma === "linkedin" ? "💼" : "📘"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <Badge color={sc[post.status]} small>{post.status}</Badge>
            <Badge color={post.plataforma === "linkedin" ? c.blue : "#1877f2"} small>{post.plataforma}</Badge>
            {post.categoria && <Badge color={c.purple} small>{post.categoria}</Badge>}
          </div>
          <div style={{ color: c.subtle, fontSize: 12 }}>{post.texto?.slice(0, 80)}...</div>
          <div style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>
            📅 {new Date(post.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <span style={{ color: c.muted, fontSize: 12 }}>{exp ? "▲" : "▼"}</span>
      </div>
      {exp && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
          <div style={{ background: c.bg3, borderRadius: 8, padding: 12, fontSize: 13, color: c.subtle, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
            {post.texto}
          </div>
          {post.erro && <div style={{ color: c.red, fontSize: 12, marginBottom: 10 }}>⚠️ {post.erro}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={copy} variant="ghost" small icon={cop ? "✓" : "📋"}>{cop ? "Copiado!" : "Copiar"}</Btn>
            <Btn onClick={() => onDelete(post.id)} disabled={deleting === post.id} variant="danger" small icon="🗑">{deleting === post.id ? "..." : "Excluir"}</Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── HISTORY ───────────────────────────────────────────────────────────────
const HistoryPage = () => {
  const [remote, setRemote] = useState([]);
  const [local]  = useState(() => ls.get("local_history", []));
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cop, setCop] = useState(null);

  useEffect(() => {
    apiHistory("GET").then(d => { setRemote(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const all = [...remote, ...local.map(l => ({ ...l, source: "local" }))];
  const filtered = all.filter(p => {
    if (filter === "linkedin" && p.plataforma !== "linkedin") return false;
    if (filter === "facebook" && p.plataforma !== "facebook") return false;
    if (search && !p.texto?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.publicadoEm || b.ts) - new Date(a.publicadoEm || a.ts));

  const copy = (id, text) => { navigator.clipboard.writeText(text); setCop(id); setTimeout(() => setCop(null), 2000); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar no histórico..." style={{ flex: 1, minWidth: 180, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 12px", color: c.text, fontSize: 13, outline: "none" }} />
        {["todos", "linkedin", "facebook"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? c.blue : c.bg3, color: filter === f ? "#fff" : c.muted, border: `1px solid ${filter === f ? c.blue : c.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
            {f === "todos" ? `Todos (${all.length})` : f === "linkedin" ? "💼 LinkedIn" : "📘 Facebook"}
          </button>
        ))}
      </div>
      {loading && <Card style={{ textAlign: "center", color: c.muted }}><Spinner /> Carregando...</Card>}
      {!loading && filtered.length === 0 && <Card style={{ textAlign: "center", color: c.muted, padding: 40 }}>Nenhum post encontrado</Card>}
      {filtered.map((p, i) => (
        <Card key={p.id || i}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <span>{p.plataforma === "linkedin" ? "💼" : "📘"}</span>
            <Badge color={p.plataforma === "linkedin" ? c.blue : "#1877f2"} small>{p.plataforma}</Badge>
            {p.status && <Badge color={p.status === "publicado" ? c.green : p.status === "erro" ? c.red : c.amber} small>{p.status}</Badge>}
            {p.categoria && <Badge color={c.purple} small>{p.categoria}</Badge>}
            {p.source === "local" && <Badge color={c.muted} small>local</Badge>}
            <span style={{ marginLeft: "auto", color: c.muted, fontSize: 11 }}>
              {new Date(p.publicadoEm || p.ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div style={{ background: c.bg3, borderRadius: 8, padding: 10, fontSize: 12, color: c.subtle, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto", marginBottom: 8 }}>
            {p.texto?.slice(0, 200)}{(p.texto?.length || 0) > 200 ? "..." : ""}
          </div>
          <Btn onClick={() => copy(p.id || i, p.texto)} variant="ghost" small icon={cop === (p.id || i) ? "✓" : "📋"}>{cop === (p.id || i) ? "Copiado!" : "Copiar"}</Btn>
        </Card>
      ))}
    </div>
  );
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [metrics, setMetrics] = useState(() => ls.get("metrics_v4", { impressoes: "", engajamento: "", seguidores: "", comentarios: "", vendas_app: "", vendas_v1: "", vendas_v2: "", vendas_v3: "", visitas: "", conversao: "" }));
  const [insight, setInsight] = useState("");
  const [busy, setBusy] = useState(false);
  const local = ls.get("local_history", []);
  const dias = Math.max(0, Math.ceil((new Date("2026-04-15") - new Date()) / 86400000));

  const save = (k, v) => { const m = { ...metrics, [k]: v }; setMetrics(m); ls.set("metrics_v4", m); };

  const analisar = async () => {
    setBusy(true);
    const mtext = Object.entries(metrics).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ");
    const system = `Você é o Analytics Agent do Manual do Eletricista.\nNICHO: Eletricistas industriais brasileiros.\nAPP lança 15/04/2026 a R$19,90.\nAnalise as métricas e gere insights acionáveis.\nEstrutura:\n## DIAGNÓSTICO\n## O QUE FUNCIONA\n## O QUE NÃO FUNCIONA\n## AÇÃO PRÓXIMAS 24H\n## TESTE DA SEMANA`;
    try { setInsight(await claudeAPI(system, `Métricas: ${mtext}`)); }
    catch (e) { setInsight("❌ " + e.message); }
    setBusy(false);
  };

  const Stat = ({ label, val, color }) => (
    <div style={{ background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ color: c.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || c.amber, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>{val ?? "—"}</div>
    </div>
  );

  const MI = ({ label, field, unit }) => (
    <div>
      <div style={{ color: c.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input type="text" value={metrics[field]} onChange={e => save(field, e.target.value)} placeholder="—" style={{ flex: 1, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 6, padding: "7px 9px", color: c.text, fontSize: 13, fontFamily: "monospace", fontWeight: 700, outline: "none" }} />
        {unit && <span style={{ color: c.muted, fontSize: 11 }}>{unit}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <Stat label="Posts Gerados" val={local.length} color={c.blue} />
        <Stat label="Publicados" val={local.filter(p => p.status === "publicado").length} color={c.green} />
        <Stat label="Copiados" val={local.filter(p => p.status === "copiado").length} color={c.purple} />
        <div style={{ background: "#7c1d1d22", border: "1px solid #ef444433", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ color: c.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Lançamento App</div>
          <div style={{ color: c.red, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{dias > 0 ? `${dias}d 🚀` : "🎉 Lançado!"}</div>
        </div>
      </div>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, color: c.text, marginBottom: 14, borderLeft: `2px solid ${c.green}`, paddingLeft: 10 }}>📊 Inserir Métricas para Análise IA</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
          <MI label="Impressões" field="impressoes" />
          <MI label="Engajamento" field="engajamento" unit="%" />
          <MI label="Seguidores" field="seguidores" />
          <MI label="Comentários" field="comentarios" />
          <MI label="Vendas App" field="vendas_app" />
          <MI label="Vendas Vol.1" field="vendas_v1" />
          <MI label="Vendas Vol.2" field="vendas_v2" />
          <MI label="Vendas Vol.3" field="vendas_v3" />
          <MI label="Visitas Site" field="visitas" />
          <MI label="Conversão" field="conversao" unit="%" />
        </div>
        <Btn onClick={analisar} disabled={busy} color={c.green} icon="🤖">{busy ? <><Spinner size={14} /> Analisando...</> : "Analisar com IA"}</Btn>
      </Card>

      {insight && (
        <Card style={{ border: `1px solid ${c.green}33` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: c.green, marginBottom: 12 }}>📊 Analytics Agent</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: c.subtle, whiteSpace: "pre-wrap" }}>
            {insight.replace(/##\s+/g, "\n\n").replace(/\*\*/g, "").trim()}
          </div>
        </Card>
      )}
    </div>
  );
};

// ── CONFIG ────────────────────────────────────────────────────────────────
const ConfigPage = () => {
  const [ak, setAk] = useState(ls.get("ak", ""));
  const [lt, setLt] = useState(ls.get("lt", ""));
  const [lu, setLu] = useState(ls.get("lu", ""));
  const [saved, setSaved] = useState(false);
  const [fetchingUrn, setFetchingUrn] = useState(false);
  const [urnMsg, setUrnMsg] = useState("");

  const save = () => { ls.set("ak", ak); ls.set("lt", lt); ls.set("lu", lu); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const buscarUrn = async () => {
    if (!lt) { setUrnMsg("⚠️ Cole o LinkedIn Token primeiro"); return; }
    setFetchingUrn(true); setUrnMsg("");
    try {
      const res = await fetch("/api/linkedin-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _liToken: lt }),
      });
      const data = await res.json();
      if (data.success) {
        setLu(data.urn); ls.set("lu", data.urn);
        setUrnMsg("✅ URN encontrado: " + data.urn + " (" + data.nome + ")");
      } else {
        setUrnMsg("❌ " + (data.error || "Erro ao buscar URN"));
      }
    } catch (e) { setUrnMsg("❌ " + e.message); }
    setFetchingUrn(false);
  };

  const F = ({ label, value, onChange, link, linkLabel }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: c.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input type="password" value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
      {link && <div style={{ marginTop: 6 }}><a href={link} target="_blank" style={{ color: c.blue, fontSize: 12 }}>→ {linkLabel}</a></div>}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, color: c.text, marginBottom: 4 }}>🔑 Configurações de API</div>
        <div style={{ color: c.muted, fontSize: 12, marginBottom: 18 }}>Salvas localmente no navegador.</div>
        <F label="Anthropic API Key *" value={ak} onChange={setAk} link="https://console.anthropic.com/settings/keys" linkLabel="Pegar em console.anthropic.com" />
        <F label="LinkedIn Access Token" value={lt} onChange={setLt} link="https://www.linkedin.com/developers/apps" linkLabel="linkedin.com/developers → Auth → OAuth tokens" />
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: c.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>LINKEDIN AUTHOR URN</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="text" value={lu} onChange={e => setLu(e.target.value)} placeholder="urn:li:person:..." style={{ flex: 1, background: c.bg3, border: "1px solid " + c.border, borderRadius: 8, padding: "10px 13px", color: c.text, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
            <button onClick={buscarUrn} disabled={fetchingUrn} style={{ background: c.blue, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: fetchingUrn ? "default" : "pointer", whiteSpace: "nowrap", opacity: fetchingUrn ? 0.7 : 1 }}>
              {fetchingUrn ? "⟳ Buscando..." : "🔍 Buscar URN"}
            </button>
          </div>
          {urnMsg && <div style={{ fontSize: 12, padding: "8px 10px", background: c.bg3, borderRadius: 6, color: urnMsg.startsWith("✅") ? c.green : c.red }}>{urnMsg}</div>}
        </div>
        <Btn onClick={save} color={saved ? c.green : c.blue} icon={saved ? "✓" : "💾"} full>{saved ? "✅ Salvo!" : "Salvar Configurações"}</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, color: c.green, marginBottom: 12 }}>✅ Status</div>
        {[
          { l: "Anthropic API Key", ok: !!ak, desc: "Necessária para geração de conteúdo" },
          { l: "LinkedIn Token", ok: !!lt, desc: "Para postagem automática" },
          { l: "LinkedIn URN", ok: !!lu, desc: "Seu ID de perfil" },
        ].map(item => (
          <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
            <span style={{ color: item.ok ? c.green : c.red, fontWeight: 800 }}>{item.ok ? "✓" : "✗"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{item.l}</div>
              <div style={{ fontSize: 11, color: c.muted }}>{item.desc}</div>
            </div>
            <span style={{ marginLeft: "auto", color: item.ok ? c.green : c.red, fontSize: 11 }}>{item.ok ? "ok" : "pendente"}</span>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, color: c.text, marginBottom: 8 }}>🔄 Versão {APP_VERSION}</div>
        <div style={{ color: c.muted, fontSize: 13, lineHeight: 1.7 }}>
          Sistema auto-deploy via GitHub → Netlify.<br/>
          Dados locais não são perdidos em atualizações.<br/>
          Agendamento: cron a cada 15 minutos.
        </div>
      </Card>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────
const PAGES = [
  { id: "content",  icon: "✍️", label: "Conteúdo" },
  { id: "calendar", icon: "📅", label: "Calendário" },
  { id: "history",  icon: "📜", label: "Histórico" },
  { id: "dashboard",icon: "📊", label: "Dashboard" },
  { id: "config",   icon: "⚙️", label: "Config" },
];

export default function App() {
  const [page, setPage] = useState("content");
  const [sidebar, setSidebar] = useState(true);
  const [schedRefresh, setSchedRefresh] = useState(0);
  const ak = ls.get("ak", "");
  const dias = Math.max(0, Math.ceil((new Date("2026-04-15") - new Date()) / 86400000));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: c.bg, color: c.text, overflow: "hidden" }}>
      <style>{`* { box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } } select, input, textarea { color: #e2e8f0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 4px; }`}</style>

      {/* HEADER */}
      <header style={{ background: c.bg2, borderBottom: `1px solid ${c.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
        <button onClick={() => setSidebar(!sidebar)} style={{ background: "none", border: "none", color: c.muted, cursor: "pointer", fontSize: 20, padding: "4px" }}>☰</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: c.amber, fontWeight: 900, fontSize: 16, letterSpacing: 0.5 }}>⚡ MANUAL DO ELETRICISTA</span>
          <span style={{ background: c.blue + "22", color: c.blue, border: `1px solid ${c.blue}44`, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>v{APP_VERSION}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {dias > 0 && <span style={{ background: "#7c1d1d22", border: "1px solid #ef444433", color: "#f87171", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>🚀 {dias}d lançamento</span>}
          {!ak && <button onClick={() => setPage("config")} style={{ background: c.red + "22", border: `1px solid ${c.red}44`, color: c.red, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⚙️ Configurar API</button>}
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ak ? c.green : c.red, boxShadow: `0 0 6px ${ak ? c.green : c.red}`, display: "block" }} />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        {sidebar && (
          <nav style={{ width: 190, background: c.bg2, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            {PAGES.map(p => (
              <button key={p.id} onClick={() => setPage(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: page === p.id ? c.blue + "18" : "none", border: "none", borderLeft: page === p.id ? `2px solid ${c.blue}` : "2px solid transparent", color: page === p.id ? c.blue : c.muted, cursor: "pointer", fontSize: 14, fontWeight: page === p.id ? 700 : 500, textAlign: "left", width: "100%", transition: "all .1s" }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>{p.label}
              </button>
            ))}
            <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.muted, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: c.text }}>Jonas Breitenbach</div>
              <div>15/04 · R$19,90 → R$25</div>
              <div style={{ color: c.blue, fontSize: 10, marginTop: 4 }}>auto-deploy ativo ✓</div>
            </div>
          </nav>
        )}

        {/* MAIN */}
        <main style={{ flex: 1, overflow: "hidden", padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 16, flexShrink: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{PAGES.find(p => p.id === page)?.icon} {PAGES.find(p => p.id === page)?.label}</h1>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {page === "content"   && <ContentPage onSchedule={() => setSchedRefresh(r => r + 1)} />}
            {page === "calendar"  && <CalendarPage refresh={schedRefresh} />}
            {page === "history"   && <HistoryPage />}
            {page === "dashboard" && <DashboardPage />}
            {page === "config"    && <ConfigPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
