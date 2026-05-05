import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Copy, CheckCircle, ExternalLink, Code, Zap, Loader2 } from 'lucide-react';
import api from '../services/api';

interface WebhookInfo {
  endpoint: string;
  userId: string;
  metricsToken: string;
}

interface Metric {
  views: number;
  likes: number;
  shares: number;
  followers: number;
  reach: number;
  date: string;
}

function buildAutoCollectorBookmarklet(info: WebhookInfo | null) {
  if (!info) return 'Carregando token seguro...';

  const scriptUrl = `${info.endpoint.replace('/metrics/linkedin-manual', '/metrics/linkedin-collector.js')}?userId=${encodeURIComponent(info.userId)}&metricsToken=${encodeURIComponent(info.metricsToken)}&v=${Date.now()}`;
  return `javascript:(function(){var s=document.createElement('script');s.src=${JSON.stringify(scriptUrl)};s.async=true;document.body.appendChild(s);})();`;
}

function buildBookmarklet(info: WebhookInfo | null) {
  if (!info) return 'Carregando token seguro...';

  const payload = JSON.stringify({
    endpoint: info.endpoint,
    userId: info.userId,
    metricsToken: info.metricsToken,
  });

  return `javascript:(function(){
  const cfg=${payload};
  const numberFromText=(text)=>parseInt(String(text||'').replace(/[^0-9]/g,''),10)||0;
  const pick=(selectors)=>selectors.map(s=>document.querySelector(s)).find(Boolean);
  const extract=(selectors)=>numberFromText((pick(selectors)||{}).innerText);
  const metricCards=Array.from(document.querySelectorAll('section,article,div')).map(el=>el.innerText||'').join('\\n').toLowerCase();
  const linkedinData={
    plataforma:'LinkedIn',
    userId:cfg.userId,
    metricsToken:cfg.metricsToken,
    perfil:(document.querySelector('h1')||{}).innerText||document.title||'Perfil LinkedIn',
    visualizacoes:extract(['[data-test-id="profile-views-count"]','[data-test-id*="profile-view"]','.analytics-count'])||numberFromText((metricCards.match(/([0-9.,]+)\\s*(visualiza|views)/)||[])[1]),
    recrutadores:extract(['[data-test-id="recruiter-views-count"]'])||numberFromText((metricCards.match(/([0-9.,]+)\\s*(recrutador|recruiter)/)||[])[1]),
    posts:extract(['[data-test-id="posts-count"]'])||document.querySelectorAll('.feed-shared-update-v2,.update-components-actor').length,
    seguidores:extract(['[data-test-id="follower-count"]'])||numberFromText((metricCards.match(/([0-9.,]+)\\s*(seguidor|followers)/)||[])[1]),
    engajamento:extract(['[data-test-id="engagement-count"]'])||numberFromText((metricCards.match(/([0-9.,]+)\\s*(engajamento|engagement|reaction)/)||[])[1]),
    data:new Date().toISOString(),
    url:window.location.href
  };
  fetch(cfg.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(linkedinData)});
  alert('Métricas enviadas ao MktManager. Abra o dashboard para confirmar.\\n\\nVisualizações: '+linkedinData.visualizacoes+'\\nSeguidores: '+linkedinData.seguidores+'\\nPosts: '+linkedinData.posts);
})();`;
}

export default function LinkedInExtractor() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'bookmarklet' | 'console' | 'api'>('auto');
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [latest, setLatest] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [info, metrics] = await Promise.all([
          api.get('/metrics/webhook-info'),
          api.get('/metrics?platform=linkedin&days=90'),
        ]);
        setWebhook(info.data);
        const list = Array.isArray(metrics.data) ? metrics.data : [];
        setLatest(list[list.length - 1] || null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const autoBookmarklet = useMemo(() => buildAutoCollectorBookmarklet(webhook), [webhook]);
  const bookmarklet = useMemo(() => buildBookmarklet(webhook), [webhook]);
  const consoleScript = useMemo(() => bookmarklet.replace(/^javascript:/, ''), [bookmarklet]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cards = [
    { label: 'Visualizações', value: latest?.views ?? '—', icon: '👁️' },
    { label: 'Engajamento', value: latest?.likes ?? '—', icon: '⚡' },
    { label: 'Seguidores', value: latest?.followers ?? '—', icon: '👥' },
    { label: 'Posts', value: latest?.shares ?? '—', icon: '📝' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bookmark className="text-blue-400" />
            Extrator LinkedIn
          </h1>
          <p className="text-gray-400 text-sm">Fallback seguro para métricas quando Windsor/LinkedIn API não entregar dados do perfil pessoal.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'auto', label: 'Automático', icon: Zap },
          { id: 'bookmarklet', label: 'Bookmarklet Seguro', icon: Bookmark },
          { id: 'console', label: 'Console F12', icon: Code },
          { id: 'api', label: 'API / Automação', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : activeTab === 'auto' ? (
          <>
            <div className="flex items-start gap-3 text-blue-300 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <Zap size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Coleta automática enquanto o LinkedIn Analytics estiver aberto</p>
                <p className="text-sm text-blue-300/80 mt-1">Instale este favorito uma vez. Ao clicar nele dentro do LinkedIn Analytics, o MktManager coleta os números, grava no banco e repete a cada 5 minutos enquanto a aba estiver aberta.</p>
              </div>
            </div>
            <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
              <li>Copie o código automático abaixo.</li>
              <li>Crie um favorito no navegador com esse código no campo URL.</li>
              <li>Abra <a href="https://www.linkedin.com/analytics/profile-views/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">LinkedIn Analytics <ExternalLink size={12} /></a>.</li>
              <li>Clique no favorito "MktManager LinkedIn Auto".</li>
              <li>Deixe a aba aberta para atualizar o dashboard automaticamente.</li>
            </ol>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-white">Grava no banco</p>
                <p className="text-xs text-gray-500 mt-1">Usa token limitado só para métricas deste usuário.</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-white">Evita duplicar</p>
                <p className="text-xs text-gray-500 mt-1">A coleta do dia atualiza a linha existente.</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-white">Dashboard automático</p>
                <p className="text-xs text-gray-500 mt-1">Os gráficos usam os dados salvos em Métricas.</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Favorito automático</label>
                <button onClick={() => copyText(autoBookmarklet)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar automático'}
                </button>
              </div>
              <textarea readOnly value={autoBookmarklet}
                className="w-full h-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none" />
            </div>
          </>
        ) : activeTab === 'bookmarklet' ? (
          <>
            <div className="flex items-start gap-3 text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <Zap size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Método rápido com token limitado</p>
                <p className="text-sm text-yellow-500/80 mt-1">O código só grava métricas para o seu usuário. Não publica, não lê dados do app e não altera tokens de redes sociais.</p>
              </div>
            </div>
            <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
              <li>Abra <a href="https://www.linkedin.com/analytics/profile-views/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">LinkedIn Analytics <ExternalLink size={12} /></a></li>
              <li>Copie o bookmarklet abaixo.</li>
              <li>Crie/edite um favorito e cole o código no campo URL.</li>
              <li>Clique no favorito dentro do LinkedIn Analytics.</li>
              <li>Volte ao dashboard para ver a nova métrica.</li>
            </ol>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Código do Bookmarklet</label>
                <button onClick={() => copyText(bookmarklet)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar código'}
                </button>
              </div>
              <textarea readOnly value={bookmarklet}
                className="w-full h-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none" />
            </div>
          </>
        ) : activeTab === 'console' ? (
          <>
            <p className="text-gray-400 text-sm">Cole no console do LinkedIn Analytics se preferir não criar favorito.</p>
            <textarea readOnly value={consoleScript}
              className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none" />
          </>
        ) : (
          <>
            <p className="text-purple-300 text-sm">Para automações externas, use o mesmo endpoint e envie `userId` + `metricsToken` no corpo.</p>
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <code className="text-xs text-gray-400 block">POST {webhook?.endpoint}</code>
              <pre className="text-xs text-gray-400 overflow-x-auto">{JSON.stringify({
                plataforma: 'LinkedIn',
                userId: webhook?.userId,
                metricsToken: webhook?.metricsToken,
                visualizacoes: 708,
                seguidores: 150,
                engajamento: 12,
                data: new Date().toISOString(),
              }, null, 2)}</pre>
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Última Sincronização LinkedIn</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((metric) => (
            <div key={metric.label} className="bg-gray-800 rounded-lg p-4 text-center">
              <span className="text-2xl">{metric.icon}</span>
              <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-4 text-center">
          {latest ? `Atualizado em ${new Date(latest.date).toLocaleString('pt-BR')}` : 'Nenhuma métrica LinkedIn sincronizada ainda.'}
        </p>
      </div>
    </div>
  );
}
