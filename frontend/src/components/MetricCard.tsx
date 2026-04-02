interface Props { title: string; value: string | number; change?: number; icon?: React.ReactNode; platform?: string; }

export default function MetricCard({ title, value, change, icon, platform }: Props) {
  const platformColor = platform === 'linkedin' ? 'border-blue-700' : platform === 'facebook' ? 'border-indigo-700' : 'border-gray-700';
  return (
    <div className={`bg-gray-900 border ${platformColor} rounded-xl p-5`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {change !== undefined && (
        <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}% vs periodo anterior
        </p>
      )}
    </div>
  );
}
