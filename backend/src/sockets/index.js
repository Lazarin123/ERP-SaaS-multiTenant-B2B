const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { userHasPermission } = require('../utils/permissions');

function registerSockets(io) {
  // Autentica a conexão do socket usando o mesmo JWT do REST
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token não informado.'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.active) return next(new Error('Usuário inválido.'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Falha na autenticação do socket.'));
    }
  });

  io.on('connection', (socket) => {
    const tenantRoom = `tenant:${socket.user.tenantId}`;
    socket.join(tenantRoom);

    // Membro da sala (no próprio tenant)? Sem isso, ninguém entra nem escreve.
    const isMember = (roomId) =>
      prisma.chatRoom.findFirst({
        where: { id: roomId, tenantId: socket.user.tenantId, members: { some: { userId: socket.user.id } } },
        select: { id: true },
      });

    // ----- CHAT -----
    socket.on('chat:join', async (roomId) => {
      if (await isMember(roomId)) socket.join(`chat:${roomId}`);
    });
    socket.on('chat:leave', (roomId) => socket.leave(`chat:${roomId}`));

    socket.on('chat:message', async ({ roomId, content }) => {
      if (!content?.trim() || content.length > 4000) return;
      if (!(await userHasPermission(prisma, socket.user, 'USE_CHAT'))) return;
      if (!(await isMember(roomId))) return;
      const message = await prisma.chatMessage.create({
        data: { roomId, senderId: socket.user.id, content: content.trim() },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      });
      io.to(`chat:${roomId}`).emit('chat:message', message);
    });

    socket.on('chat:typing', ({ roomId, isTyping }) => {
      if (!socket.rooms.has(`chat:${roomId}`)) return;
      socket.to(`chat:${roomId}`).emit('chat:typing', {
        userId: socket.user.id, name: socket.user.name, isTyping,
      });
    });

    // ----- KANBAN (broadcast de movimentação de cards em tempo real) -----
    socket.on('kanban:join', async (boardId) => {
      const board = await prisma.kanbanBoard.findFirst({
        where: { id: boardId, tenantId: socket.user.tenantId }, select: { id: true },
      });
      if (board) socket.join(`kanban:${boardId}`);
    });
    socket.on('kanban:card-moved', (payload) => {
      if (!socket.rooms.has(`kanban:${payload?.boardId}`)) return;
      socket.to(`kanban:${payload.boardId}`).emit('kanban:card-moved', payload);
    });

    socket.on('disconnect', () => {
      // espaço reservado para presença/online status futuramente
    });
  });
}

module.exports = registerSockets;
