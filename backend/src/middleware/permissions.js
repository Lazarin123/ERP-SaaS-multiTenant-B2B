const prisma = require('../config/db');
const { userHasPermission } = require('../utils/permissions');

/**
 * Uso: router.get('/financeiro', auth, requirePermission('VIEW_FINANCIAL_REPORTS'), handler)
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const allowed = await userHasPermission(prisma, req.user, permissionKey);
      if (!allowed) {
        return res.status(403).json({
          error: 'Acesso negado. Você não tem permissão para esta ação.',
          permission: permissionKey,
        });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao validar permissões.' });
    }
  };
}

/** Restringe a rota apenas ao Perfil Mestre (Super Admin) */
function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Somente o Super Admin pode executar esta ação.' });
  }
  next();
}

/** Bloqueia ações de exclusão para quem não é ADMIN/SUPER_ADMIN */
function requireAdminOrAbove(req, res, next) {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Ação restrita a administradores.' });
  }
  next();
}

module.exports = { requirePermission, requireSuperAdmin, requireAdminOrAbove };
