import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, Brain, Target } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GANCHO_TEMPLATE = `ESTRUTURA DE POST (use como base):
🪝 GANCHO — primeira linha que para o scroll
   Ex: "Você está cometendo esse erro no canteiro de obras?"

💔 DOR — problema que o leitor vive no dia a dia
   Ex: "Motor queimado, prazo perdido, chefe no seu pescoço..."

⚡ AGITA — intensifica o problema, mostra a consequência
   Ex: "E o pior: sem saber o que causou, vai acontecer de novo."

✅ SOLUÇÃO — o que você ensina / resolve
   Ex: "Aqui está como dimensionar o contator certo da primeira vez:"

📊 PROVA — resultado real, número, caso de obra
   Ex: "Apliquei isso em 12 instalações industriais em 2024."

🎯 CTA — chamada para ação clara
   Ex: "Quer o guia completo? Link no comentário 👇"

TOM: direto, linguagem de obra, sem academicismo
NUNCA: inventar dados técnicos, clichês motivacionais`;

export default function Configuracoes() {
  const { user } = useAuth();

  // Tokens redes sociais
  const [li, setLi] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [fb, setFb] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [saving, setSaving] = useState('');
  const [liStatus, setLiStatus] = useState<{ connected: boolean; updatedAt?: string } | null>(null);
  const [fbStatus, setFbStatus] = useState<{ connected: boolean; updatedAt?: string } | null>(null);

  // Instrucoes IA
  const [aiInstructions, setAiInstructions] = useState(GANCHO_TEMPLATE);
  const [savingAi, setSavingAi] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [contentProfile, setContentProfile] = useState({
    niche: '',
    audience: '',
    contentGoals: '',
    blockedTopics: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    // Carrega contas salvas e pre-preenche
    api.get('/social/accounts').then(r => {
      const liAcc = r.data.find((a: any) => a.platform === 'linkedin');
      const fbAcc = r.data.find((a: any) => a.platform === 'facebook');
      if (liAcc) {
        setLi({ accessToken: liAcc.accessToken || '', pageId: liAcc.pageId || '', pageName: liAcc.pageName || '' });
        setLiStatus({ connected: liAcc.connected, updatedAt: liAcc.updatedAt });
      }
      if (fbAcc) {
        setFb({ accessToken: fbAcc.accessToken || '', pageId: fbAcc.pageId || '', pageName: fbAcc.pageName || '' });
        setFbStatus({ connected: fbAcc.connected, updatedAt: fbAcc.updatedAt });
      }
    }).catch(() => {});

    // Carrega instrucoes da IA salvas
    api.get('/auth/settings').then(r => {
      if (r.data?.aiInstructions) setAiInstructions(r.data.aiInstructions);
      setContentProfile({
        niche: r.data?.niche || r.data?.contentNiche || '',
        audience: r.data?.audience || r.data?.targetAudience || '',
        contentGoals: r.data?.contentGoals || r.data?.goals || '',
        blockedTopics: r.data?.blockedTopics || '',
      });
    }).catch(() => {});
  }, []);

  async function connect(platform: string, data: any) {
    setSaving(platform);
    try {
      await api.post(`/social/connect/${platform}`, data);
      const r = await api.get('/social/accounts');
      const acc = r.data.find((a: any) => a.platform === platform);
      if (platform === 'linkedin') setLiStatus({ connected: acc?.connected, updatedAt: acc?.updatedAt });
      if (platform === 'facebook') setFbStatus({ connected: acc?.connected, updatedAt: acc?.updatedAt });
      alert(`${platform === 'linkedin' ? 'LinkedIn' : 'Facebook'} conectado e salvo com sucesso!`);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao conectar');
    } finally { setSaving(''); }
  }

  async function saveAiInstructions() {
    setSavingAi(true);
    try {
      await api.put('/auth/settings', { aiInstructions });
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2000);
    } catch { alert('Erro ao salvar instrucoes'); } finally { setSavingAi(false); }
  }

  async function saveContentProfile() {
    setSavingProfile(true);
    try {
      await api.put('/auth/settings', contentProfile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch { alert('Erro ao salvar nicho do usuario'); } finally { setSavingProfile(false); }
  }

  function formatDate(d?: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Configuracoes</h1>

      {/* Perfil */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          {user?.avatar
            ? <img src={user.avatar} className="w-14 h-14 rounded-full" alt={user.name} />
            : <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">{user?.name?.[0]}</div>}
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nicho e pesquisa */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-green-400" />
          <h2 className="font-semibold text-white">Nicho e pesquisa do usuario</h2>
        </div>
        <p className="text-xs text-gray-500">
          Todos os geradores usam esta referencia para buscar tendencias, noticias do LinkedIn, posts, carrosseis, imagens e funil deste usuario.
        </p>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nicho principal</label>
          <textarea
            value={contentProfile.niche}
            onChange={e => setContentProfile(prev => ({ ...prev, niche: e.target.value }))}
            rows={3}
            placeholder="Ex: eletricidade industrial, CLP, automacao, NR10, manutencao eletrica"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-y focus:border-green-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Publico-alvo</label>
          <textarea
            value={contentProfile.audience}
            onChange={e => setContentProfile(prev => ({ ...prev, audience: e.target.value }))}
            rows={2}
            placeholder="Ex: eletricistas e tecnicos no Brasil / profissionais de RH e departamento pessoal"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-y focus:border-green-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Objetivo do conteudo</label>
          <input
            value={contentProfile.contentGoals}
            onChange={e => setContentProfile(prev => ({ ...prev, contentGoals: e.target.value }))}
            placeholder="Ex: gerar autoridade, captar leads e vender ebooks"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assuntos para evitar</label>
          <input
            value={contentProfile.blockedTopics}
            onChange={e => setContentProfile(prev => ({ ...prev, blockedTopics: e.target.value }))}
            placeholder="Ex: politica, noticias internacionais fora do nicho, temas sem relacao"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
          />
        </div>
        <button
          onClick={saveContentProfile}
          disabled={savingProfile}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${profileSaved ? 'bg-green-600 text-white' : 'bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white'}`}>
          <Save size={14} />
          {profileSaved ? '✓ Nicho salvo!' : savingProfile ? 'Salvando...' : 'Salvar nicho e pesquisa'}
        </button>
      </div>

      {/* LinkedIn */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">LinkedIn</h2>
          {liStatus?.connected
            ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Conectado {liStatus.updatedAt ? `em ${formatDate(liStatus.updatedAt)}` : ''}</span>
            : <span className="flex items-center gap-1 text-gray-500 text-sm"><AlertCircle size={14} /> Nao conectado</span>}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Access Token</label>
          <input
            placeholder="Colar token aqui (AQU7XEX...)"
            value={li.accessToken}
            onChange={e => setLi(x => ({ ...x, accessToken: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Organization ID (deixe vazio para perfil pessoal)</label>
          <input
            placeholder="Ex: 12345678 (ID da empresa no LinkedIn)"
            value={li.pageId}
            onChange={e => setLi(x => ({ ...x, pageId: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nome (para identificar)</label>
          <input
            placeholder="Ex: Jonas Breitenbach"
            value={li.pageName}
            onChange={e => setLi(x => ({ ...x, pageName: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <button
          onClick={() => connect('linkedin', li)}
          disabled={!li.accessToken || saving === 'linkedin'}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <Save size={14} /> {saving === 'linkedin' ? 'Salvando...' : 'Salvar token LinkedIn'}
        </button>
        <p className="text-xs text-gray-600">
          Para gerar um token com os escopos corretos, acesse:
          <a href="https://www.linkedin.com/developers/tools/oauth/redirect" target="_blank" rel="noreferrer" className="text-blue-500 ml-1 hover:underline">LinkedIn OAuth Tool</a>
          — escopos necessarios: <code className="bg-gray-800 px-1 rounded">w_member_social r_liteprofile</code>
        </p>
      </div>

      {/* Facebook */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Facebook / Meta</h2>
          {fbStatus?.connected
            ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Conectado {fbStatus.updatedAt ? `em ${formatDate(fbStatus.updatedAt)}` : ''}</span>
            : <span className="flex items-center gap-1 text-gray-500 text-sm"><AlertCircle size={14} /> Nao conectado</span>}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Page Access Token</label>
          <input
            placeholder="Token da PAGINA (nao do usuario)"
            value={fb.accessToken}
            onChange={e => setFb(x => ({ ...x, accessToken: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Page ID</label>
          <input
            placeholder="Ex: 1049737558220873"
            value={fb.pageId}
            onChange={e => setFb(x => ({ ...x, pageId: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nome da pagina</label>
          <input
            placeholder="Ex: Manual do Eletricista"
            value={fb.pageName}
            onChange={e => setFb(x => ({ ...x, pageName: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <button
          onClick={() => connect('facebook', fb)}
          disabled={!fb.accessToken || !fb.pageId || saving === 'facebook'}
          className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <Save size={14} /> {saving === 'facebook' ? 'Salvando...' : 'Salvar token Facebook'}
        </button>
        <p className="text-xs text-gray-600">
          Pegar token em:
          <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-blue-500 ml-1 hover:underline">Graph API Explorer</a>
          — selecione "Token da Pagina" com permissoes <code className="bg-gray-800 px-1 rounded">pages_manage_posts</code>
        </p>
      </div>

      {/* Instrucoes da IA */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Instrucoes para a IA Geradora</h2>
        </div>
        <p className="text-xs text-gray-500">
          Essas instrucoes orientam como a IA gera seus posts. Edite a estrutura, tom e exemplos conforme sua estrategia.
        </p>
        <textarea
          value={aiInstructions}
          onChange={e => setAiInstructions(e.target.value)}
          rows={18}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm font-mono resize-y focus:border-purple-500 outline-none"
        />
        <button
          onClick={saveAiInstructions}
          disabled={savingAi}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${aiSaved ? 'bg-green-600 text-white' : 'bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white'}`}>
          <Save size={14} />
          {aiSaved ? '✓ Instrucoes salvas!' : savingAi ? 'Salvando...' : 'Salvar instrucoes da IA'}
        </button>
      </div>
    </div>
  );
}
