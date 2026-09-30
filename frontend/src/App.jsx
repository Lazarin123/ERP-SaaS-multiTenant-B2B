import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import RegisterTenant from './pages/RegisterTenant';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stock = lazy(() => import('./pages/Stock'));
const Kanban = lazy(() => import('./pages/Kanban'));
const Chat = lazy(() => import('./pages/Chat'));
const Profile = lazy(() => import('./pages/Profile'));
const AiSupport = lazy(() => import('./pages/AI/Support'));
const AiMarketing = lazy(() => import('./pages/AI/Marketing'));
const AdminUsers = lazy(() => import('./pages/Admin/Users'));
const AdminInfra = lazy(() => import('./pages/Admin/Infra'));

function Private({ children, permission }) {
  return (
    <ProtectedRoute permission={permission}>
      <Layout>
        <Suspense fallback={<p className="text-[var(--color-text-muted)]">Carregando...</p>}>{children}</Suspense>
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<RegisterTenant />} />

      <Route path="/" element={<Private permission="VIEW_DASHBOARD_OPERACIONAL"><Dashboard /></Private>} />
      <Route path="/estoque" element={<Private permission="VIEW_STOCK"><Stock /></Private>} />
      <Route path="/kanban" element={<Private permission="VIEW_KANBAN"><Kanban /></Private>} />
      <Route path="/chat" element={<Private permission="USE_CHAT"><Chat /></Private>} />
      <Route path="/perfil" element={<Private><Profile /></Private>} />
      <Route path="/ia/suporte" element={<Private permission="USE_AI_SUPPORT"><AiSupport /></Private>} />
      <Route path="/ia/marketing" element={<Private permission="USE_AI_MARKETING"><AiMarketing /></Private>} />
      <Route path="/admin/usuarios" element={<Private permission="MANAGE_USERS"><AdminUsers /></Private>} />
      <Route path="/admin/infraestrutura" element={<Private permission="MANAGE_INFRA"><AdminInfra /></Private>} />
    </Routes>
  );
}
