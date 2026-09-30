import { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import api from '../services/api';

/**
 * Chat genérico de IA.
 * props: endpoint ('/ai/support' | '/ai/marketing'), title, subtitle, icon, suggestions[]
 */
export default function AiChat({ endpoint, title, subtitle, icon: Icon, suggestions = [] }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function send(content) {
    const message = (content ?? text).trim();
    if (!message || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setText('');
    setLoading(true);

    try {
      const { data } = await api.post(endpoint, { message, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${err.response?.data?.error || 'Não foi possível obter resposta da IA.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-navy-900 text-gold-300 shadow-gold"><Icon size={22} /></div>
        <div>
          <h1 className="font-display text-2xl text-[var(--color-primary)]">{title}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 rounded-2xl shadow-luxury border overflow-y-auto p-4 space-y-4"
           style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Experimente uma destas sugestões:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                        className="text-xs px-3 py-2 rounded-full border hover:border-gold-400 transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] text-left px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-navy-900 text-gold-200' : ''
            }`} style={m.role !== 'user' ? { background: 'var(--color-border)' } : {}}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 size={16} className="animate-spin" /> Pensando...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua pergunta..."
               className="flex-1 border rounded-xl px-4 py-3 text-sm outline-none focus:border-gold-400"
               style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }} />
        <button type="submit" disabled={loading} className="bg-navy-900 text-gold-300 rounded-xl p-3 shadow-gold disabled:opacity-60">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
