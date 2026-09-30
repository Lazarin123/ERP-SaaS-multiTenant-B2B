import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Printer, TrendingUp, Package, AlertTriangle, ListChecks } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GOLD = '#D4AF37';
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const NAVY = '#0A1A33';
const PIE_COLORS = ['#0A1A33', '#D4AF37', '#16305F', '#EAD494', '#5B6B8C'];

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl p-5 shadow-luxury border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <Icon size={18} className={accent ? 'text-gold-500' : 'text-[var(--color-primary)]'} />
      </div>
      <p className="font-display text-3xl mt-2 text-[var(--color-primary)]">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data));
  }, []);

  if (!data) return <p className="text-[var(--color-text-muted)]">Carregando painel...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-primary)]">Painel Principal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Visão geral do seu negócio em tempo real</p>
        </div>
        <button onClick={() => window.print()}
                className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-[var(--color-border)]"
                style={{ borderColor: 'var(--color-border)' }}>
          <Printer size={16} /> Imprimir relatório
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Produtos ativos" value={data.totalProdutos} />
        <StatCard icon={AlertTriangle} label="Estoque baixo" value={data.estoqueBaixoCount} />
        <StatCard icon={ListChecks} label="Cards no Kanban" value={data.statusPedidos.reduce((a, s) => a + s.total, 0)} />
        {can('VIEW_FINANCIAL_REPORTS') && (
          <StatCard icon={TrendingUp} accent
            label="Faturamento (30 dias)"
            value={data.faturamentoTotal30d?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {can('VIEW_FINANCIAL_REPORTS') && (
          <div className="rounded-2xl p-5 shadow-luxury border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-display text-lg text-[var(--color-primary)] mb-4">Faturamento por dia</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.faturamentoPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => brl(v)} />
                <Line type="monotone" dataKey="total" stroke={GOLD} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {can('VIEW_FINANCIAL_REPORTS') && (
          <div className="rounded-2xl p-5 shadow-luxury border lg:col-span-2" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-[var(--color-primary)]">Fluxo de caixa (30 dias)</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Entradas = vendas · Saídas = compras de estoque (preço de custo)</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.fluxoDeCaixa}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => brl(v)} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill={GOLD} radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill={NAVY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-2xl p-5 shadow-luxury border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-display text-lg text-[var(--color-primary)] mb-4">Produtos mais vendidos</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topProdutosVendidos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="qty" fill={NAVY} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 shadow-luxury border lg:col-span-2" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-display text-lg text-[var(--color-primary)] mb-4">Status dos pedidos (Kanban)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.statusPedidos} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                {data.statusPedidos.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
