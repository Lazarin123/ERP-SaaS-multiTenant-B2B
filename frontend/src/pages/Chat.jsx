import { useEffect, useRef, useState } from 'react';
import { Send, Users, UserPlus, Pencil, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

export default function Chat() {
  const { user, can } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [groupModal, setGroupModal] = useState(null); // { mode: 'create' | 'edit', name, selected: [] }
  const endRef = useRef(null);

  async function loadRooms() {
    const { data } = await api.get('/chat/rooms');
    setRooms(data);
  }

  useEffect(() => {
    loadRooms();
    api.get('/chat/team-members').then((res) => setTeamMembers(res.data));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('chat:message', (msg) => {
      setMessages((prev) => (activeRoom && msg.roomId === activeRoom.id ? [...prev, msg] : prev));
    });
    return () => socket.off('chat:message');
  }, [activeRoom]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function openRoom(room) {
    setActiveRoom(room);
    getSocket().emit('chat:join', room.id);
    const { data } = await api.get(`/chat/rooms/${room.id}/messages`);
    setMessages(data);
  }

  async function startDirect(targetUserId) {
    const { data } = await api.post('/chat/rooms/direct', { targetUserId });
    await loadRooms();
    openRoom(data);
  }

  function openCreateGroup() { setGroupModal({ mode: 'create', name: '', selected: [] }); }
  function openEditGroup() { setGroupModal({ mode: 'edit', name: activeRoom.name, selected: [] }); }

  async function submitGroup(e) {
    e.preventDefault();
    const { mode, name, selected } = groupModal;
    if (!name.trim()) return;
    if (mode === 'create') {
      const { data } = await api.post('/chat/rooms/group', { name: name.trim(), memberIds: selected });
      await loadRooms();
      setGroupModal(null);
      openRoom(data);
    } else {
      await api.put(`/chat/rooms/${activeRoom.id}`, { name: name.trim() });
      for (const userId of selected) await api.post(`/chat/rooms/${activeRoom.id}/members`, { userId });
      const { data } = await api.get('/chat/rooms');
      setRooms(data);
      setActiveRoom(data.find((r) => r.id === activeRoom.id) || null);
      setGroupModal(null);
    }
  }

  function toggleSelected(id) {
    setGroupModal((g) => ({ ...g, selected: g.selected.includes(id) ? g.selected.filter((x) => x !== id) : [...g.selected, id] }));
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activeRoom) return;
    getSocket().emit('chat:message', { roomId: activeRoom.id, content: text });
    setText('');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-140px)]">
      <div className="rounded-2xl shadow-luxury border flex flex-col overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-semibold text-[var(--color-primary)]">Conversas</span>
          {can('CREATE_GROUP_CHAT') && (
            <button onClick={openCreateGroup} title="Criar grupo" className="text-[var(--color-text-muted)] hover:text-gold-500"><Users size={16} /></button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((r) => (
            <button key={r.id} onClick={() => openRoom(r)}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b hover:bg-[var(--color-border)] ${activeRoom?.id === r.id ? 'bg-[var(--color-border)]' : ''}`}
                    style={{ borderColor: 'var(--color-border)' }}>
              <p className="font-medium">{r.isGroup ? '👥 ' : ''}{r.name}</p>
              {r.messages[0] && <p className="text-xs text-[var(--color-text-muted)] truncate">{r.messages[0].content}</p>}
            </button>
          ))}
          {rooms.length === 0 && <p className="text-xs text-[var(--color-text-muted)] p-3">Nenhuma conversa ainda.</p>}
        </div>
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1"><UserPlus size={13} /> Iniciar conversa</p>
          <div className="flex flex-wrap gap-1">
            {teamMembers.filter((m) => m.id !== user.id).map((m) => (
              <button key={m.id} onClick={() => startDirect(m.id)}
                      className="text-[11px] px-2 py-1 rounded-full border hover:border-gold-400" style={{ borderColor: 'var(--color-border)' }}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl shadow-luxury border flex flex-col overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {activeRoom ? (
          <>
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-semibold text-sm text-[var(--color-primary)]">{activeRoom.name}</p>
                {activeRoom.isGroup && <p className="text-[11px] text-[var(--color-text-muted)]">{activeRoom.members.length} participantes</p>}
              </div>
              {activeRoom.isGroup && can('CREATE_GROUP_CHAT') && (
                <button onClick={openEditGroup} title="Editar grupo" className="text-[var(--color-text-muted)] hover:text-gold-500"><Pencil size={16} /></button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[75%] ${m.senderId === user.id ? 'ml-auto text-right' : ''}`}>
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">{m.sender?.name}</p>
                  <span className={`inline-block px-3 py-2 rounded-2xl text-sm ${m.senderId === user.id ? 'bg-navy-900 text-gold-200' : ''}`}
                        style={m.senderId !== user.id ? { background: 'var(--color-border)' } : {}}>
                    {m.content}
                  </span>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={sendMessage} className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua mensagem..."
                     className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--color-border)' }} />
              <button type="submit" className="bg-navy-900 text-gold-300 rounded-lg p-2.5 shadow-gold"><Send size={16} /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
            Selecione ou inicie uma conversa
          </div>
        )}
      </div>

      {groupModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setGroupModal(null)}>
          <form onSubmit={submitGroup} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-luxury border p-6 space-y-4"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-[var(--color-primary)]">{groupModal.mode === 'create' ? 'Novo grupo' : 'Editar grupo'}</h2>
              <button type="button" onClick={() => setGroupModal(null)}><X size={20} /></button>
            </div>
            <input required value={groupModal.name} onChange={(e) => setGroupModal({ ...groupModal, name: e.target.value })}
                   placeholder="Nome do grupo" className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">
                {groupModal.mode === 'create' ? 'Participantes' : 'Adicionar participantes'}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {teamMembers
                  .filter((m) => m.id !== user.id)
                  .filter((m) => groupModal.mode === 'create' || !activeRoom.members.some((rm) => rm.userId === m.id))
                  .map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                      <input type="checkbox" checked={groupModal.selected.includes(m.id)} onChange={() => toggleSelected(m.id)} />
                      {m.name}
                    </label>
                  ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-navy-900 text-gold-300 rounded-lg py-2 text-sm font-semibold shadow-gold">
              {groupModal.mode === 'create' ? 'Criar grupo' : 'Salvar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
