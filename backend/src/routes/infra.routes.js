const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

/**
 * Valida a URL informada. Em produção bloqueia endereços internos/privados
 * (mitigação básica de SSRF, já que o botão "Testar" faz requisições a partir
 * do servidor). Obs.: não cobre DNS rebinding — para isso use um proxy de egress.
 */
function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return 'URL inválida.'; }
  if (!['http:', 'https:'].includes(u.protocol)) return 'Use apenas http:// ou https://.';
  if (process.env.NODE_ENV === 'production') {
    const h = u.hostname.toLowerCase();
    const privado = h === 'localhost' || h.endsWith('.local') || h === '::1' || h === '[::1]'
      || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || /^0\./.test(h);
    if (privado) return 'Endereços internos/privados não são permitidos em produção.';
  }
  return null;
}
router.use(auth);
router.use(requirePermission('MANAGE_INFRA'));

router.param('id', async (req, res, next, id) => {
  const found = await prisma.infraConfig.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!found) return res.status(404).json({ error: 'Configuração não encontrada.' });
  next();
});

router.get('/', async (req, res) => {
  const configs = await prisma.infraConfig.findMany({ where: { tenantId: req.tenantId } });
  res.json(configs);
});

router.post('/', async (req, res) => {
  const { name, type, url } = req.body;
  const urlError = validateUrl(url);
  if (urlError) return res.status(400).json({ error: urlError });
  if (!['API', 'DATABASE', 'CLOUD_STORAGE', 'OTHER'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido.' });
  }
  const config = await prisma.infraConfig.create({
    data: { tenantId: req.tenantId, name, type, url },
  });
  res.status(201).json(config);
});

router.put('/:id', async (req, res) => {
  const { name, url } = req.body;
  const urlError = validateUrl(url);
  if (urlError) return res.status(400).json({ error: urlError });
  const config = await prisma.infraConfig.update({
    where: { id: req.params.id },
    data: { name, url },
  });
  res.json(config);
});

router.delete('/:id', async (req, res) => {
  await prisma.infraConfig.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Testa a conectividade de uma URL configurada (ping simples)
router.post('/:id/test', async (req, res) => {
  const config = await prisma.infraConfig.findUnique({ where: { id: req.params.id } });
  if (!config) return res.status(404).json({ error: 'Configuração não encontrada.' });
  const urlError = validateUrl(config.url);
  if (urlError) return res.status(400).json({ error: urlError });

  let status = 'OFFLINE';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(config.url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    status = resp.ok || resp.status < 500 ? 'ONLINE' : 'OFFLINE';
  } catch (err) {
    status = 'OFFLINE';
  }

  const updated = await prisma.infraConfig.update({
    where: { id: req.params.id },
    data: { status, lastTestedAt: new Date() },
  });
  res.json(updated);
});

module.exports = router;
