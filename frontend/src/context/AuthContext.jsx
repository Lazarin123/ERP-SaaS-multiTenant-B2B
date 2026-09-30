import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

const read = (key) => JSON.parse(localStorage.getItem(key) || 'null');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => read('erp_user'));
  const [tenant, setTenant] = useState(() => read('erp_tenant'));
  const [permissions, setPermissions] = useState(() => read('erp_permissions') || {});

  const persist = useCallback((data) => {
    localStorage.setItem('erp_token', data.token);
    localStorage.setItem('erp_user', JSON.stringify(data.user));
    localStorage.setItem('erp_tenant', JSON.stringify(data.tenant));
    localStorage.setItem('erp_permissions', JSON.stringify(data.permissions || {}));
    setUser(data.user);
    setTenant(data.tenant);
    setPermissions(data.permissions || {});
  }, []);

  const login = useCallback(async (email, password) => {
    disconnectSocket(); // garante que o socket use o token do novo usuário
    const { data } = await api.post('/auth/login', { email, password });
    persist(data);
    return data;
  }, [persist]);

  const registerTenant = useCallback(async (payload) => {
    disconnectSocket();
    const { data } = await api.post('/auth/register-tenant', payload);
    persist(data);
    return data;
  }, [persist]);

  const logout = useCallback(() => {
    disconnectSocket();
    ['erp_token', 'erp_user', 'erp_tenant', 'erp_permissions'].forEach((k) => localStorage.removeItem(k));
    setUser(null);
    setTenant(null);
    setPermissions({});
  }, []);

  // Ao abrir o app, revalida as permissões (o Super Admin pode ter alterado algo)
  useEffect(() => {
    if (!localStorage.getItem('erp_token')) return;
    api.get('/users/me').then(({ data }) => {
      const { permissions: perms, ...profile } = data;
      setPermissions(perms || {});
      localStorage.setItem('erp_permissions', JSON.stringify(perms || {}));
      setUser((prev) => {
        const merged = { ...prev, name: profile.name, email: profile.email, role: profile.role, avatarUrl: profile.avatarUrl };
        localStorage.setItem('erp_user', JSON.stringify(merged));
        return merged;
      });
    }).catch(() => {});
  }, []);

  // Apenas UX (esconder menus/botões). A validação real SEMPRE acontece no backend.
  const can = useCallback((permissionKey) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return !!permissions[permissionKey];
  }, [user, permissions]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const merged = { ...prev, ...patch };
      localStorage.setItem('erp_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, login, registerTenant, logout, can, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
