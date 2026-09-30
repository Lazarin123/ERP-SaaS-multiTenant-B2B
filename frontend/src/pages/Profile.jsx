import { useRef, useState } from 'react';
import { Camera, Save, KeyRound } from 'lucide-react';
import api, { API_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin (Perfil Mestre)', ADMIN: 'Administrador', COLLABORATOR: 'Colaborador' };

export default function Profile() {
  const { user, tenant, updateUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(user.avatarUrl ? `${API_URL}${user.avatarUrl}` : null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);

  function notify(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // Pré-visualização local, antes de enviar ao servidor
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('error', 'Selecione um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) return notify('error', 'A imagem deve ter no máximo 5MB.');
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/me', form);
      let avatarUrl = data.avatarUrl;

      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        const res = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        avatarUrl = res.data.avatarUrl;
        setAvatarFile(null);
      }

      updateUser({ name: data.name, email: data.email, avatarUrl });
      notify('success', 'Perfil atualizado com sucesso!');
    } catch (err) {
      notify('error', err.response?.data?.error || 'Erro ao salvar o perfil.');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      await api.put('/users/me/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      notify('success', 'Senha alterada com sucesso.');
    } catch (err) {
      notify('error', err.response?.data?.error || 'Erro ao alterar a senha.');
    }
  }

  const card = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--color-primary)]">Configurações da Conta</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {ROLE_LABELS[user.role]} · {tenant?.name} · Plano {tenant?.plan}
        </p>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-2 border ${msg.type === 'success'
          ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={saveProfile} className="rounded-2xl p-6 shadow-luxury border space-y-5" style={card}>
        <div className="flex items-center gap-5">
          <div className="relative">
            {preview ? (
              <img src={preview} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-2 border-gold-400" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-navy-900 text-gold-300 flex items-center justify-center font-display text-3xl border-2 border-gold-400">
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <button type="button" onClick={() => fileRef.current.click()}
                    className="absolute -bottom-1 -right-1 bg-navy-900 text-gold-300 p-2 rounded-full shadow-gold" title="Trocar foto">
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            <p>Envie uma foto direto do seu dispositivo.</p>
            <p className="text-xs">JPG, PNG, WEBP ou GIF · até 5MB{avatarFile && ' · pré-visualização (ainda não salva)'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                   className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          </div>
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                   className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          </div>
        </div>

        <button type="submit" className="flex items-center gap-2 bg-navy-900 text-gold-300 rounded-lg px-4 py-2 text-sm font-semibold shadow-gold">
          <Save size={16} /> Salvar alterações
        </button>
      </form>

      <form onSubmit={changePassword} className="rounded-2xl p-6 shadow-luxury border space-y-4" style={card}>
        <h2 className="font-display text-lg text-[var(--color-primary)] flex items-center gap-2"><KeyRound size={18} /> Alterar senha</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="password" required placeholder="Senha atual" value={pw.currentPassword}
                 onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                 className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
          <input type="password" required minLength={6} placeholder="Nova senha" value={pw.newPassword}
                 onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                 className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <button type="submit" className="border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[var(--color-border)]" style={{ borderColor: 'var(--color-border)' }}>
          Atualizar senha
        </button>
      </form>
    </div>
  );
}
