const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { getEffectivePermissions } = require('../utils/permissions');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

/**
 * POST /api/auth/register-tenant
 * Cria uma nova empresa (tenant) + o primeiro usuário, que nasce ADMIN
 * do seu próprio tenant. O Super Admin (Perfil Mestre) é seedado à parte
 * (ver src/seed.js) e enxerga todos os tenants.
 */
router.post('/register-tenant', async (req, res) => {
  try {
    const { companyName, segment, name, email, password } = req.body;
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

    const topPlan = await prisma.plan.findUnique({ where: { name: 'TOP' } });
    if (!topPlan) return res.status(500).json({ error: 'Plano TOP não encontrado. Rode o seed do banco.' });

    const passwordHash = await bcrypt.hash(password, 10);

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        segment: segment || null,
        slug: slugify(companyName),
        planId: topPlan.id,
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: 'ADMIN',
          },
        },
        kanbanBoards: {
          create: {
            name: 'Fluxo de Pedidos',
            columns: {
              create: [
                { name: 'Novo Pedido', order: 0 },
                { name: 'Em Preparo', order: 1 },
                { name: 'Pronto', order: 2 },
                { name: 'Entregue', order: 3 },
              ],
            },
          },
        },
      },
      include: { users: true, plan: true },
    });

    const user = tenant.users[0];
    const token = signToken(user);
    res.status(201).json({
      token,
      permissions: await getEffectivePermissions(prisma, user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: { include: { plan: true } } },
    });

    if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    if (!user.active) return res.status(403).json({ error: 'Seu acesso foi bloqueado pelo administrador.' });
    if (!user.tenant.active) return res.status(403).json({ error: 'Conta da empresa desativada.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

    const token = signToken(user);
    res.json({
      token,
      permissions: await getEffectivePermissions(prisma, user),
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: user.tenant.id, name: user.tenant.name,
        plan: user.tenant.plan.name, themeConfig: user.tenant.themeConfig,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao efetuar login.' });
  }
});

module.exports = router;
