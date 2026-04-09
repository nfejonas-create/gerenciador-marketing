import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface WeeklyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: GenerateParams) => void;
  isLoading: boolean;
}

export interface GenerateParams {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook' | 'both';
}

const TONE_OPTIONS = [
  { value: 'profissional', label: 'Profissional', description: 'Formal e corporativo' },
  { value: 'casual', label: 'Casual', description: 'Leve e conversacional' },
  { value: 'inspirador', label: 'Inspirador', description: 'Motivacional e positivo' },
  { value: 'direto', label: 'Direto', description: 'Objetivo e sem rodeios' },
  { value: 'divertido', label: 'Divertido', description: 'Com humor e leveza' },
  { value: 'autoridade', label: 'Autoridade', description: 'Expert e técnico' }
];

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn', description: 'Foco em B2B e networking profissional', color: 'bg-blue-600' },
  { value: 'facebook', label: 'Facebook', description: 'Mais casual e próximo', color: 'bg-blue-800' },
  { value: 'both', label: 'Ambos', description: 'Gera para LinkedIn e Facebook', color: 'bg-gradient-to-r from-blue-600 to-blue-800' }
];

export function WeeklyGeneratorModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  isLoading 
}: WeeklyGeneratorModalProps) {
  const [theme, setTheme] = useState('');
  const [tone, setTone] = useState('profissional');
  const [platform, setPlatform] = useState<'linkedin' | 'facebook' | 'both'>('linkedin');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;
    
    onGenerate({
      theme: theme.trim(),
      tone,
      platform
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Gerar Semana de Conteúdo
              </h2>
              <p className="text-sm text-gray-500">
                IA cria 7 posts otimizados para sua semana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema da Semana
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Marketing Digital, Vendas, Produtividade..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              A IA usará este tema como base para todos os posts da semana
            </p>
          </div>

          {/* Tom de Voz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tom de Voz
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  disabled={isLoading}
                  className={`p-3 text-left rounded-xl border-2 transition-all ${
                    tone === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Plataforma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plataforma
            </label>
            <div className="space-y-2">
              {PLATFORM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlatform(option.value as any)}
                  disabled={isLoading}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl border-2 transition-all ${
                    platform === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${option.color}`} />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-gray-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !theme.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando conteúdo com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Conteúdo da Semana
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
