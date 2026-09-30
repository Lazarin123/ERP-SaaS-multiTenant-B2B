const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { userHasPermission } = require('../utils/permissions');

const router = express.Router();
router.use(auth);

/**
 * GET /api/dashboard/summary
 * Retorna os dados prontos para os gráficos do painel principal.
 * Colaboradores veem apenas indicadores operacionais (sem faturamento).
 */
router.get('/summary', requirePermission('VIEW_DASHBOARD_OPERACIONAL'), async (req, res) => {
  const tenantId = req.tenantId;
  const canSeeFinancial = await userHasPermission(prisma, req.user, 'VIEW_FINANCIAL_REPORTS');

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [products, movements, cards] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, active: true } }),
    prisma.stockMovement.findMany({
      where: { tenantId, createdAt: { gte: since30d } },
      include: { product: true },
    }),
    prisma.kanbanCard.findMany({
      where: { column: { board: { tenantId } } },
      include: { column: true },
    }),
  ]);

  // Produtos mais vendidos (saídas de estoque)
  const salesByProduct = {};
  const revenueByDay = {};
  const purchasesByDay = {};
  let totalRevenue = 0;
  let totalPurchases = 0;

  for (const m of movements) {
    // Compras (entrada de estoque a preço de custo) = saída de caixa
    if (m.type === 'IN') {
      const dayIn = m.createdAt.toISOString().slice(0, 10);
      const cost = Number(m.product.costPrice) * m.qty;
      purchasesByDay[dayIn] = (purchasesByDay[dayIn] || 0) + cost;
      totalPurchases += cost;
      continue;
    }
    if (m.type !== 'OUT') continue;
    const key = m.product.name;
    salesByProduct[key] = (salesByProduct[key] || 0) + m.qty;

    const day = m.createdAt.toISOString().slice(0, 10);
    const value = Number(m.product.price) * m.qty;
    revenueByDay[day] = (revenueByDay[day] || 0) + value;
    totalRevenue += value;
  }

  const topProducts = Object.entries(salesByProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const revenueSeries = Object.entries(revenueByDay)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }));

  // Fluxo de caixa diário: vendas (entradas) x compras de estoque (saídas)
  const days = Array.from(new Set([...Object.keys(revenueByDay), ...Object.keys(purchasesByDay)])).sort();
  const cashFlow = days.map((date) => {
    const entradas = Number((revenueByDay[date] || 0).toFixed(2));
    const saidas = Number((purchasesByDay[date] || 0).toFixed(2));
    return { date, entradas, saidas, saldo: Number((entradas - saidas).toFixed(2)) };
  });

  // Status de pedidos (contagem por coluna do Kanban)
  const ordersByStatus = {};
  for (const c of cards) {
    const key = c.column.name;
    ordersByStatus[key] = (ordersByStatus[key] || 0) + 1;
  }

  const lowStockCount = products.filter((p) => p.stockQty <= p.minStock).length;

  const response = {
    totalProdutos: products.length,
    estoqueBaixoCount: lowStockCount,
    topProdutosVendidos: topProducts,
    statusPedidos: Object.entries(ordersByStatus).map(([status, total]) => ({ status, total })),
  };

  if (canSeeFinancial) {
    response.faturamentoTotal30d = Number(totalRevenue.toFixed(2));
    response.faturamentoPorDia = revenueSeries;
    response.comprasTotal30d = Number(totalPurchases.toFixed(2));
    response.fluxoDeCaixa = cashFlow;
  }

  res.json(response);
});

module.exports = router;
