import { useState } from 'react';
import { Bookmark, Copy, CheckCircle, ExternalLink, Code, Zap, Play } from 'lucide-react';

const BOOKMARKLET_CODE = `javascript:(function(){
  const extractNumber = (selector) => {
    const el = document.querySelector(selector);
    return el ? parseInt(el.innerText.replace(/[^0-9]/g, '')) || 0 : 0;
  };
  
  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : '';
  };
  
  const linkedinData = {
    plataforma: 'LinkedIn',
    perfil: getText('.profile-card__name') || getText('h1') || 'Perfil',
    visualizacoes: extractNumber('[data-test-id="profile-views-count"]') || extractNumber('.analytics-count'),
    recrutadores: extractNumber('[data-test-id="recruiter-views-count"]') || 0,
    posts: extractNumber('[data-test-id="posts-count"]') || document.querySelectorAll('.feed-shared-update-v2').length,
    seguidores: extractNumber('[data-test-id="follower-count"]') || extractNumber('.profile-card__badge-count'),
    engajamento: extractNumber('[data-test-id="engagement-count"]') || 0,
    data: new Date().toISOString(),
    url: window.location.href
  };
  
  console.log('📊 Dados LinkedIn extraídos:', linkedinData);
  
  fetch('https://gerenciador-marketing-backend.onrender.com/metrics/linkedin-manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkedinData)
  })
  .then(r => r.json())
  .then(data => {
    alert('✅ Dados sincronizados com sucesso!\\n\\n' + 
          'Visualizações: ' + linkedinData.visualizacoes + '\\n' +
          'Posts: ' + linkedinData.posts + '\\n' +
          'Seguidores: ' + linkedinData.seguidores);
  })
  .catch(e => {
    console.error('Erro:', e);
    alert('❌ Erro ao sincronizar.\\nDados copiados para o console (F12).');
  });
})();`;

const CONSOLE_SCRIPT = `// Script para extrair métricas do LinkedIn
// Execute no console (F12) na página de analytics do LinkedIn

const extractNumber = (selector) => {
  const el = document.querySelector(selector);
  return el ? parseInt(el.innerText.replace(/[^0-9]/g, '')) || 0 : 0;
};

const linkedinData = {
  plataforma: 'LinkedIn',
  visualizacoes: extractNumber('[data-test-id="profile-views-count"]'),
  recrutadores: extractNumber('[data-test-id="recruiter-views-count"]'),
  posts: document.querySelectorAll('.feed-shared-update-v2').length,
  seguidores: extractNumber('[data-test-id="follower-count"]'),
  data: new Date().toISOString()
};

console.log('📊 Dados extraídos:', linkedinData);

// Copiar para área de transferência
copy(JSON.stringify(linkedinData, null, 2));
console.log('✅ Dados copiados! Cole no dashboard.');`;

export default function LinkedInExtractor() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookmarklet' | 'console' | 'api'>('bookmarklet');

  function copyBookmarklet() {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bookmark className="text-blue-400" />
            Extrator LinkedIn
          </h1>
          <p className="text-gray-400 text-sm">
            Sincronize métricas do seu perfil LinkedIn com o dashboard
          </p>
        </div>
      </div>

      {/* Abas de opções */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'bookmarklet', label: '⭐ Bookmarklet (Recomendado)', icon: Bookmark },
          { id: 'console', label: 'Console F12 (Manual)', icon: Code },
          { id: 'api', label: 'API/Zapier (Automático)', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        {activeTab === 'bookmarklet' && (
          <>
            <div className="flex items-start gap-3 text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <Zap size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Método mais rápido e prático</p>
                <p className="text-sm text-yellow-500/80 mt-1">
                  Funciona em qualquer navegador. Basta arrastar o código para a barra de favoritos e clicar quando estiver no LinkedIn.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-white">Passo a passo:</h3>
              <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
                <li>Abra seu LinkedIn Analytics: <a href="https://www.linkedin.com/analytics/profile-views/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">linkedin.com/analytics <ExternalLink size={12} /></a></li>
                <li>Copie o código abaixo (clique no botão "Copiar código")</li>
                <li>Crie um novo favorito no navegador (Ctrl+D ou Cmd+D)</li>
                <li>Edite o favorito e cole o código no campo URL</li>
                <li>Clique no favorito sempre que quiser sincronizar os dados</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Código do Bookmarklet</label>
                <button
                  onClick={copyBookmarklet}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    copied ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar código'}
                </button>
              </div>
              <textarea
                readOnly
                value={BOOKMARKLET_CODE}
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none"
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                <strong>Dica:</strong> Você pode criar múltiplos bookmarks para diferentes páginas do LinkedIn (Analytics, Posts, Perfil).
              </p>
            </div>
          </>
        )}

        {activeTab === 'console' && (
          <>
            <div className="flex items-start gap-3 text-gray-400 bg-gray-800 border border-gray-700 rounded-lg p-4">
              <Code size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Extração manual via console</p>
                <p className="text-sm text-gray-500 mt-1">
                  Útil para testes ou quando o bookmarklet não funcionar. Execute o código no console do navegador (F12).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-white">Como usar:</h3>
              <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
                <li>Abra o LinkedIn Analytics</li>
                <li>Pressione F12 para abrir o console</li>
                <li>Cole o código abaixo e pressione Enter</li>
                <li>Os dados serão copiados automaticamente</li>
                <li>Cole no dashboard em "Importar Métricas"</li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Script do Console</label>
              <textarea
                readOnly
                value={CONSOLE_SCRIPT}
                className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none"
              />
            </div>
          </>
        )}

        {activeTab === 'api' && (
          <>
            <div className="flex items-start gap-3 text-purple-400 bg-purple-900/20 border border-purple-800 rounded-lg p-4">
              <Zap size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Automação completa (requer configuração)</p>
                <p className="text-sm text-purple-500/80 mt-1">
                  Use Zapier, Make.com ou n8n para agendar a extração automática de métricas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Opção A: Zapier (Mais fácil)</h3>
                <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside">
                  <li>Crie uma conta em <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">zapier.com</a></li>
                  <li>Configure um "Zap" com trigger "Schedule" (diário)</li>
                  <li>Use "Webhooks by Zapier" para POST em nossa API</li>
                  <li>Endpoint: <code className="bg-gray-800 px-1 rounded">POST /metrics/linkedin-webhook</code></li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Opção B: API Direta (Para desenvolvedores)</h3>
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <code className="text-xs text-gray-400 block">POST https://gerenciador-marketing-backend.onrender.com/metrics/linkedin-manual</code>
                  <pre className="text-xs text-gray-400 overflow-x-auto">
{`{
  "plataforma": "LinkedIn",
  "visualizacoes": 708,
  "recrutadores": 1,
  "posts": 27,
  "seguidores": 150,
  "data": "2026-01-15T10:00:00Z"
}`}
                  </pre>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Nota:</strong> A API do LinkedIn para perfis pessoais é limitada. 
                  Para métricas completas, considere criar uma <strong>LinkedIn Company Page</strong> 
                  e usar a API oficial de marketing.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Métricas já sincronizadas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Última Sincronização</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Visualizações', value: '—', icon: '👁️' },
            { label: 'Posts', value: '—', icon: '📝' },
            { label: 'Seguidores', value: '—', icon: '👥' },
            { label: 'Recrutadores', value: '—', icon: '💼' },
          ].map((metric) => (
            <div key={metric.label} className="bg-gray-800 rounded-lg p-4 text-center">
              <span className="text-2xl">{metric.icon}</span>
              <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-4 text-center">
          Use o bookmarklet ou console para sincronizar seus dados reais do LinkedIn
        </p>
      </div>
    </div>
  );
}
