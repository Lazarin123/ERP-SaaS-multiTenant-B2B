import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

const PRIORITY_COLORS = { baixa: '#5B6B8C', normal: '#0A1A33', alta: '#C09A2A', urgente: '#B91C1C' };

export default function Kanban() {
  const { can } = useAuth();
  const [board, setBoard] = useState(null);
  const [team, setTeam] = useState([]);
  const [editing, setEditing] = useState(null); // card em edição

  const load = useCallback(async () => {
    const { data } = await api.get('/kanban/boards');
    setBoard(data[0] || null);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/chat/team-members').then((r) => setTeam(r.data)).catch(() => setTeam([])); }, []);

  useEffect(() => {
    if (!board) return;
    const socket = getSocket();
    socket.emit('kanban:join', board.id);
    socket.on('kanban:card-moved', () => load());
    return () => socket.off('kanban:card-moved');
  }, [board?.id, load]);

  async function addCard(columnId) {
    const title = prompt('Título do card:');
    if (!title) return;
    await api.post('/kanban/cards', { columnId, title, priority: 'normal' });
    load();
  }

  async function saveCard(e) {
    e.preventDefault();
    const { id, title, description, priority, assigneeId, dueDate } = editing;
    await api.put(`/kanban/cards/${id}`, { title, description, priority, assigneeId, dueDate: dueDate || null });
    setEditing(null);
    getSocket().emit('kanban:card-moved', { boardId: board.id });
    load();
  }

  async function deleteCard() {
    if (!confirm('Excluir este card?')) return;
    await api.delete(`/kanban/cards/${editing.id}`);
    setEditing(null);
    getSocket().emit('kanban:card-moved', { boardId: board.id });
    load();
  }

  function openEditor(card) {
    if (!can('MANAGE_KANBAN')) return;
    setEditing({
      id: card.id, title: card.title, description: card.description || '', priority: card.priority,
      assigneeId: card.assignee?.id || '', dueDate: card.dueDate ? card.dueDate.slice(0, 10) : '',
    });
  }

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    await api.patch(`/kanban/cards/${draggableId}/move`, {
      toColumnId: destination.droppableId,
      toOrder: destination.index,
    });
    getSocket().emit('kanban:card-moved', { boardId: board.id });
    load();
  }

  if (!board) return <p className="text-[var(--color-text-muted)]">Carregando quadro...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-[var(--color-primary)]">{board.name}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Arraste os cards para atualizar o status</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((col) => (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                     className="w-72 shrink-0 rounded-2xl p-3 shadow-luxury border"
                     style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm text-[var(--color-primary)]">{col.name}</h3>
                    <span className="text-xs text-[var(--color-text-muted)]">{col.cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[40px]">
                    {col.cards.map((card, index) => (
                      <Draggable draggableId={card.id} index={index} key={card.id} isDragDisabled={!can('MANAGE_KANBAN')}>
                        {(provided2) => (
                          <div ref={provided2.innerRef} {...provided2.draggableProps} {...provided2.dragHandleProps}
                               onClick={() => openEditor(card)}
                               className="rounded-xl p-3 border text-sm shadow-sm cursor-pointer"
                               style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', ...provided2.draggableProps.style }}>
                            <p className="font-medium">{card.title}</p>
                            {card.description && <p className="text-xs text-[var(--color-text-muted)] mt-1">{card.description}</p>}
                            {card.dueDate && <p className="text-[11px] text-[var(--color-text-muted)] mt-1">📅 {new Date(card.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full text-white"
                                    style={{ background: PRIORITY_COLORS[card.priority] || '#0A1A33' }}>
                                {card.priority}
                              </span>
                              {card.assignee && <span className="text-[11px] text-[var(--color-text-muted)]">{card.assignee.name}</span>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                  {can('MANAGE_KANBAN') && (
                    <button onClick={() => addCard(col.id)}
                            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-gold-500 py-1.5 rounded-lg border border-dashed"
                            style={{ borderColor: 'var(--color-border)' }}>
                      <Plus size={14} /> Adicionar card
                    </button>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={saveCard} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-luxury border p-6 space-y-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-[var(--color-primary)]">Editar card</h2>
              <button type="button" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                   placeholder="Título" className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
            <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      placeholder="Descrição" className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
            <div className="grid grid-cols-2 gap-3">
              <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
                <option value="baixa">Baixa</option><option value="normal">Normal</option>
                <option value="alta">Alta</option><option value="urgente">Urgente</option>
              </select>
              <input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                     className="border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <select value={editing.assigneeId} onChange={(e) => setEditing({ ...editing, assigneeId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
              <option value="">Sem responsável</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={deleteCard} className="flex items-center gap-1 text-sm text-red-500"><Trash2 size={15} /> Excluir</button>
              <button type="submit" className="bg-navy-900 text-gold-300 rounded-lg px-4 py-2 text-sm font-semibold shadow-gold">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
