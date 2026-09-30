const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Formulários enviam números como string; Prisma exige tipos corretos.
const toInt = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const toDec = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : d; };
router.use(auth);

// Isolamento multi-tenant: o :id precisa pertencer ao tenant do usuário logado
// (categoria quando a rota é /categories/:id, produto nos demais casos).
router.param('id', async (req, res, next, id) => {
  const isCategory = req.path.startsWith('/categories/');
  const found = isCategory
    ? await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } })
    : await prisma.product.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!found) return res.status(404).json({ error: 'Registro não encontrado.' });
  next();
});

/* ------------------------------ CATEGORIAS ------------------------------ */

router.get('/categories', requirePermission('VIEW_STOCK'), async (req, res) => {
  const categories = await prisma.category.findMany({ where: { tenantId: req.tenantId } });
  res.json(categories);
});

router.post('/categories', requirePermission('MANAGE_STOCK'), async (req, res) => {
  const category = await prisma.category.create({
    data: { tenantId: req.tenantId, name: req.body.name },
  });
  res.status(201).json(category);
});

router.delete('/categories/:id', requirePermission('DELETE_RECORDS'), async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/* ------------------------------- PRODUTOS ------------------------------- */

router.get('/', requirePermission('VIEW_STOCK'), async (req, res) => {
  const { search, categoryId, lowStock } = req.query;
  const products = await prisma.product.findMany({
    where: {
      tenantId: req.tenantId,
      active: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const filtered = lowStock === 'true'
    ? products.filter((p) => p.stockQty <= p.minStock)
    : products;

  res.json(filtered);
});

router.post('/', requirePermission('MANAGE_STOCK'), async (req, res) => {
  const { name, sku, segment, categoryId, price, costPrice, stockQty, minStock } = req.body;
  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId: req.tenantId } });
    if (!cat) return res.status(400).json({ error: 'Categoria inválida.' });
  }
  const product = await prisma.product.create({
    data: {
      tenantId: req.tenantId, name, sku, segment, categoryId: categoryId || null,
      price: toDec(price), costPrice: toDec(costPrice),
      stockQty: Math.max(0, toInt(stockQty)), minStock: Math.max(0, toInt(minStock)),
    },
  });
  res.status(201).json(product);
});

router.put('/:id', requirePermission('MANAGE_STOCK'), async (req, res) => {
  const { name, sku, segment, categoryId, price, costPrice, minStock } = req.body;
  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId: req.tenantId } });
    if (!cat) return res.status(400).json({ error: 'Categoria inválida.' });
  }
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name, sku, segment, categoryId: categoryId || null,
      price: toDec(price), costPrice: toDec(costPrice), minStock: Math.max(0, toInt(minStock)),
    },
  });
  res.json(product);
});

router.delete('/:id', requirePermission('DELETE_RECORDS'), async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});

/* --------------------------- MOVIMENTAÇÃO DE ESTOQUE --------------------------- */

// Registra entrada, saída ou ajuste, e atualiza o saldo do produto (transação atômica)
router.post('/:id/movements', requirePermission('MANAGE_STOCK'), async (req, res) => {
  const { type, reason } = req.body; // type: IN | OUT | ADJUST
  const qty = toInt(req.body.qty, -1);
  const productId = req.params.id;
  if (!['IN', 'OUT', 'ADJUST'].includes(type) || qty < 0 || (type !== 'ADJUST' && qty === 0)) {
    return res.status(400).json({ error: 'Tipo ou quantidade inválidos.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('NOT_FOUND');

      let newQty = product.stockQty;
      if (type === 'IN') newQty += Number(qty);
      else if (type === 'OUT') newQty -= Number(qty);
      else if (type === 'ADJUST') newQty = Number(qty);

      if (newQty < 0) throw new Error('NEGATIVE_STOCK');

      await tx.product.update({ where: { id: productId }, data: { stockQty: newQty } });

      return tx.stockMovement.create({
        data: {
          tenantId: req.tenantId, productId, type, qty: Number(qty),
          reason, userId: req.user.id,
        },
      });
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'NEGATIVE_STOCK') {
      return res.status(400).json({ error: 'Estoque insuficiente para esta saída.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar movimentação.' });
  }
});

router.get('/:id/movements', requirePermission('VIEW_STOCK'), async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { productId: req.params.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(movements);
});

module.exports = router;
