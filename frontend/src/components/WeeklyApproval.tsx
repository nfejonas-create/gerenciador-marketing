import { useState } from 'react';
import { 
  Check, X, Edit2, RefreshCw, Clock, Calendar,
  ChevronDown, ChevronUp, Sparkles, ArrowRight
} from 'lucide-react';

interface WeekPost {
  day: string;
  dayLabel: string;
  content: string;
  strategy: string;
  suggestedTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  platform: string;
}

interface WeeklyApprovalProps {
  weekPosts: WeekPost[];
  weeklyContentId: string;
  onApprove: (dayIndex: number) => void;
  onReject: (dayIndex: number) => void;
  onEdit: (dayIndex: number, newContent: string) => void;
  onRegenerate: (dayIndex: number) => void;
  onSchedule: (schedules: ScheduleData[]) => void;
  isLoading: boolean;
}

interface ScheduleData {
  dayIndex: number;
  date: string;
  time: string;
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  approved: 'bg-green-100 text-green-600 border-green-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
  scheduled: 'bg-blue-100 text-blue-600 border-blue-200'
};

const STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  scheduled: 'Agendado'
};

export function WeeklyApproval({
  weekPosts,
  weeklyContentId,
  onApprove,
  onReject,
  onEdit,
  onRegenerate,
  onSchedule,
  isLoading
}: WeeklyApprovalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [schedules, setSchedules] = useState<Record<number, { date: string; time: string }>>({});

  const approvedCount = weekPosts.filter(p => p.status === 'approved').length;
  const rejectedCount = weekPosts.filter(p => p.status === 'rejected').length;

  const handleEditStart = (index: number, content: string) => {
    setEditingIndex(index);
    setEditContent(content);
  };

  const handleEditSave = (index: number) => {
    onEdit(index, editContent);
    setEditingIndex(null);
    setEditContent('');
  };

  const handleScheduleAll = () => {
    const scheduleData: ScheduleData[] = [];
    weekPosts.forEach((post, index) => {
      if (post.status === 'approved' && schedules[index]) {
        scheduleData.push({
          dayIndex: index,
          date: schedules[index].date,
          time: schedules[index].time
        });
      }
    });
    onSchedule(scheduleData);
  };

  const getNextSevenDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        })
      });
    }
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
        <div>
          <h3 className="font-semibold text-gray-900">
            Revisar e Aprovar Posts
          </h3>
          <p className="text-sm text-gray-600">
            {approvedCount} aprovados, {rejectedCount} rejeitados de {weekPosts.length} posts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScheduleAll}
            disabled={approvedCount === 0 || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Agendar Aprovados
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {weekPosts.map((post, index) => (
          <div
            key={index}
            className={`border-2 rounded-xl overflow-hidden transition-all ${
              post.status === 'approved' ? 'border-green-200 bg-green-50/30' :
              post.status === 'rejected' ? 'border-red-200 bg-red-50/30' :
              post.status === 'scheduled' ? 'border-blue-200 bg-blue-50/30' :
              'border-gray-200'
            }`}
          >
            {/* Post Header */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[post.status]}`}>
                  {STATUS_LABELS[post.status]}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {post.dayLabel}
                  </div>
                  <div className="text-sm text-gray-500">
                    {post.strategy} • {post.suggestedTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  post.platform === 'linkedin' ? 'bg-blue-600' : 'bg-blue-800'
                }`} />
                <span className="text-sm text-gray-500 capitalize">
                  {post.platform}
                </span>
              </div>

              {expandedIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Expanded Content */}
            {expandedIndex === index && (
              <div className="p-4 border-t border-gray-100 space-y-4">
                {/* Content */}
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-48 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(index)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
                    {post.content}
                  </div>
                )}

                {/* Actions */}
                {editingIndex !== index && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onApprove(index)}
                        disabled={post.status === 'approved'}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar
                      </button>

                      <button
                        onClick={() => onReject(index)}
                        disabled={post.status === 'rejected'}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Rejeitar
                      </button>

                      <button
                        onClick={() => handleEditStart(index, post.content)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>

                      <button
                        onClick={() => onRegenerate(index)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Gerar Novamente
                      </button>
                    </div>

                    {/* Scheduling */}
                    {post.status === 'approved' && (
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Agendar para:</span>
                        
                        <select
                          value={schedules[index]?.date || ''}
                          onChange={(e) => setSchedules(prev => ({
                            ...prev,
                            [index]: { ...prev[index], date: e.target.value }
                          }))}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                        >
                          <option value="">Selecionar data</option>
                          {getNextSevenDays().map(day => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="time"
                          value={schedules[index]?.time || post.suggestedTime}
                          onChange={(e) => setSchedules(prev => ({
                            ...prev,
                            [index]: { ...prev[index], time: e.target.value }
                          }))}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
