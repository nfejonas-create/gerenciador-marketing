import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon, Wand2 } from 'lucide-react';
import CarouselSlide, { Slide } from './CarouselSlide';
import api from '../services/api';

interface CarouselEditorProps {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  onGenerateImage?: (slideIndex: number) => Promise<string>;
}

export default function CarouselEditor({ slides, onChange, onGenerateImage }: CarouselEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);

  const currentSlide = slides[currentIndex];

  const handleEdit = (field: keyof Slide, value: string) => {
    const updated = [...slides];
    updated[currentIndex] = { ...currentSlide, [field]: value };
    onChange(updated);
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      slide: slides.length + 1,
      emoji: '💡',
      title: 'Novo Slide',
      body: 'Digite o conteúdo aqui...',
      style: 'content',
    };
    onChange([...slides, newSlide]);
    setCurrentIndex(slides.length);
  };

  const handleRemoveSlide = () => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== currentIndex);
    // Reordena os números
    updated.forEach((s, i) => s.slide = i + 1);
    onChange(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }
  };

  const handleGenerateImage = async () => {
    if (!onGenerateImage) return;
    setGeneratingImage(currentIndex);
    try {
      const imageUrl = await onGenerateImage(currentIndex);
      handleEdit('imageUrl', imageUrl);
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleStyleChange = (style: Slide['style']) => {
    handleEdit('style', style);
  };

  return (
    <div className="space-y-4">
      {/* Preview do slide atual */}
      <div className="max-w-md mx-auto">
        <CarouselSlide 
          slide={currentSlide} 
          isActive={true}
          editable={true}
          onEdit={handleEdit}
        />
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-sm text-gray-400">
          Slide {currentIndex + 1} de {slides.length}
        </span>

        <button
          onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
          disabled={currentIndex === slides.length - 1}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Miniaturas */}
      <div className="flex gap-2 justify-center flex-wrap">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg transition-all ${
              index === currentIndex 
                ? 'bg-blue-600 ring-2 ring-blue-400' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {slide.emoji}
          </button>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleAddSlide}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
        >
          <Plus size={16} /> Adicionar Slide
        </button>

        <button
          onClick={handleRemoveSlide}
          disabled={slides.length <= 1}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm disabled:opacity-50"
        >
          <Trash2 size={16} /> Remover
        </button>

        {onGenerateImage && (
          <button
            onClick={handleGenerateImage}
            disabled={generatingImage === currentIndex}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm disabled:opacity-50"
          >
            <Wand2 size={16} /> 
            {generatingImage === currentIndex ? 'Gerando...' : 'Gerar Imagem IA'}
          </button>
        )}
      </div>

      {/* Estilo do slide */}
      <div className="flex justify-center gap-2">
        {(['cover', 'content', 'cta'] as const).map((style) => (
          <button
            key={style}
            onClick={() => handleStyleChange(style)}
            className={`px-3 py-1 rounded-lg text-xs capitalize ${
              currentSlide.style === style
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {style === 'cover' ? 'Capa' : style === 'content' ? 'Conteúdo' : 'CTA'}
          </button>
        ))}
      </div>
    </div>
  );
}
