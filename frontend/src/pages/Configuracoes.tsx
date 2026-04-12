import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Link, Settings, BookOpen, Lightbulb, ExternalLink, Save, User, Hash } from 'lucide-react';
import api from '../services/api';
import { settingsApi, ideasApi } from '../services/api/v3';
import { useAuth } from '../contexts/AuthContext';

interface Idea {
  id: string;
  hook: string;
  breakText: string;
  pain: string;
  agitate: string;
  solution: string;
  proof: string;
  cta: string;
  category?: string;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'generator' | 'ideas'>('profile');
  
  // Social accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [li, setLi] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [fb, setFb] = useState({ accessToken: '', pageId: '', pageName: '' });
  const [saving, setSaving] = useState('');

  // Generator settings
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    instructions: '',
    tone: 'mix',
    linkedinUrl: '',
    facebookUrl: '',
    siteUrl: '',
    otherUrl: '',
    linkedinToken: '',
    facebookToken: '',
  });

  // Ideas
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [ideaForm, setIdeaForm] = useState({
    hook: '',
    breakText: '',
    pain: '',
    agitate: '',
    solution: '',
    proof: '',
    cta: '',
    category: '',
  });

  useEffect(() => {
    loadAccounts();
    loadSettings();
    loadIdeas();
  }, []);

  async function loadAccounts() {
    try {
      const r = await api.get('/social/accounts');
      setAccounts(r.data);
    } catch {}
  }

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const res = await settingsApi.get();
      setSettings(res.data.settings);
      setSettingsForm({
        instructions: res.data.settings.instructions || '',
        tone: res.data.settings.tone || 'mix',
        linkedinUrl: res.data.settings.linkedinUrl || '',
        facebookUrl: res.data.settings.facebookUrl || '',
        siteUrl: res.data.settings.siteUrl || '',
        otherUrl: res.data.settings.otherUrl || '',
        linkedinToken: '',
        facebookToken: '',
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadIdeas() {
    try {
      const res = await ideasApi.getAll();
      setIdeas(res.data.ideas);
    } catch (err) {
      console.error('Error loading ideas:', err);
    }
  }

  async function saveSettings() {
    setSaving('settings');
    try {
      await settingsApi.update(settingsForm);
      alert('Configurações salvas com sucesso!');
      loadSettings();
    } catch (err) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving('');
    }
  }

  async function connect(platform: string, data: any) {
    setSaving(platform);
    try {
      await api.post(`/social/connect/${platform}`, data);
      const r = await api.get('/social/accounts');
      setAccounts(r.data);
      alert(`${platform} conectado com sucesso!`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao conectar. Verifique o token.';
      alert(msg);
    } finally {
      setSaving('');
    }
  }

  async function saveIdea() {
    try {
      if (editingIdea) {
        await ideasApi.update(editingIdea.id, ideaForm);
      } else {
        await ideasApi.create(ideaForm);
      }
      setShowIdeaForm(false);
      setEditingIdea(null);
      setIdeaForm({
        hook: '',
        breakText: '',
        pain: '',
        agitate: '',
        solution: '',
        proof: '',
        cta: '',
        category: '',
      });
      loadIdeas();
    } catch (err) {
      alert('Erro ao salvar ideia');
    }
  }

  async function deleteIdea(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta ideia?')) return;
    try {
      await ideasApi.delete(id);
      loadIdeas();
    } catch (err) {
      alert('Erro ao excluir ideia');
    }
  }

  const isConnected = (platform: string) =>
    accounts.some((a) => a.platform === platform && a.connected);

  const tabs = [
    { key: 'profile', label: 'Perfil', icon: User },
    { key: 'social', label: 'Redes Sociais', icon: Link },
    { key: 'generator', label: 'Gerador de Conteúdo', icon: Settings },
    { key: 'ideas', label: 'Banco de Ideias', icon: Lightbulb },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Perfil */}
      {activeTab === 'profile' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-400" />
            Perfil
          </h2>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                className="w-16 h-16 rounded-full"
                alt={user.name}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                {user?.name?.[0]}
              </div>
            )}
            <div>
              <p className="text-white font-medium text-lg">{user?.name}</p>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Redes Sociais */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          {/* LinkedIn */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">LinkedIn</h2>
              {isConnected('linkedin') ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle size={14} /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500 text-sm">
                  <AlertCircle size={14} /> Não conectado
                </span>
              )}
            </div>
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                <strong>Como conectar:</strong> Cole apenas o Access Token abaixo. O sistema buscará seu Member ID automaticamente. O token foi gerado em developers.linkedin.com (escopo: w_member_social).
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Access Token *</label>
              <input
                placeholder="AQU7XEX... (token gerado no LinkedIn Developers)"
                value={li.accessToken}
                onChange={(e) => setLi((x) => ({ ...x, accessToken: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Member ID (opcional — preenchido automaticamente)</label>
              <input
                placeholder="Deixe em branco para buscar automaticamente"
                value={li.pageId}
                onChange={(e) => setLi((x) => ({ ...x, pageId: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Nome (opcional)</label>
              <input
                placeholder="Seu nome no LinkedIn"
                value={li.pageName}
                onChange={(e) => setLi((x) => ({ ...x, pageName: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <button
              onClick={() => connect('linkedin', li)}
              disabled={!li.accessToken || saving === 'linkedin'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Link size={14} />{' '}
              {saving === 'linkedin' ? 'Conectando...' : 'Conectar LinkedIn'}
            </button>
          </div>

          {/* Facebook */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Facebook / Meta</h2>
              {isConnected('facebook') ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle size={14} /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500 text-sm">
                  <AlertCircle size={14} /> Não conectado
                </span>
              )}
            </div>
            <input
              placeholder="Page Access Token"
              value={fb.accessToken}
              onChange={(e) =>
                setFb((x) => ({ ...x, accessToken: e.target.value }))
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <input
              placeholder="Page ID"
              value={fb.pageId}
              onChange={(e) => setFb((x) => ({ ...x, pageId: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <input
              placeholder="Nome da página"
              value={fb.pageName}
              onChange={(e) => setFb((x) => ({ ...x, pageName: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={() => connect('facebook', fb)}
              disabled={!fb.accessToken || saving === 'facebook'}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Link size={14} />{' '}
              {saving === 'facebook' ? 'Salvando...' : 'Conectar Facebook'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Gerador de Conteúdo */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          {/* Instruções */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              Instruções do Gerador
            </h2>
            <p className="text-gray-400 text-sm">
              Defina como a IA deve gerar os posts. Estas instruções serão
              incluídas em todos os prompts de geração.
            </p>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Tom de voz padrão
              </label>
              <select
                value={settingsForm.tone}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, tone: e.target.value }))
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="mix">Mix (Variado)</option>
                <option value="profissional">Profissional</option>
                <option value="casual">Casual</option>
                <option value="inspirador">Inspirador</option>
                <option value="direto">Direto</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Instruções personalizadas
              </label>
              <textarea
                value={settingsForm.instructions}
                onChange={(e) =>
                  setSettingsForm((s) => ({
                    ...s,
                    instructions: e.target.value,
                  }))
                }
                rows={6}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                placeholder="Ex: Gere conteúdo profissional para eletricistas. Use tom técnico mas acessível. Máximo 1300 caracteres para LinkedIn. Evite jargões excessivos."
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={saving === 'settings'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
            >
              <Save size={16} />{' '}
              {saving === 'settings' ? 'Salvando...' : 'Salvar Instruções'}
            </button>
          </div>

          {/* Links das Plataformas */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ExternalLink size={18} className="text-blue-400" />
              Links das Plataformas (para Analytics)
            </h2>
            <p className="text-gray-400 text-sm">
              Configure as URLs das suas páginas para que o GPT-4o possa
              analisar métricas e desempenho.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={settingsForm.linkedinUrl}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      linkedinUrl: e.target.value,
                    }))
                  }
                  placeholder="https://linkedin.com/in/seu-perfil"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Facebook
                </label>
                <input
                  type="url"
                  value={settingsForm.facebookUrl}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      facebookUrl: e.target.value,
                    }))
                  }
                  placeholder="https://facebook.com/sua-pagina"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Site</label>
                <input
                  type="url"
                  value={settingsForm.siteUrl}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      siteUrl: e.target.value,
                    }))
                  }
                  placeholder="https://seusite.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Outra Plataforma
                </label>
                <input
                  type="url"
                  value={settingsForm.otherUrl}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      otherUrl: e.target.value,
                    }))
                  }
                  placeholder="https://outra-plataforma.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Banco de Ideias */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-400" />
                Banco de Ideias
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Estrutura: Gancho → Quebra → Dor → Agita → Solução → Prova →
                CTA
              </p>
            </div>
            <button
              onClick={() => {
                setEditingIdea(null);
                setIdeaForm({
                  hook: '',
                  breakText: '',
                  pain: '',
                  agitate: '',
                  solution: '',
                  proof: '',
                  cta: '',
                  category: '',
                });
                setShowIdeaForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              + Nova Ideia
            </button>
          </div>

          {/* Formulário de Ideia */}
          {showIdeaForm && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
              <h3 className="font-medium text-white">
                {editingIdea ? 'Editar Ideia' : 'Nova Ideia'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 block mb-1">
                    Gancho (Hook) *
                  </label>
                  <input
                    value={ideaForm.hook}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, hook: e.target.value }))
                    }
                    placeholder="Primeira frase que prende atenção"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Quebra
                  </label>
                  <input
                    value={ideaForm.breakText}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, breakText: e.target.value }))
                    }
                    placeholder="Quebra de expectativa"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Dor</label>
                  <input
                    value={ideaForm.pain}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, pain: e.target.value }))
                    }
                    placeholder="Problema do cliente"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Agita</label>
                  <input
                    value={ideaForm.agitate}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, agitate: e.target.value }))
                    }
                    placeholder="Intensifica a dor"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Solução
                  </label>
                  <input
                    value={ideaForm.solution}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, solution: e.target.value }))
                    }
                    placeholder="Como resolver"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Prova</label>
                  <input
                    value={ideaForm.proof}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, proof: e.target.value }))
                    }
                    placeholder="Dado, case ou exemplo"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">CTA *</label>
                  <input
                    value={ideaForm.cta}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, cta: e.target.value }))
                    }
                    placeholder="Call to Action"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Categoria
                  </label>
                  <input
                    value={ideaForm.category}
                    onChange={(e) =>
                      setIdeaForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="Ex: Segurança, Dicas, Cases"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveIdea}
                  disabled={!ideaForm.hook || !ideaForm.cta}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                >
                  <Save size={16} /> Salvar
                </button>
                <button
                  onClick={() => setShowIdeaForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de Ideias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.length === 0 && (
              <p className="text-gray-500 col-span-2 text-center py-8">
                Nenhuma ideia cadastrada ainda.
              </p>
            )}

            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {idea.category && (
                      <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
                        <Hash size={10} className="inline mr-1" />
                        {idea.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingIdea(idea);
                        setIdeaForm({
                          hook: idea.hook,
                          breakText: idea.breakText,
                          pain: idea.pain,
                          agitate: idea.agitate,
                          solution: idea.solution,
                          proof: idea.proof,
                          cta: idea.cta,
                          category: idea.category || '',
                        });
                        setShowIdeaForm(true);
                      }}
                      className="text-gray-400 hover:text-blue-400 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className="text-gray-400 hover:text-red-400 text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <p className="text-white font-medium">{idea.hook}</p>

                <div className="text-sm space-y-1">
                  {idea.breakText && (
                    <p className="text-gray-400">
                      <span className="text-gray-500">Quebra:</span>{' '}
                      {idea.breakText}
                    </p>
                  )}
                  {idea.pain && (
                    <p className="text-gray-400">
                      <span className="text-gray-500">Dor:</span> {idea.pain}
                    </p>
                  )}
                  {idea.solution && (
                    <p className="text-gray-400">
                      <span className="text-gray-500">Solução:</span>{' '}
                      {idea.solution}
                    </p>
                  )}
                  {idea.proof && (
                    <p className="text-gray-400">
                      <span className="text-gray-500">Prova:</span>{' '}
                      {idea.proof}
                    </p>
                  )}
                </div>

                <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 mt-2">
                  <p className="text-blue-300 text-sm"><strong>CTA:</strong> {idea.cta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
