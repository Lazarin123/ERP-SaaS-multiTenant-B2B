import { useEffect, useRef, useState } from 'react';
import { Plus, Upload, Download, ArrowUpCircle, ArrowDownCircle, Trash2, Search, Pencil, Tags } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { printReceipt } from '../services/receipt';

const EMPTY_FORM = { name: '', sku: '', segment: '', categoryId: '', price: '', costPrice: '', stockQty: '', minStock: '' };

export default function Stock() {
  const { can, user, tenant } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);

  async function load() {
    const { data } = await api.get('/products', { params: { search, categoryId: categoryFilter || undefined } });
    setProducts(data);
  }

  async function loadCategories() {
    const { data } = await api.get('/products/categories');
    setCategories(data);
  }

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, categoryFilter]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/products/${editingId}`, form);
      else await api.post('/products', form);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar o produto.');
    }
  }

  function startEdit(p) {
    setForm({
      name: p.name, sku: p.sku || '', segment: p.segment || '', categoryId: p.categoryId || '',
      price: p.price, costPrice: p.costPrice, stockQty: p.stockQty, minStock: p.minStock,
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function newCategory() {
    const name = prompt('Nome da nova categoria:');
    if (!name?.trim()) return;
    await api.post('/products/categories', { name: name.trim() });
    loadCategories();
  }

  async function handleMovement(product, type) {
    const qty = prompt(type === 'IN' ? 'Quantidade a ENTRAR no estoque:' : 'Quantidade a SAIR do estoque:');
    if (!qty || Number(qty) <= 0) return;
    const reason = prompt('Motivo (opcional):') || 'Movimentação manual';
    try {
      await api.post(`/products/${product.id}/movements`, { type, qty: Number(qty), reason });
      load();
      if (confirm('Movimentação registrada. Imprimir comprovante?')) {
        printReceipt({ empresa: tenant?.name, produto: product.name, tipo: type, quantidade: qty, motivo: reason, usuario: user.name });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar movimentação.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este produto?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/import-export/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avisos = data.errors.length ? `\n${data.errors.length} linha(s) ignorada(s): ` + data.errors.slice(0, 5).map((x) => `linha ${x.linha}`).join(', ') : '';
      alert(`Importação concluída: ${data.created} de ${data.totalLinhas} produtos criados.${avisos}`);
      load();
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.error || 'Falha ao importar o arquivo.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleExport(format) {
    try {
      const res = await api.get('/import-export/products/export', { params: { format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Não foi possível exportar o arquivo.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-primary)]">Estoque & Varejo</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Cadastro multi-segmento e controle em tempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can('IMPORT_EXPORT_DATA') && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv,.json" hidden onChange={handleImport} />
              <button onClick={() => fileInputRef.current.click()}
                      className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-[var(--color-border)]" style={{ borderColor: 'var(--color-border)' }}>
                <Upload size={16} /> Importar CSV/JSON
              </button>
              <button onClick={() => handleExport('csv')}
                      className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-[var(--color-border)]" style={{ borderColor: 'var(--color-border)' }}>
                <Download size={16} /> Exportar CSV
              </button>
              <button onClick={() => handleExport('json')}
                      className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-[var(--color-border)]" style={{ borderColor: 'var(--color-border)' }}>
                <Download size={16} /> Exportar JSON
              </button>
            </>
          )}
          {can('MANAGE_STOCK') && (
            <button onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm(EMPTY_FORM); }}
                    className="flex items-center gap-2 text-sm bg-navy-900 text-gold-300 rounded-lg px-3 py-2 shadow-gold">
              <Plus size={16} /> Novo produto
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 w-full max-w-md" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <Search size={16} className="text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..."
                 className="w-full text-sm outline-none bg-transparent" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {can('MANAGE_STOCK') && (
          <button onClick={newCategory} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-[var(--color-border)]" style={{ borderColor: 'var(--color-border)' }}>
            <Tags size={16} /> Nova categoria
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl p-5 shadow-luxury border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" style={{ borderColor: 'var(--color-border)' }} />
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <input placeholder="Segmento" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" step="0.01" placeholder="Preço venda" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <input type="number" step="0.01" placeholder="Preço custo" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <input type="number" disabled={!!editingId} title={editingId ? 'Use entrada/saída para alterar o saldo' : ''} placeholder="Estoque inicial" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <input type="number" placeholder="Estoque mínimo" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
          <button type="submit" className="col-span-2 sm:col-span-4 bg-navy-900 text-gold-300 rounded-lg py-2 text-sm font-semibold shadow-gold">{editingId ? 'Salvar alterações' : 'Salvar produto'}</button>
        </form>
      )}

      <div className="rounded-2xl shadow-luxury border overflow-x-auto" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{p.category?.name || '—'}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{p.segment || '—'}</td>
                <td className="px-4 py-3">{Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3">
                  <span className={p.stockQty <= p.minStock ? 'text-red-600 font-semibold' : ''}>{p.stockQty}</span>
                  {p.stockQty <= p.minStock && <span className="ml-1 text-[10px] uppercase text-red-500">baixo</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {can('MANAGE_STOCK') && (
                      <>
                        <button onClick={() => handleMovement(p, 'IN')} title="Entrada" className="text-green-600"><ArrowUpCircle size={18} /></button>
                        <button onClick={() => startEdit(p)} title="Editar"><Pencil size={17} /></button>
                        <button onClick={() => handleMovement(p, 'OUT')} title="Saída" className="text-orange-500"><ArrowDownCircle size={18} /></button>
                      </>
                    )}
                    {can('DELETE_RECORDS') && (
                      <button onClick={() => handleDelete(p.id)} title="Excluir" className="text-red-500"><Trash2 size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Nenhum produto cadastrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
