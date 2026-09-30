// Testa a reordenação de cards do Kanban (mesma coluna e entre colunas) com Prisma simulado.
process.env.JWT_SECRET = 'teste'; process.env.PORT = '4556'; process.env.NODE_ENV = 'test';
const Module = require('module'); const path = require('path'); const root = path.join(__dirname, '..') + '/';
const jwt = require(root + 'node_modules/jsonwebtoken'); const assert = require('assert');

const tenant = { id: 't1', active: true, plan: { name: 'TOP' } };
const user = { id: 'u', tenantId: 't1', role: 'COLLABORATOR', active: true, tenant };
let cards = [
  { id: 'a', columnId: 'c1', order: 0 }, { id: 'b', columnId: 'c1', order: 1 }, { id: 'c', columnId: 'c1', order: 2 },
  { id: 'd', columnId: 'c2', order: 0 }, { id: 'x', columnId: 'c2', order: 1 },
];
const cols = { c1: 't1', c2: 't1', cOutro: 't2' };
const sortBy = (arr) => [...arr].sort((p, q) => p.order - q.order);
class FakePrisma {
  constructor() {
    this.user = { findUnique: async () => user };
    this.userPermissionOverride = { findUnique: async () => null };
    this.rolePermissionOverride = { findUnique: async () => null };
    this.kanbanColumn = { findFirst: async ({ where }) => (cols[where.id] === where.board.tenantId ? { id: where.id } : null) };
    this.kanbanCard = {
      findFirst: async ({ where }) => cards.find((c) => c.id === where.id) || null,
      findUnique: async ({ where }) => ({ ...cards.find((c) => c.id === where.id) }),
      findMany: async ({ where }) => sortBy(cards.filter((c) => c.columnId === where.columnId && (!where.NOT || c.id !== where.NOT.id))).map((c) => ({ id: c.id })),
      update: async ({ where, data }) => { Object.assign(cards.find((c) => c.id === where.id), data); },
    };
    this.$transaction = async (fn) => fn(this);
  }
}
const orig = Module._load;
Module._load = function (req, ...a) { if (req === '@prisma/client') return { PrismaClient: FakePrisma }; return orig.call(this, req, ...a); };
require(root + 'src/server.js');

const move = (id, toColumnId, toOrder) => fetch(`http://localhost:4556/api/kanban/cards/${id}/move`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ userId: 'u' }, 'teste') },
  body: JSON.stringify({ toColumnId, toOrder }),
});
const layout = (col) => sortBy(cards.filter((c) => c.columnId === col)).map((c) => `${c.id}:${c.order}`).join(',');

setTimeout(async () => {
  try {
    await move('a', 'c1', 2);                       // a vai para o fim da própria coluna
    assert.strictEqual(layout('c1'), 'b:0,c:1,a:2');
    await move('c', 'c2', 1);                       // c muda de coluna, entra no meio
    assert.strictEqual(layout('c2'), 'd:0,c:1,x:2');
    assert.strictEqual(layout('c1'), 'b:0,a:1', 'coluna de origem reindexada sem buracos');
    assert.strictEqual((await move('b', 'cOutro', 0)).status, 404, 'não move para coluna de outro tenant');
    console.log('✔ kanban-move.test.js: reordenação OK');
  } catch (e) { console.error('✘ FALHOU:', e.message); process.exitCode = 1; }
  process.exit();
}, 800);
