import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminModeBanner() {
  const { isAdminMode, effectiveUser, stopImpersonating } = useAuth();
  if (!isAdminMode) return null;
  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium">
      <span>
        Modo Admin ativo — Você está gerenciando: <strong>{effectiveUser?.name}</strong> ({effectiveUser?.email})
      </span>
      <button onClick={stopImpersonating} className="flex items-center gap-1 hover:opacity-70 transition-opacity ml-4">
        <X size={14} /> Voltar ao meu perfil
      </button>
    </div>
  );
}
