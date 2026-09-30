const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { requirePermission, requireSuperAdmin, requireAdminOrAbove } = require('../middleware/permissions');
const { PERMISSIONS, getEffectivePermissions } = require('../utils/permissions');

const router = express.Router();
router.use(auth);

// Isolamento multi-tenant: qualquer rota com :id só enxerga usuários do próprio tenant.
// Além disso, somente um SUPER_ADMIN pode alterar outro SUPER_ADMIN.
router.param('id', async (req, res, next, id) => {
  const target = await prisma.user.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (target.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas o Super Admin pode alterar o Perfil Mestre.' });
  }
  req.targetUser = target;
  next();
});

/* ---------------------- PERFIL DO PRÓPRIO USUÁRIO ---------------------- */

router.get('/me', async (req, res) => {
  const { passwordHash, tenant, ...safe } = req.user;
  res.json({ ...safe, permissions: await getEffectivePermissions(prisma, req.user) });
});

router.put('/me', async (req, res) => {
  try {
    const { name, email } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
    });
    const { passwordHash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Este e-mail já está em uso.' });
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

router.put('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!valid) return res.status(400).json({ error: 'Senha atual incorreta.' });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

// Upload de foto de perfil (a pré-visualização acontece no front antes do envio)
router.post('/me/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl },
  });
  res.json({ avatarUrl: updated.avatarUrl });
});

/* ---------------------- GESTÃO DE USUÁRIOS (ADMIN) ---------------------- */

router.get('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.tenantId },
    select: {
      id: true, name: true, email: true, role: true,
      active: true, avatarUrl: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// Cria um novo colaborador/administrador dentro do tenant
router.post('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!['ADMIN', 'COLLABORATOR'].includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido. Use ADMIN ou COLLABORATOR.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { tenantId: req.tenantId, name, email, passwordHash, role },
    });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'E-mail já cadastrado.' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// Bloquear / liberar acesso de um usuário
router.patch('/:id/status', requirePermission('MANAGE_USERS'), async (req, res) => {
  const { active } = req.body;
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode bloquear o seu próprio acesso.' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { active },
  });
  res.json({ id: user.id, active: user.active });
});

// Alterar o perfil (role) de um usuário
router.patch('/:id/role', requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['SUPER_ADMIN', 'ADMIN', 'COLLABORATOR'].includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido.' });
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json({ id: user.id, role: user.role });
});

// Exclusão de cadastro — restrita a Administradores/Super Admin
router.delete('/:id', requirePermission('DELETE_RECORDS'), requireAdminOrAbove, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode excluir o seu próprio usuário.' });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    // Usuário com histórico (mensagens, movimentações) não pode ser apagado: bloqueie o acesso.
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'Este usuário possui histórico no sistema. Bloqueie o acesso em vez de excluir.' });
    }
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

/* ---------------- PERMISSÕES GRANULARES (SOMENTE SUPER ADMIN) ---------------- */

// Lista o catálogo de permissões existentes + overrides já configurados
router.get('/permissions/catalog', requireSuperAdmin, async (req, res) => {
  const overrides = await prisma.userPermissionOverride.findMany({
    where: { user: { tenantId: req.tenantId } },
  });
  res.json({ catalog: PERMISSIONS, overrides });
});

// Super Admin liga/desliga uma permissão específica para um usuário específico
router.put('/:id/permissions/:permissionKey', requireSuperAdmin, async (req, res) => {
  const { id, permissionKey } = req.params;
  const { allowed } = req.body;
  if (!(permissionKey in PERMISSIONS)) {
    return res.status(400).json({ error: 'Permissão desconhecida.' });
  }
  const override = await prisma.userPermissionOverride.upsert({
    where: { userId_permissionKey: { userId: id, permissionKey } },
    update: { allowed },
    create: { userId: id, permissionKey, allowed },
  });
  res.json(override);
});

// Remove o override individual (volta a valer o padrão da matriz do perfil)
router.delete('/:id/permissions/:permissionKey', requireSuperAdmin, async (req, res) => {
  const { id, permissionKey } = req.params;
  await prisma.userPermissionOverride.deleteMany({ where: { userId: id, permissionKey } });
  res.json({ ok: true });
});

module.exports = router;
