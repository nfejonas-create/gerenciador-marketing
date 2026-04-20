interface Slide {
  slide: number;
  emoji: string;
  title: string;
  body: string;
  style: 'cover' | 'content' | 'cta';
  imageUrl?: string;
}

interface CarouselSlideProps {
  slide: Slide;
  isActive?: boolean;
  onEdit?: (field: keyof Slide, value: string) => void;
  editable?: boolean;
}

const styleClasses = {
  cover: 'bg-gradient-to-br from-purple-600 to-purple-900 text-white',
  content: 'bg-gray-800 text-white',
  cta: 'bg-gradient-to-br from-blue-600 to-blue-800 text-white',
};

export default function CarouselSlide({ slide, isActive, onEdit, editable }: CarouselSlideProps) {
  const handleEdit = (field: keyof Slide, value: string) => {
    if (editable && onEdit) {
      onEdit(field, value);
    }
  };

  return (
    <div className={`relative w-full aspect-square rounded-xl overflow-hidden ${styleClasses[slide.style]} ${isActive ? 'ring-2 ring-blue-400' : ''}`}>
      {slide.imageUrl && (
        <img 
          src={slide.imageUrl} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 h-full flex flex-col p-6">
        {editable ? (
          <>
            <input
              type="text"
              value={slide.emoji}
              onChange={(e) => handleEdit('emoji', e.target.value)}
              className="text-4xl bg-transparent border-none outline-none w-16 text-center mb-2"
              maxLength={2}
            />
            <input
              type="text"
              value={slide.title}
              onChange={(e) => handleEdit('title', e.target.value)}
              className={`text-2xl font-bold bg-transparent border-b border-white/30 outline-none mb-3 ${slide.style === 'cover' ? 'text-3xl text-center' : ''}`}
            />
            <textarea
              value={slide.body}
              onChange={(e) => handleEdit('body', e.target.value)}
              className="flex-1 bg-transparent border border-white/20 rounded-lg p-2 outline-none resize-none text-sm"
              rows={4}
            />
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">{slide.emoji}</div>
            <h3 className={`font-bold mb-3 ${slide.style === 'cover' ? 'text-3xl text-center' : 'text-xl'}`}>
              {slide.title}
            </h3>
            <p className={`flex-1 ${slide.style === 'cover' ? 'text-center text-lg' : 'text-sm'}`}>
              {slide.body}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export type { Slide };
