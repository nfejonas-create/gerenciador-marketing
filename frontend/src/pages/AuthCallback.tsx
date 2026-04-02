import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const token = params.get('token');
    if (token) { login(token); navigate('/dashboard'); }
    else navigate('/login');
  }, []);
  return <div className="flex items-center justify-center h-screen"><p className="text-gray-400">Autenticando...</p></div>;
}
