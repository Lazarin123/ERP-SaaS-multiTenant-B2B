const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();
router.use(auth);

// Lista os planos existentes na arquitetura (hoje só o TOP está ativo)
router.get('/', async (req, res) => {
  const plans = await prisma.plan.findMany();
  res.json(plans);
});

// Tema visual do tenant (Luxury Tech: navy/dourado + variações)
router.get('/theme', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  res.json(tenant.themeConfig);
});

router.put('/theme', requirePermission('MANAGE_THEME'), async (req, res) => {
  const tenant = await prisma.tenant.update({
    where: { id: req.tenantId },
    data: { themeConfig: req.body },
  });
  res.json(tenant.themeConfig);
});

module.exports = router;
