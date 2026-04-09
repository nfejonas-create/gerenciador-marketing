import { Check, X, Edit2, RefreshCw, Clock } from 'lucide-react';

interface PostCardProps {
  day: string;
  dayLabel: string;
  content: string;
  strategy: string;
  suggestedTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  platform: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400'
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-green-100 text-green-600 border-green-200',
    dot: 'bg-green-500'
  },
  rejected: {
    label: 'Rejeitado',
    className: 'bg-red-100 text-red-600 border-red-200',
    dot: 'bg-red-500'
  },
  scheduled: {
    label: 'Agendado',
    className: 'bg-blue-100 text-blue-600 border-blue-200',
    dot: 'bg-blue-500'
  }
};

export function PostCard({
  dayLabel,
  content,
  strategy,
  suggestedTime,
  status,
  platform,
  onApprove,
  onReject,
  onEdit,
  onRegenerate,
  isLoading
}: PostCardProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className={`border-2 rounded-xl p-4 transition-all ${
      status === 'approved' ? 'border-green-200 bg-green-50/30' :
      status === 'rejected' ? 'border-red-200 bg-red-50/30 opacity-60' :
      status === 'scheduled' ? 'border-blue-200 bg-blue-50/30' :
      'border-gray-200 hover:border-purple-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{dayLabel}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.className}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1`} />
            {statusConfig.label}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${platform === 'linkedin' ? 'bg-blue-600' : 'bg-blue-800'}`} />
          <span className="capitalize">{platform}</span>
        </div>
      </div>

      {/* Strategy & Time */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
          {strategy}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {suggestedTime}
        </span>
      </div>

      {/* Content Preview */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onApprove}
          disabled={status === 'approved' || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Aprovar
        </button>

        <button
          onClick={onReject}
          disabled={status === 'rejected' || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Rejeitar
        </button>

        <button
          onClick={onEdit}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Editar
        </button>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Gerar Novo
        </button>
      </div>
    </div>
  );
}
