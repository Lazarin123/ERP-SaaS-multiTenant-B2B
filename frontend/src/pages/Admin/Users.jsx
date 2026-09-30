import { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, ShieldOff, Trash2, KeyRound, X, RotateCcw } from 'lucide-react';
import api, { API_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', COLLABORATOR: 'Colaborador' };

// Rótulos amigáveis para as permissões (chaves definidas em backend/src/utils/permissions.js)
const PERM_LABELS = {
  VIEW_FINANCIAL_REPORTS: 'Ver relatórios financeiros',
  EXPORT_REPORTS: 'Exportar relatórios',
  MANAGE_SETTINGS: 'Alterar configurações do sistema',
  MANAGE_INFRA: 'Gerenciar infraestrutura',
  MANAGE_THEME: 'Alterar tema da empresa',
  MANAGE_USERS: 'Gerenciar usuários',
  DELETE_RECORDS: 'Excluir cadastros',
  VIEW_STOCK: 'Ver estoque',
  MANAGE_STOCK: 'Movimentar/editar estoque',
  IMPORT_EXPORT_DATA: 'Importar/exportar dados',
  VIEW_KANBAN: 'Ver Kanban',
  MANAGE_KANBAN: 'Mover/editar cards',
  USE_CHAT: 'Usar chat interno',
  CREATE_GROUP_CHAT: 'Criar/editar grupos de chat',
  USE_AI_SUPPORT: 'Usar IA de Suporte',
  USE_AI_MARKETING: 'Usar IA de Marketing',
  VIEW_DASHBOARD_GLOBAL: 'Dashboard global',
  VIEW_DASHBOARD_OPERACIONAL: 'Dashboard operacional',
};

const card = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const isSuper = me.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'COLLABORATOR' });
  const [error, setError] = useState('');
  const [permUser, setPermUser] = useState(null);       // usuário cujo painel de permissões está aberto
  const [catalog, setCatalog] = useState({});
  const [overrides, setOverrides] = useState([]);

  async function load() {
    const { data } = await api.get('/users');
    setUsers(data);
  }
  useEffect(() => { load(); }, []);

  function flash(msg) { setError(msg); setTimeout(() => setError(''), 5000); }

  async function createUser(e) {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'COLLABORATOR' });
      setShowForm(false);
      load();
    } catch (err) { flash(err.response?.data?.error || 'Erro ao criar usuário.'); }
  }

  async function toggleActive(u) {
    try { await api.patch(`/users/${u.id}/status`, { active: !u.active }); load(); }
    catch (err) { flash(err.response?.data?.error || 'Erro ao alterar status.'); }
  }

  async function changeRole(u, role) {
    try { await api.patch(`/users/${u.id}/role`, { role }); load(); }
    catch (err) { flash(err.response?.data?.error || 'Erro ao alterar perfil.'); }
  }

  async function removeUser(u) {
    if (!confirm(`Excluir definitivamente ${u.name}?`)) return;
    try { await api.delete(`/users/${u.id}`); load(); }
    catch (err) { flash(err.response?.data?.error || 'Erro ao excluir.'); }
  }

  async function openPermissions(u) {
    const { data } = await api.get('/users/permissions/catalog');
    setCatalog(data.catalog);
    setOverrides(data.overrides.filter((o) => o.userId === u.id));
    setPermUser(u);
  }

  // Valor efetivo = override individual, senão padrão da matriz do perfil
  function effective(key) {
    const o = overrides.find((x) => x.permissionKey === key);
    if (o) return { allowed: o.allowed, custom: true };
    return { allowed: (catalog[key] || []).includes(permUser.role), custom: false };
  }

  async function setPermission(key, allowed) {
    const { data } = await api.put(`/users/${permUser.id}/permissions/${key}`, { allowed });
    setOverrides((prev) => [...prev.filter((o) => o.permissionKey !== key), data]);
  }

  async function resetPermission(key) {
    await api.delete(`/users/${permUser.id}/permissions/${key}`);
    setOverrides((prev) => prev.filter((o) => o.permissionKey !== key));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-primary)]">Usuários & Permissões</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isSuper ? 'Painel Mestre: controle total de perfis e permissões granulares' : 'Gerencie o acesso da sua equipe'}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 text-sm bg-navy-900 text-gold-300 rounded-lg px-3 py-2 shadow-gold">
          <UserPlus size={16} /> Novo usuário
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-2xl p-5 shadow-luxury border" style={card}>
          <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          <input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          <input required minLength={6} type="password" placeholder="Senha inicial" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
            <option value="COLLABORATOR">Colaborador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <button type="submit" className="sm:col-span-4 bg-navy-900 text-gold-300 rounded-lg py-2 text-sm font-semibold shadow-gold">Criar usuário</button>
        </form>
      )}

      <div className="rounded-2xl shadow-luxury border overflow-x-auto" style={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
              <th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = u.role === 'SUPER_ADMIN' && !isSuper;
              return (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl
                        ? <img src={`${API_URL}${u.avatarUrl}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-navy-900 text-gold-300 flex items-center justify-center text-xs">{u.name[0]}</div>}
                      <div><p className="font-medium">{u.name}</p><p className="text-xs text-[var(--color-text-muted)]">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSuper && u.id !== me.id ? (
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="border rounded-lg px-2 py-1 text-xs bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : ROLE_LABELS[u.role]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!locked && u.id !== me.id && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleActive(u)} title={u.active ? 'Bloquear acesso' : 'Liberar acesso'}>
                          {u.active ? <ShieldOff size={18} className="text-orange-500" /> : <ShieldCheck size={18} className="text-green-600" />}
                        </button>
                        {isSuper && u.role !== 'SUPER_ADMIN' && (
                          <button onClick={() => openPermissions(u)} title="Permissões granulares"><KeyRound size={18} className="text-gold-500" /></button>
                        )}
                        <button onClick={() => removeUser(u)} title="Excluir"><Trash2 size={18} className="text-red-500" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {permUser && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setPermUser(null)}>
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-luxury border p-6" style={card} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-xl text-[var(--color-primary)]">Permissões de {permUser.name}</h2>
              <button onClick={() => setPermUser(null)}><X size={20} /></button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Perfil base: {ROLE_LABELS[permUser.role]}. Ajustes individuais (dourado) sobrepõem o padrão do perfil.
            </p>
            <div className="space-y-1">
              {Object.keys(PERM_LABELS).map((key) => {
                const { allowed, custom } = effective(key);
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-sm">{PERM_LABELS[key]}{custom && <span className="ml-2 text-[10px] uppercase text-gold-500 font-semibold">personalizado</span>}</span>
                    <div className="flex items-center gap-2">
                      {custom && <button onClick={() => resetPermission(key)} title="Voltar ao padrão do perfil"><RotateCcw size={14} className="text-[var(--color-text-muted)]" /></button>}
                      <button onClick={() => setPermission(key, !allowed)}
                              className={`w-11 h-6 rounded-full relative transition-colors ${allowed ? 'bg-navy-900' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${allowed ? 'left-[22px] bg-gold-300' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
