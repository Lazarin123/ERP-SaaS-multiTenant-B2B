import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, permission }) {
  const { user, can } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <p className="font-display text-2xl text-[var(--color-primary)] mb-2">Acesso restrito</p>
        <p className="text-[var(--color-text-muted)]">
          Você não tem permissão para visualizar esta área. Fale com um administrador.
        </p>
      </div>
    );
  }
  return children;
}
