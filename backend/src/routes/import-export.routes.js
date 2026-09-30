const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();
router.use(auth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MAX_ROWS = 5000;

/**
 * Proteção contra "CSV injection": células que começam com = + - @ (ou tab/CR) são
 * interpretadas como fórmula pelo Excel/Sheets. Prefixamos com apóstrofo.
 */
const safeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const sanitizeRow = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCell(v)]));

// Remove o apóstrofo de proteção se o arquivo exportado for reimportado
const unsafeCell = (v) => (typeof v === 'string' && /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);

const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : 0; };
const toDec = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };

function readRecords(file) {
  const isJson = /\.json$/i.test(file.originalname) || file.mimetype === 'application/json';
  if (isJson) {
    const data = JSON.parse(file.buffer.toString('utf8'));
    if (!Array.isArray(data)) throw new Error('O JSON deve ser uma lista (array) de produtos.');
    return data;
  }
  return parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
}

/**
 * POST /api/import-export/products/import   (arquivo .csv ou .json)
 * Colunas/campos: name (obrigatório), sku, segment, categoria, price, costPrice, stockQty, minStock
 */
router.post('/products/import', requirePermission('IMPORT_EXPORT_DATA'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo .csv ou .json.' });

  let records;
  try {
    records = readRecords(req.file);
  } catch (err) {
    return res.status(400).json({ error: `Não foi possível ler o arquivo: ${err.message}` });
  }
  if (records.length > MAX_ROWS) {
    return res.status(400).json({ error: `Limite de ${MAX_ROWS} linhas por importação.` });
  }

  // Categorias: reaproveita as existentes (por nome) e cria as novas
  const existing = await prisma.category.findMany({ where: { tenantId: req.tenantId } });
  const catByName = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));

  const data = [];
  const errors = [];

  for (const [index, raw] of records.entries()) {
    const row = Object.fromEntries(Object.entries(raw || {}).map(([k, v]) => [k, unsafeCell(v)]));
    const name = String(row.name ?? '').trim();
    if (!name) { errors.push({ linha: index + 2, erro: 'Campo "name" é obrigatório.' }); continue; }

    let categoryId = null;
    const catName = String(row.categoria ?? row.category ?? '').trim();
    if (catName) {
      if (!catByName.has(catName.toLowerCase())) {
        const created = await prisma.category.create({ data: { tenantId: req.tenantId, name: catName } });
        catByName.set(catName.toLowerCase(), created.id);
      }
      categoryId = catByName.get(catName.toLowerCase());
    }

    data.push({
      tenantId: req.tenantId, name, categoryId,
      sku: row.sku ? String(row.sku) : null,
      segment: row.segment ? String(row.segment) : null,
      price: toDec(row.price), costPrice: toDec(row.costPrice),
      stockQty: toInt(row.stockQty), minStock: toInt(row.minStock),
    });
  }

  if (data.length) await prisma.product.createMany({ data });
  res.json({ created: data.length, totalLinhas: records.length, errors });
});

/**
 * GET /api/import-export/products/export?format=csv|json
 */
router.get('/products/export', requirePermission('IMPORT_EXPORT_DATA'), async (req, res) => {
  const products = await prisma.product.findMany({
    where: { tenantId: req.tenantId, active: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const rows = products.map((p) => ({
    name: p.name, sku: p.sku || '', segment: p.segment || '', categoria: p.category?.name || '',
    price: p.price.toString(), costPrice: p.costPrice.toString(), stockQty: p.stockQty, minStock: p.minStock,
  }));

  if (req.query.format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="produtos.json"');
    return res.send(JSON.stringify(rows, null, 2));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="produtos.csv"');
  // BOM para o Excel abrir acentos corretamente
  res.send('\uFEFF' + stringify(rows.map(sanitizeRow), { header: true }));
});

/**
 * GET /api/import-export/stock-movements/export?format=csv|json
 */
router.get('/stock-movements/export', requirePermission('IMPORT_EXPORT_DATA'), async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { tenantId: req.tenantId },
    include: { product: true, user: true },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  });

  const rows = movements.map((m) => ({
    data: m.createdAt.toISOString(), produto: m.product.name, tipo: m.type,
    quantidade: m.qty, motivo: m.reason || '', usuario: m.user?.name || '',
  }));

  if (req.query.format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes.json"');
    return res.send(JSON.stringify(rows, null, 2));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes.csv"');
  res.send('\uFEFF' + stringify(rows.map(sanitizeRow), { header: true }));
});

module.exports = router;
