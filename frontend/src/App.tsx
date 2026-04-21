import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, ErrorInfo, ReactNode } from "react";
import { AuthProvider, useAuth } from './contexts/AuthContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-8">
          <h1 className="text-2xl font-bold text-red-400">Algo deu errado</h1>
          <pre className="text-xs text-gray-400 bg-gray-900 p-4 rounded-lg max-w-xl overflow-auto whitespace-pre-wrap">{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm">Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Conteudo from './pages/Conteudo';
import Carrossel from './pages/Carrossel';
import Funil from './pages/Funil';
import Calendario from './pages/Calendario';
import Configuracoes from './pages/Configuracoes';
import AuthCallback from './pages/AuthCallback';
import BaseConhecimento from './pages/BaseConhecimento';
import ContentGenerator from './pages/ContentGenerator';
import Layout from './components/Layout';
import AdminUsers from './pages/admin/Users';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="conteudo" element={<Conteudo />} />
            <Route path="carrossel" element={<Carrossel />} />
            <Route path="base-conhecimento" element={<BaseConhecimento />} />
            <Route path="gerador-conteudo" element={<ContentGenerator />} />
            <Route path="funil" element={<Funil />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
