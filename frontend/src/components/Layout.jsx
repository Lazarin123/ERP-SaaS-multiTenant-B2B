import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Trello, MessageSquare, Sparkles, Megaphone,
  Users, ServerCog, UserCircle, LogOut, Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD_OPERACIONAL' },
  { to: '/estoque', label: 'Estoque', icon: Package, permission: 'VIEW_STOCK' },
  { to: '/kanban', label: 'Kanban', icon: Trello, permission: 'VIEW_KANBAN' },
  { to: '/chat', label: 'Chat Interno', icon: MessageSquare, permission: 'USE_CHAT' },
  { to: '/ia/suporte', label: 'IA de Suporte', icon: Sparkles, permission: 'USE_AI_SUPPORT' },
  { to: '/ia/marketing', label: 'IA de Marketing', icon: Megaphone, permission: 'USE_AI_MARKETING' },
  { to: '/admin/usuarios', label: 'Usuários & Permissões', icon: Users, permission: 'MANAGE_USERS' },
  { to: '/admin/infraestrutura', label: 'Infraestrutura', icon: ServerCog, permission: 'MANAGE_INFRA' },
];

export default function Layout({ children }) {
  const { user, tenant, logout, can } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col bg-navy-900 text-white">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-white/10">
          <Crown className="text-gold-400" size={26} />
          <div>
            <p className="font-display text-lg leading-none">Luxury Tech</p>
            <p className="text-xs text-gold-300 tracking-widest uppercase">ERP</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter((item) => can(item.permission)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gold-400/15 text-gold-300 shadow-gold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-xs text-white/50">
          Plano <span className="text-gold-300 font-semibold">TOP</span> · {tenant?.name}
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="md:hidden font-display text-lg text-[var(--color-primary)]">Luxury Tech ERP</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <NavLink to="/perfil" className="flex items-center gap-2 text-sm">
              {user?.avatarUrl ? (
                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${user.avatarUrl}`}
                     alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gold-400" />
              ) : (
                <UserCircle className="text-[var(--color-primary)]" size={28} />
              )}
              <span className="hidden sm:inline text-[var(--color-text)]">{user?.name}</span>
            </NavLink>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
