import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SEGMENTOS = ['Varejo', 'Mercadinho', 'Restaurante', 'Padaria', 'Loja Tech', 'Outro'];

export default function RegisterTenant() {
  const { registerTenant } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', segment: 'Varejo', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await registerTenant(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white/95 rounded-2xl shadow-luxury p-8">
        <div className="flex flex-col items-center mb-6">
          <Crown className="text-gold-500" size={36} />
          <h1 className="font-display text-2xl text-navy-900 mt-2">Crie a conta da sua empresa</h1>
          <p className="text-sm text-navy-600/70">Plano TOP · acesso completo desde o primeiro dia</p>
        </div>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-navy-800">Nome da empresa</label>
            <input required value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
                   className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-navy-800">Segmento</label>
            <select value={form.segment} onChange={(e) => update('segment', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400">
              {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-navy-800">Seu nome</label>
            <input required value={form.name} onChange={(e) => update('name', e.target.value)}
                   className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-navy-800">E-mail</label>
            <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                   className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-navy-800">Senha</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)}
                   className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400" />
          </div>
          <button disabled={loading} type="submit"
                  className="sm:col-span-2 bg-navy-900 hover:bg-navy-800 text-gold-300 font-semibold rounded-lg py-2.5 transition-colors shadow-gold disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar conta e entrar'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 mt-6">
          Já tem conta? <Link to="/login" className="text-gold-600 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
