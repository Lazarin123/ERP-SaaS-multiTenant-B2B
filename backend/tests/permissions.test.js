// Testa a matriz de permissões (regra de negócio central) com um Prisma simulado.
const assert = require('assert');
const { userHasPermission, getEffectivePermissions, PERMISSIONS } = require('../src/utils/permissions');

let userOv = [], roleOv = [];
const prisma = {
  userPermissionOverride: { findUnique: async ({ where }) => { const w = where.userId_permissionKey; return userOv.find((o) => o.userId === w.userId && o.permissionKey === w.permissionKey) || null; } },
  rolePermissionOverride: { findUnique: async ({ where }) => { const w = where.tenantId_role_permissionKey; return roleOv.find((o) => o.tenantId === w.tenantId && o.role === w.role && o.permissionKey === w.permissionKey) || null; } },
};
const sa = { id: 's', role: 'SUPER_ADMIN', tenantId: 't1' };
const ad = { id: 'a', role: 'ADMIN', tenantId: 't1' };
const co = { id: 'c', role: 'COLLABORATOR', tenantId: 't1' };

(async () => {
  for (const k of Object.keys(PERMISSIONS)) assert.strictEqual(await userHasPermission(prisma, sa, k), true);
  assert.strictEqual(await userHasPermission(prisma, ad, 'VIEW_FINANCIAL_REPORTS'), true);
  assert.strictEqual(await userHasPermission(prisma, ad, 'MANAGE_INFRA'), true);
  for (const k of ['VIEW_FINANCIAL_REPORTS', 'MANAGE_STOCK', 'IMPORT_EXPORT_DATA', 'MANAGE_INFRA', 'MANAGE_SETTINGS', 'DELETE_RECORDS', 'MANAGE_USERS', 'USE_AI_MARKETING'])
    assert.strictEqual(await userHasPermission(prisma, co, k), false, `colaborador não deve ter ${k}`);
  for (const k of ['VIEW_STOCK', 'MANAGE_KANBAN', 'USE_CHAT', 'USE_AI_SUPPORT'])
    assert.strictEqual(await userHasPermission(prisma, co, k), true, `colaborador deve ter ${k}`);

  roleOv.push({ tenantId: 't1', role: 'COLLABORATOR', permissionKey: 'VIEW_FINANCIAL_REPORTS', allowed: true });
  assert.strictEqual(await userHasPermission(prisma, co, 'VIEW_FINANCIAL_REPORTS'), true, 'override de perfil no tenant');
  userOv.push({ userId: 'c', permissionKey: 'VIEW_FINANCIAL_REPORTS', allowed: false });
  assert.strictEqual(await userHasPermission(prisma, co, 'VIEW_FINANCIAL_REPORTS'), false, 'override individual vence o de perfil');
  userOv.push({ userId: 's', permissionKey: 'MANAGE_INFRA', allowed: false });
  assert.strictEqual(await userHasPermission(prisma, sa, 'MANAGE_INFRA'), true, 'Super Admin nunca é bloqueado');
  const eff = await getEffectivePermissions(prisma, co);
  assert.strictEqual(eff.DELETE_RECORDS, false);
  console.log('✔ permissions.test.js: matriz de permissões OK');
})().catch((e) => { console.error('✘ FALHOU:', e.message); process.exit(1); });
