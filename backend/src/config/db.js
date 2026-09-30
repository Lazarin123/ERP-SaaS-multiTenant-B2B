const { PrismaClient } = require('@prisma/client');

// Uma única instância do Prisma reaproveitada em toda a aplicação
// (boa prática para performance em ambientes serverless/monolito).
const prisma = new PrismaClient();

module.exports = prisma;
