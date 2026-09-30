/**
 * MATRIZ DE PERMISSÕES — regra de negócio central do sistema.
 *
 * Cada chave de permissão define quais Perfis (roles) têm acesso por padrão.
 * O SUPER_ADMIN sempre tem acesso irrestrito a tudo (hardcoded abaixo),
 * independente desta tabela.
 *
 * Essa matriz pode ser sobrescrita:
 *  - por tenant + role  -> tabela RolePermissionOverride (ex: liberar um
 *    relatório específico para COLLABORATOR apenas numa loja)
 *  - por usuário         -> tabela UserPermissionOverride (o Super Admin
 *    bloqueia ou libera individualmente, item a item)
 */

const PERMISSIONS = {
  // Financeiro / Relatórios
  VIEW_FINANCIAL_REPORTS: ['ADMIN'],
  EXPORT_REPORTS: ['ADMIN'],

  // Configurações e Infraestrutura
  MANAGE_SETTINGS: ['ADMIN'],
  MANAGE_INFRA: ['ADMIN'],
  MANAGE_THEME: ['ADMIN'],

  // Usuários e permissões
  MANAGE_USERS: ['ADMIN'],
  DELETE_RECORDS: ['ADMIN'],

  // Estoque
  VIEW_STOCK: ['ADMIN', 'COLLABORATOR'],
  MANAGE_STOCK: ['ADMIN'], // Colaborador só VISUALIZA estoque; o Super Admin pode liberar por usuário
  IMPORT_EXPORT_DATA: ['ADMIN'],

  // Kanban
  VIEW_KANBAN: ['ADMIN', 'COLLABORATOR'],
  MANAGE_KANBAN: ['ADMIN', 'COLLABORATOR'],

  // Chat
  USE_CHAT: ['ADMIN', 'COLLABORATOR'],
  CREATE_GROUP_CHAT: ['ADMIN', 'COLLABORATOR'],

  // IA
  USE_AI_SUPPORT: ['ADMIN', 'COLLABORATOR'],
  USE_AI_MARKETING: ['ADMIN'],

  // Dashboard
  VIEW_DASHBOARD_GLOBAL: ['ADMIN'],
  VIEW_DASHBOARD_OPERACIONAL: ['ADMIN', 'COLLABORATOR'],
};

/**
 * Verifica se um usuário tem uma permissão, considerando:
 * 1) SUPER_ADMIN sempre pode
 * 2) override por usuário (mais específico, sempre vence)
 * 3) override por tenant+role
 * 4) matriz padrão acima
 */
async function userHasPermission(prisma, user, permissionKey) {
  if (user.role === 'SUPER_ADMIN') return true;

  const userOverride = await prisma.userPermissionOverride.findUnique({
    where: { userId_permissionKey: { userId: user.id, permissionKey } },
  }).catch(() => null);
  if (userOverride) return userOverride.allowed;

  const roleOverride = await prisma.rolePermissionOverride.findUnique({
    where: {
      tenantId_role_permissionKey: {
        tenantId: user.tenantId,
        role: user.role,
        permissionKey,
      },
    },
  }).catch(() => null);
  if (roleOverride) return roleOverride.allowed;

  const defaultRoles = PERMISSIONS[permissionKey] || [];
  return defaultRoles.includes(user.role);
}

/**
 * Retorna o mapa completo { PERMISSAO: true/false } efetivo para o usuário,
 * já considerando os overrides. Usado pelo front para montar menus/botões.
 */
async function getEffectivePermissions(prisma, user) {
  const entries = await Promise.all(
    Object.keys(PERMISSIONS).map(async (key) => [key, await userHasPermission(prisma, user, key)])
  );
  return Object.fromEntries(entries);
}

module.exports = { PERMISSIONS, userHasPermission, getEffectivePermissions };
