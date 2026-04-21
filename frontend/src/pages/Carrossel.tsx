import { useState, useEffect } from 'react';
import { Sparkles, Save, Send, Calendar, Clock, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import CarouselEditor from '../components/CarouselEditor';
import { Slide } from '../components/CarouselSlide';

interface Carousel {
  id: string;
  title: string;
  slides: Slide[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  createdAt: string;
}

export default function Carrossel() {
  const [tab, setTab] = useState<'generate' | 'history'>('generate');
  
  // Geração
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [title, setTitle] = useState('');
  
  // Salvamento/Publicação
  const [saving, setSaving] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [publishing, setPublishing] = useState(false);
  
  // Histórico
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/content/carousels');
      setCarousels(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Por favor, digite um tema para o carrossel');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post('/content/generate-carousel', {
        topic,
        count,
        platform: 'linkedin',
      });
      setSlides(data.slides);
      setTitle(`Carrossel: ${topic}`);
    } catch (err) {
      console.error('Erro ao gerar carrossel:', err);
      alert('Erro ao gerar carrossel. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled' = 'draft') => {
    if (!title.trim() || slides.length === 0) {
      alert('Título ou slides vazios');
      return;
    }
    setSaving(true);
    try {
      console.log('Salvando carrossel:', { title, slidesCount: slides.length, status });
      const response = await api.post('/content/carousels', {
        title,
        slides,
        status,
        scheduledAt: status === 'scheduled' && scheduleDate ? scheduleDate : null,
      });
      console.log('Resposta salvar:', response.data);
      alert(status === 'scheduled' ? 'Carrossel agendado!' : 'Carrossel salvo!');
      setSlides([]);
      setTopic('');
      setTitle('');
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || slides.length === 0) {
      alert('Título ou slides vazios');
      return;
    }
    setPublishing(true);
    try {
      console.log('Publicando carrossel:', { title, slidesCount: slides.length });
      // Primeiro salva
      const { data: saved } = await api.post('/content/carousels', {
        title,
        slides,
        status: 'draft',
      });
      console.log('Carrossel salvo:', saved);
      // Depois publica via backend
      const pubResponse = await api.post(`/content/carousels/${saved.id}/publish`);
      console.log('Resposta publicação:', pubResponse.data);
      if (pubResponse.data.linkedInPostUrn) {
        alert('Carrossel publicado no LinkedIn! ID: ' + pubResponse.data.linkedInPostUrn);
      } else {
        alert('Carrossel publicado! (sem ID retornado)');
      }
      setSlides([]);
      setTopic('');
      setTitle('');
    } catch (err: any) {
      console.error('Erro ao publicar:', err);
      alert('Erro ao publicar: ' + (err.response?.data?.error || err.message));
    } finally {
      setPublishing(false);
    }
  };

  const generateSlideImage = async (slideIndex: number): Promise<string> => {
    const slide = slides[slideIndex];
    const { data } = await api.post('/content/generate-image', {
      prompt: `Imagem profissional para LinkedIn sobre: ${slide.title}. ${slide.body}. Estilo moderno, corporativo.`,
    });
    return data.imageUrl;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Carrossel</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Gerar
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {tab === 'generate' && (
        <div className="space-y-6">
          {!slides.length ? (
            <div className="bg-gray-900 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tema do carrossel</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: 5 erros na gestão de RH"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quantidade de slides: {count}</label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || generating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium"
              >
                <Sparkles size={18} />
                {generating ? 'Gerando...' : 'Gerar Carrossel'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl p-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold text-white border-b border-gray-700 pb-2"
                  placeholder="Título do carrossel"
                />
              </div>

              <CarouselEditor
                slides={slides}
                onChange={setSlides}
                onGenerateImage={generateSlideImage}
              />

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  <Save size={16} />
                  Salvar Rascunho
                </button>

                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Send size={16} />
                  {publishing ? 'Publicando...' : 'Publicar Agora'}
                </button>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-400">Ou agende para depois:</p>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
                <button
                  onClick={() => handleSave('scheduled')}
                  disabled={!scheduleDate || saving}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg"
                >
                  <Calendar size={16} />
                  Agendar Publicação
                </button>
              </div>

              <button
                onClick={() => { setSlides([]); setTopic(''); setTitle(''); }}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                ← Voltar e criar novo
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <p className="text-gray-400 text-center py-8">Carregando...</p>
          ) : carousels.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum carrossel salvo ainda.</p>
          ) : (
            carousels.map((c) => (
              <div key={c.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{c.title}</h3>
                  <p className="text-sm text-gray-400">
                    {c.slides?.length || 0} slides • {' '}
                    {c.status === 'published' ? 'Publicado' : c.status === 'scheduled' ? `Agendado: ${new Date(c.scheduledAt!).toLocaleString()}` : 'Rascunho'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  c.status === 'published' ? 'bg-green-900 text-green-400' :
                  c.status === 'scheduled' ? 'bg-purple-900 text-purple-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
