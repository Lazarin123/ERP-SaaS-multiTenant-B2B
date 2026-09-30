const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();
router.use(auth);

// Helpers de isolamento multi-tenant
const boardOk = (boardId, tenantId) => prisma.kanbanBoard.findFirst({ where: { id: boardId, tenantId } });
const assigneeOk = async (assigneeId, tenantId) =>
  !assigneeId || !!(await prisma.user.findFirst({ where: { id: assigneeId, tenantId, active: true }, select: { id: true } }));
const columnOk = (columnId, tenantId) => prisma.kanbanColumn.findFirst({ where: { id: columnId, board: { tenantId } } });

router.param('id', async (req, res, next, id) => {
  const card = await prisma.kanbanCard.findFirst({ where: { id, column: { board: { tenantId: req.tenantId } } } });
  if (!card) return res.status(404).json({ error: 'Card não encontrado.' });
  next();
});

// Retorna o(s) board(s) do tenant com colunas e cards ordenados
router.get('/boards', requirePermission('VIEW_KANBAN'), async (req, res) => {
  const boards = await prisma.kanbanBoard.findMany({
    where: { tenantId: req.tenantId },
    include: {
      columns: {
        orderBy: { order: 'asc' },
        include: {
          cards: {
            orderBy: { order: 'asc' },
            include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      },
    },
  });
  res.json(boards);
});

router.post('/boards', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  const board = await prisma.kanbanBoard.create({
    data: {
      tenantId: req.tenantId,
      name: req.body.name,
      columns: { create: [{ name: 'A Fazer', order: 0 }, { name: 'Concluído', order: 1 }] },
    },
    include: { columns: true },
  });
  res.status(201).json(board);
});

router.post('/columns', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  const { boardId, name } = req.body;
  if (!(await boardOk(boardId, req.tenantId))) return res.status(404).json({ error: 'Quadro não encontrado.' });
  const count = await prisma.kanbanColumn.count({ where: { boardId } });
  const column = await prisma.kanbanColumn.create({ data: { boardId, name, order: count } });
  res.status(201).json(column);
});

router.post('/cards', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  const { columnId, title, description, priority, assigneeId, dueDate } = req.body;
  if (!(await columnOk(columnId, req.tenantId))) return res.status(404).json({ error: 'Coluna não encontrada.' });
  if (!(await assigneeOk(assigneeId, req.tenantId))) return res.status(400).json({ error: 'Responsável inválido.' });
  const count = await prisma.kanbanCard.count({ where: { columnId } });
  const card = await prisma.kanbanCard.create({
    data: {
      columnId, title, description, priority: priority || 'normal',
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      order: count,
    },
  });
  res.status(201).json(card);
});

router.put('/cards/:id', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  const { title, description, priority, assigneeId, dueDate } = req.body;
  if (!(await assigneeOk(assigneeId, req.tenantId))) return res.status(400).json({ error: 'Responsável inválido.' });
  const card = await prisma.kanbanCard.update({
    where: { id: req.params.id },
    data: { title, description, priority, assigneeId: assigneeId || null, dueDate: dueDate ? new Date(dueDate) : null },
  });
  res.json(card);
});

// Move um card entre colunas / reordena (drag and drop).
// Reindexa as colunas de origem e destino em transação para manter a ordem consistente.
router.patch('/cards/:id/move', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  const { toColumnId } = req.body;
  const toOrder = Math.max(0, parseInt(req.body.toOrder, 10) || 0);
  if (!(await columnOk(toColumnId, req.tenantId))) return res.status(404).json({ error: 'Coluna não encontrada.' });

  await prisma.$transaction(async (tx) => {
    const card = await tx.kanbanCard.findUnique({ where: { id: req.params.id } });
    const fromColumnId = card.columnId;

    const dest = await tx.kanbanCard.findMany({
      where: { columnId: toColumnId, NOT: { id: card.id } },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    dest.splice(Math.min(toOrder, dest.length), 0, { id: card.id });
    for (const [idx, c] of dest.entries()) {
      await tx.kanbanCard.update({ where: { id: c.id }, data: { order: idx, columnId: toColumnId } });
    }

    if (fromColumnId !== toColumnId) {
      const src = await tx.kanbanCard.findMany({ where: { columnId: fromColumnId }, orderBy: { order: 'asc' }, select: { id: true } });
      for (const [idx, c] of src.entries()) await tx.kanbanCard.update({ where: { id: c.id }, data: { order: idx } });
    }
  });
  res.json({ ok: true });
});

router.delete('/cards/:id', requirePermission('MANAGE_KANBAN'), async (req, res) => {
  await prisma.kanbanCard.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
