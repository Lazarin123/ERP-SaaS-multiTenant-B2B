const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();
router.use(auth);

// Isolamento: só quem é membro da sala (no próprio tenant) acessa histórico/edição.
router.param('id', async (req, res, next, id) => {
  const room = await prisma.chatRoom.findFirst({
    where: { id, tenantId: req.tenantId, members: { some: { userId: req.user.id } } },
  });
  if (!room) return res.status(404).json({ error: 'Conversa não encontrada.' });
  req.room = room;
  next();
});

// Lista colegas do mesmo tenant, para iniciar um PV ou montar um grupo
// (dados mínimos — não exige permissão de gestão de usuários)
router.get('/team-members', requirePermission('USE_CHAT'), async (req, res) => {
  const members = await prisma.user.findMany({
    where: { tenantId: req.tenantId, active: true },
    select: { id: true, name: true, avatarUrl: true, role: true },
  });
  res.json(members);
});

// Lista as salas (PV e grupos) das quais o usuário participa
router.get('/rooms', requirePermission('USE_CHAT'), async (req, res) => {
  const rooms = await prisma.chatRoom.findMany({
    where: { tenantId: req.tenantId, members: { some: { userId: req.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rooms);
});

// Cria uma conversa privada (PV) com outro usuário do tenant, ou reaproveita a existente
router.post('/rooms/direct', requirePermission('USE_CHAT'), async (req, res) => {
  const { targetUserId } = req.body;
  const targetOk = await prisma.user.findFirst({ where: { id: targetUserId, tenantId: req.tenantId, active: true } });
  if (!targetOk) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const existing = await prisma.chatRoom.findFirst({
    where: {
      tenantId: req.tenantId,
      isGroup: false,
      members: { every: { userId: { in: [req.user.id, targetUserId] } } },
      AND: [
        { members: { some: { userId: req.user.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: { members: true },
  });
  if (existing && existing.members.length === 2) return res.json(existing);

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  const room = await prisma.chatRoom.create({
    data: {
      tenantId: req.tenantId,
      name: `${req.user.name} & ${target?.name || ''}`,
      isGroup: false,
      members: { create: [{ userId: req.user.id }, { userId: targetUserId }] },
    },
    include: { members: true },
  });
  res.status(201).json(room);
});

// Cria uma sala em grupo
router.post('/rooms/group', requirePermission('CREATE_GROUP_CHAT'), async (req, res) => {
  const { name, memberIds } = req.body;
  const validUsers = await prisma.user.findMany({
    where: { id: { in: memberIds || [] }, tenantId: req.tenantId, active: true },
    select: { id: true },
  });
  const ids = Array.from(new Set([...validUsers.map((u) => u.id), req.user.id]));
  const room = await prisma.chatRoom.create({
    data: {
      tenantId: req.tenantId,
      name,
      isGroup: true,
      members: { create: ids.map((userId) => ({ userId })) },
    },
    include: { members: true },
  });
  res.status(201).json(room);
});

// Editar nome do grupo / gerenciar membros
router.put('/rooms/:id', requirePermission('CREATE_GROUP_CHAT'), async (req, res) => {
  const { name } = req.body;
  const room = await prisma.chatRoom.update({ where: { id: req.params.id }, data: { name } });
  res.json(room);
});

router.post('/rooms/:id/members', requirePermission('CREATE_GROUP_CHAT'), async (req, res) => {
  const { userId } = req.body;
  if (!req.room.isGroup) return res.status(400).json({ error: 'Só é possível adicionar membros em grupos.' });
  const okUser = await prisma.user.findFirst({ where: { id: userId, tenantId: req.tenantId, active: true } });
  if (!okUser) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const member = await prisma.chatRoomMember.upsert({
    where: { roomId_userId: { roomId: req.params.id, userId } },
    update: {},
    create: { roomId: req.params.id, userId },
  });
  res.status(201).json(member);
});

// Histórico de mensagens de uma sala
router.get('/rooms/:id/messages', requirePermission('USE_CHAT'), async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { roomId: req.params.id },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  res.json(messages);
});

module.exports = router;
