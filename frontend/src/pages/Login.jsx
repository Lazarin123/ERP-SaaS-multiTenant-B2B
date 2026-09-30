import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-luxury p-8">
        <div className="flex flex-col items-center mb-8">
          <Crown className="text-gold-500" size={36} />
          <h1 className="font-display text-2xl text-navy-900 mt-2">Luxury Tech ERP</h1>
          <p className="text-sm text-navy-600/70">Acesse sua conta</p>
        </div>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-800">E-mail</label>
            <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-gold-400">
              <Mail size={18} className="text-gray-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                     className="w-full outline-none text-sm" placeholder="voce@empresa.com" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-navy-800">Senha</label>
            <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-gold-400">
              <Lock size={18} className="text-gray-400" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                     className="w-full outline-none text-sm" placeholder="••••••••" />
            </div>
          </div>
          <button disabled={loading} type="submit"
                  className="w-full bg-navy-900 hover:bg-navy-800 text-gold-300 font-semibold rounded-lg py-2.5 transition-colors shadow-gold disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 mt-6">
          Ainda não tem conta? <Link to="/cadastro" className="text-gold-600 font-medium">Cadastre sua empresa</Link>
        </p>
        <div className="mt-4 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-3">
          <p className="font-semibold mb-1">Credenciais de demonstração (após rodar o seed):</p>
          <p>Admin: admin@demo.com / Admin@123</p>
          <p>Colaborador: colaborador@demo.com / Colab@123</p>
          <p>Super Admin: superadmin@luxurytech.com / SuperAdmin@123</p>
        </div>
      </div>
    </div>
  );
}
