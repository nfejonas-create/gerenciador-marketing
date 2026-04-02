import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Conteudo from './pages/Conteudo';
import Funil from './pages/Funil';
import Calendario from './pages/Calendario';
import Configuracoes from './pages/Configuracoes';
import AuthCallback from './pages/AuthCallback';
import BaseConhecimento from './pages/BaseConhecimento';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="conteudo" element={<Conteudo />} />
            <Route path="base-conhecimento" element={<BaseConhecimento />} />
            <Route path="funil" element={<Funil />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
