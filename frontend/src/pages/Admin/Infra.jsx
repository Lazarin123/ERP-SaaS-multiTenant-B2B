import { useEffect, useState } from 'react';
import { Plus, PlugZap, Pencil, Trash2, Server, Loader2 } from 'lucide-react';
import api from '../../services/api';

const TYPES = { API: 'API', DATABASE: 'Banco de dados', CLOUD_STORAGE: 'Armazenamento em nuvem', OTHER: 'Outro' };
const STATUS_STYLE = {
  ONLINE: 'bg-green-100 text-green-700',
  OFFLINE: 'bg-red-100 text-red-700',
  NUNCA_TESTADO: 'bg-gray-100 text-gray-600',
};
const STATUS_LABEL = { ONLINE: 'Online', OFFLINE: 'Offline', NUNCA_TESTADO: 'Não testado' };
const card = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' };
const inputCls = 'border rounded-lg px-3 py-2 text-sm bg-transparent';

export default function AdminInfra() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [form, setForm] = useState({ name: '', type: 'API', url: '' });
  const [testingId, setTestingId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/infra');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  function startNew() { setForm({ name: '', type: 'API', url: '' }); setEditing('new'); setError(''); }
  function startEdit(item) { setForm({ name: item.name, type: item.type, url: item.url }); setEditing(item); setError(''); }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing === 'new') await api.post('/infra', form);
      else await api.put(`/infra/${editing.id}`, { name: form.name, url: form.url });
      setEditing(null);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao salvar.'); }
  }

  async function test(item) {
    setTestingId(item.id);
    try { await api.post(`/infra/${item.id}/test`); }
    catch (err) { alert(err.response?.data?.error || 'Falha ao testar.'); }
    finally { setTestingId(null); load(); }
  }

  async function remove(item) {
    if (!confirm(`Remover "${item.name}"?`)) return;
    await api.delete(`/infra/${item.id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-primary)]">Infraestrutura</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Cadastre, teste e edite APIs, servidores e conexões em nuvem</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 text-sm bg-navy-900 text-gold-300 rounded-lg px-3 py-2 shadow-gold">
          <Plus size={16} /> Nova conexão
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_2fr_auto] gap-3 rounded-2xl p-5 shadow-luxury border items-start" style={card}>
          <input required placeholder="Nome (ex: API de Pagamentos)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={{ borderColor: 'var(--color-border)' }} />
          <select disabled={editing !== 'new'} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls} style={{ borderColor: 'var(--color-border)' }}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input required type="url" placeholder="https://api.exemplo.com/health" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputCls} style={{ borderColor: 'var(--color-border)' }} />
          <div className="flex gap-2">
            <button type="submit" className="bg-navy-900 text-gold-300 rounded-lg px-4 py-2 text-sm font-semibold shadow-gold">Salvar</button>
            <button type="button" onClick={() => setEditing(null)} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }}>Cancelar</button>
          </div>
          {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl p-5 shadow-luxury border" style={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-navy-900 text-gold-300"><Server size={18} /></div>
                <div className="min-w-0">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{TYPES[item.type]}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{item.url}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {item.lastTestedAt ? `Último teste: ${new Date(item.lastTestedAt).toLocaleString('pt-BR')}` : 'Nunca testado'}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => test(item)} title="Testar conexão" disabled={testingId === item.id}>
                  {testingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <PlugZap size={18} className="text-gold-500" />}
                </button>
                <button onClick={() => startEdit(item)} title="Editar"><Pencil size={18} /></button>
                <button onClick={() => remove(item)} title="Remover"><Trash2 size={18} className="text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] lg:col-span-2 text-center py-10">Nenhuma conexão cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
