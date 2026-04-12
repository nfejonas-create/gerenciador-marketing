import { useState, useEffect } from 'react';
import { weekApi, postsApi } from '../services/api/v3';
import { CalendarDays, Linkedin, Facebook, Clock } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  platform: string;
  status: string;
  scheduledAt: string;
}

interface DayGroup {
  day: string;
  dayIndex: number;
  posts: Post[];
}

interface WeekData {
  grouped: DayGroup[];
  allPosts: Post[];
}

export default function Semanas() {
  const [weekNumber, setWeekNumber] = useState(1);
  const [platform, setPlatform] = useState('all');
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeek = async () => {
    setLoading(true);
    try {
      const params: { platform?: string } = {};
      if (platform !== 'all') params.platform = platform;
      const res = await weekApi.getWeek(weekNumber, platform === 'all' ? undefined : platform);
      setWeekData(res.data);
    } catch (err) {
      console.error('Error fetching week:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeek();
  }, [weekNumber, platform]);

  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-blue-500" />
            Semanas do Mês
          </h1>
          <p className="text-gray-400 mt-1">Visualize os posts agendados por semana</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4].map((w) => (
              <option key={w} value={w}>Semana {w}</option>
            ))}
          </select>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Plataformas</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {days.map((day, index) => {
            const dayData = weekData?.grouped?.find((g: DayGroup) => g.dayIndex === index);
            const posts = dayData?.posts || [];

            return (
              <div key={day} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white text-center">{day}</h3>
                </div>

                <div className="p-3 space-y-3 min-h-[200px]">
                  {posts.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm py-8">Nenhum post agendado</p>
                  ) : (
                    posts.map((post: Post) => (
                      <div
                        key={post.id}
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 hover:border-blue-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {post.platform === 'LINKEDIN' ? (
                            <Linkedin className="text-blue-400" size={16} />
                          ) : post.platform === 'FACEBOOK' ? (
                            <Facebook className="text-blue-600" size={16} />
                          ) : (
                            <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">Ambos</span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              post.status === 'published'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {post.status === 'published' ? 'Publicado' : 'Agendado'}
                          </span>
                        </div>

                        <p className="text-gray-300 text-sm line-clamp-3 mb-2">{post.content}</p>

                        {post.scheduledAt && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Clock size={12} />
                            {new Date(post.scheduledAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {weekData?.allPosts && weekData.allPosts.length > 0 && (
        <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="font-semibold text-white mb-3">Resumo da Semana</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{weekData.allPosts.length}</p>
              <p className="text-gray-400 text-sm">Total de Posts</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {weekData.allPosts.filter((p: Post) => p.status === 'scheduled').length}
              </p>
              <p className="text-gray-400 text-sm">Agendados</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {weekData.allPosts.filter((p: Post) => p.status === 'published').length}
              </p>
              <p className="text-gray-400 text-sm">Publicados</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {weekData.allPosts.filter((p: Post) => p.platform === 'LINKEDIN' || p.platform === 'BOTH').length}
              </p>
              <p className="text-gray-400 text-sm">LinkedIn</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
