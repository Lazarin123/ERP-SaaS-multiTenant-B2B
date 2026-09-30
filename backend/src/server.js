require('dotenv').config();
require('express-async-errors'); // encaminha erros de handlers async ao middleware de erro (evita derrubar o processo)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const registerSockets = require('./sockets');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const kanbanRoutes = require('./routes/kanban.routes');
const chatRoutes = require('./routes/chat.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const importExportRoutes = require('./routes/import-export.routes');
const aiRoutes = require('./routes/ai.routes');
const infraRoutes = require('./routes/infra.routes');
const plansRoutes = require('./routes/plans.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
});

app.set('trust proxy', 1); // atrás de proxy (Render, Railway, Fly...) para o rate limit ver o IP real
// crossOriginResourcePolicy liberado: o front (outro domínio) precisa carregar as fotos de /uploads
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'erp-saas-backend' }));

// Limites de requisição: protegem login (força bruta) e IA (custo)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas solicitações à IA. Aguarde um minuto.' } });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/infra', infraRoutes);
app.use('/api/plans', plansRoutes);

// Handler de erro global: traduz erros comuns do Prisma/multer em respostas amigáveis
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com estes dados.' });
  if (err.code === 'P2003') return res.status(409).json({ error: 'Este registro está vinculado a outros dados e não pode ser removido.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Arquivo maior que o limite permitido.' });
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : err.message });
});

// Rede de segurança: nunca derrubar o servidor por uma promessa rejeitada
process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));

registerSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ ERP SaaS backend rodando em http://localhost:${PORT}`);
});
