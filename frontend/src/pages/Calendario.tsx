import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../services/api';

export default function Calendario() {
  const [weeks, setWeeks] = useState(4);
  const [platforms, setPlatforms] = useState(['linkedin', 'facebook']);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try { const { data } = await api.post('/content/calendar', { weeks, platforms }); setCalendar(data.calendar || []); }
    catch (e: any) { alert(e.response?.data?.error || 'Erro ao gerar calendario'); }
    finally { setLoading(false); }
  }

  const grouped = calendar.reduce((acc: any, item) => {
    if (!acc[item.week]) acc[item.week] = [];
    acc[item.week].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Calendario de Conteudo</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Semanas</label>
            <select value={weeks} onChange={e => setWeeks(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
              {[2, 4, 6, 8].map(w => <option key={w} value={w}>{w} semanas</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Plataformas</label>
            <div className="flex gap-2">
              {['linkedin', 'facebook'].map(p => (
                <button key={p} onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${platforms.includes(p) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{p}</button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading || platforms.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
            <Sparkles size={16} /> {loading ? 'Gerando...' : 'Gerar Calendario'}
          </button>
        </div>
      </div>
      {Object.entries(grouped).map(([week, items]: any) => (
        <div key={week} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Semana {week}</h2>
          <div className="grid grid-cols-2 gap-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 text-xs">{item.day}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.platform === 'linkedin' ? 'bg-blue-900 text-blue-300' : 'bg-indigo-900 text-indigo-300'}`}>{item.platform}</span>
                </div>
                <p className="text-white text-sm font-medium">{item.topic}</p>
                <p className="text-gray-400 text-xs mt-1">{item.type}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {calendar.length === 0 && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-400">Configure as opcoes acima e clique em Gerar Calendario.</p>
        </div>
      )}
    </div>
  );
}
