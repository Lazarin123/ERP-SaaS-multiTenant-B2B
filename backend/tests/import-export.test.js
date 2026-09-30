// Testa importação/exportação de produtos (CSV e JSON) e a proteção contra CSV injection.
process.env.JWT_SECRET = 'teste'; process.env.PORT = '4557'; process.env.NODE_ENV = 'test';
const Module = require('module'); const path = require('path'); const root = path.join(__dirname, '..') + '/';
const jwt = require(root + 'node_modules/jsonwebtoken'); const assert = require('assert');

const tenant = { id: 't1', active: true, plan: { name: 'TOP' } };
const users = { adm: { id: 'adm', tenantId: 't1', role: 'ADMIN', active: true, tenant }, col: { id: 'col', tenantId: 't1', role: 'COLLABORATOR', active: true, tenant } };
let products = [], categories = [];
class FakePrisma {
  constructor() {
    this.user = { findUnique: async ({ where }) => users[where.id] || null };
    this.userPermissionOverride = { findUnique: async () => null };
    this.rolePermissionOverride = { findUnique: async () => null };
    this.category = {
      findMany: async () => [...categories],
      create: async ({ data }) => { const c = { id: 'cat' + (categories.length + 1), ...data }; categories.push(c); return c; },
    };
    this.product = {
      createMany: async ({ data }) => { products.push(...data); return { count: data.length }; },
      findMany: async () => products.map((p) => ({ ...p, category: categories.find((c) => c.id === p.categoryId) || null })),
    };
  }
}
const orig = Module._load;
Module._load = function (req, ...a) { if (req === '@prisma/client') return { PrismaClient: FakePrisma }; return orig.call(this, req, ...a); };
require(root + 'src/server.js');

const auth = (id) => ({ Authorization: 'Bearer ' + jwt.sign({ userId: id }, 'teste') });
const upload = async (id, filename, content, type) => {
  const fd = new FormData(); fd.append('file', new Blob([content], { type }), filename);
  const r = await fetch('http://localhost:4557/api/import-export/products/import', { method: 'POST', headers: auth(id), body: fd });
  return { s: r.status, j: await r.json() };
};

setTimeout(async () => {
  try {
    // CSV com BOM, vírgula decimal, categoria nova e uma linha sem nome
    const csv = '\uFEFFname,sku,categoria,price,stockQty,minStock\nPão Francês,P1,Padaria,"0,75",100,20\n,X,Padaria,1,1,1\n"=HYPERLINK(""http://x"")",F1,,2,5,1\n';
    let r = await upload('adm', 'produtos.csv', csv, 'text/csv');
    assert.strictEqual(r.s, 200); assert.strictEqual(r.j.created, 2); assert.strictEqual(r.j.errors.length, 1);
    assert.strictEqual(products[0].price, 0.75, 'vírgula decimal'); assert.strictEqual(products[0].stockQty, 100);
    assert.strictEqual(categories.length, 1, 'categoria criada uma única vez');

    // CSV malformado deve ser recusado com 400 (não derrubar o servidor)
    assert.strictEqual((await upload('adm', 'ruim.csv', 'name,sku\nA,"B\n', 'text/csv')).s, 400);

    // JSON
    r = await upload('adm', 'produtos.json', JSON.stringify([{ name: 'Mouse', price: 50, stockQty: '7', categoria: 'Padaria' }]), 'application/json');
    assert.strictEqual(r.j.created, 1); assert.strictEqual(categories.length, 1, 'categoria reaproveitada por nome');
    assert.strictEqual(products[2].stockQty, 7, 'string numérica coagida');

    // JSON inválido / não-array
    assert.strictEqual((await upload('adm', 'x.json', '{"a":1}', 'application/json')).s, 400);
    // Colaborador não importa
    assert.strictEqual((await upload('col', 'produtos.csv', csv, 'text/csv')).s, 403);

    // Export CSV: fórmula neutralizada + BOM
    const buf = Buffer.from(await (await fetch('http://localhost:4557/api/import-export/products/export', { headers: auth('adm') })).arrayBuffer());
    assert.deepStrictEqual([...buf.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'BOM UTF-8 presente nos bytes');
    const csvOut = buf.toString('utf8');
    assert.ok(csvOut.includes("'=HYPERLINK"), 'fórmula neutralizada com apóstrofo');
    assert.ok(!/(^|,)=HYPERLINK/m.test(csvOut), 'nenhuma célula começa com =');

    // Export JSON
    const j = await (await fetch('http://localhost:4557/api/import-export/products/export?format=json', { headers: auth('adm') })).json();
    assert.strictEqual(j.length, 3);
    console.log('✔ import-export.test.js: importação/exportação OK');
  } catch (e) { console.error('✘ FALHOU:', e.message); process.exitCode = 1; }
  process.exit();
}, 800);
