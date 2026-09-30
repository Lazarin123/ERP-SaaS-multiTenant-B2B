const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Token não informado.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: { include: { plan: true } } },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário inválido ou bloqueado.' });
    }
    if (!user.tenant.active) {
      return res.status(403).json({ error: 'Conta (tenant) desativada. Fale com o suporte.' });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = authMiddleware;
