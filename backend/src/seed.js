require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./config/db');

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ---------------- PLANOS ----------------
  const topPlan = await prisma.plan.upsert({
    where: { name: 'TOP' },
    update: {},
    create: {
      name: 'TOP',
      label: 'Plano Top',
      active: true,
      features: {
        estoque: true, kanban: true, chat: true, ia_suporte: true,
        ia_marketing: true, infra: true, relatorios: true, temas: true,
      },
    },
  });
  console.log('✔ Plano TOP criado/confirmado.');

  // ---------------- TENANT DEMO ----------------
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-luxury-tech' },
    update: {},
    create: {
      name: 'Empresa Demonstração',
      slug: 'demo-luxury-tech',
      segment: 'varejo',
      planId: topPlan.id,
    },
  });
  console.log('✔ Tenant de demonstração criado/confirmado.');

  // ---------------- SUPER ADMIN (Perfil Mestre) ----------------
  const superAdminPass = await bcrypt.hash('SuperAdmin@123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@luxurytech.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Super Admin',
      email: 'superadmin@luxurytech.com',
      passwordHash: superAdminPass,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✔ Super Admin criado -> superadmin@luxurytech.com / SuperAdmin@123');

  // ---------------- ADMIN DEMO ----------------
  const adminPass = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrador Demo',
      email: 'admin@demo.com',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });
  console.log('✔ Admin demo criado -> admin@demo.com / Admin@123');

  // ---------------- COLABORADOR DEMO ----------------
  const collabPass = await bcrypt.hash('Colab@123', 10);
  await prisma.user.upsert({
    where: { email: 'colaborador@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Colaborador Demo',
      email: 'colaborador@demo.com',
      passwordHash: collabPass,
      role: 'COLLABORATOR',
    },
  });
  console.log('✔ Colaborador demo criado -> colaborador@demo.com / Colab@123');

  // ---------------- KANBAN DEMO ----------------
  const existingBoard = await prisma.kanbanBoard.findFirst({ where: { tenantId: tenant.id } });
  if (!existingBoard) {
    await prisma.kanbanBoard.create({
      data: {
        tenantId: tenant.id,
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
    });
    console.log('✔ Quadro Kanban de demonstração criado.');
  }

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
