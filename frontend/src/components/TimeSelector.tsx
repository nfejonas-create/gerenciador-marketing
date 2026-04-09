interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  platform?: 'linkedin' | 'facebook';
}

const SUGGESTED_TIMES = {
  linkedin: [
    { value: '08:00', label: '08:00', description: 'Início do expediente' },
    { value: '08:30', label: '08:30', description: 'Café da manhã' },
    { value: '09:00', label: '09:00', description: 'Pico LinkedIn' },
    { value: '09:30', label: '09:30', description: 'Alta visibilidade' },
    { value: '10:00', label: '10:00', description: 'Horário corporativo' },
    { value: '11:00', label: '11:00', description: 'Antes do almoço' },
    { value: '12:00', label: '12:00', description: 'Almoço' },
    { value: '13:00', label: '13:00', description: 'Volta do almoço' },
    { value: '14:00', label: '14:00', description: 'Tarde' },
    { value: '17:00', label: '17:00', description: 'Fim de expediente' }
  ],
  facebook: [
    { value: '19:00', label: '19:00', description: 'Início da noite' },
    { value: '19:30', label: '19:30', description: 'Jantar' },
    { value: '20:00', label: '20:00', description: 'Pico Facebook' },
    { value: '20:30', label: '20:30', description: 'Alta interação' },
    { value: '21:00', label: '21:00', description: 'Horário nobre' },
    { value: '21:30', label: '21:30', description: 'Lazer' },
    { value: '22:00', label: '22:00', description: 'Antes de dormir' }
  ]
};

export function TimeSelector({ value, onChange, platform = 'linkedin' }: TimeSelectorProps) {
  const times = SUGGESTED_TIMES[platform];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Horário de Publicação
      </label>
      
      <div className="grid grid-cols-3 gap-2">
        {times.map((time) => (
          <button
            key={time.value}
            type="button"
            onClick={() => onChange(time.value)}
            className={`p-2 text-left rounded-lg border-2 transition-all ${
              value === time.value
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="font-medium text-sm">{time.label}</div>
            <div className="text-xs text-gray-500">{time.description}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <span className="text-sm text-gray-500">Ou escolha um horário personalizado:</span>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>
    </div>
  );
}
