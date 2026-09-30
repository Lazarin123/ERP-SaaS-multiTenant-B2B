# Luxury Tech ERP — SaaS Multi-tenant

ERP web em português do Brasil para varejo, mercadinhos, restaurantes, padarias e lojas de tecnologia.
Estética "Luxury Tech" (Navy Blue + Dourado), multi-tenant, Plano TOP único ativo.

**Stack:** Node.js + Express · Prisma ORM · PostgreSQL (Supabase, plano gratuito) · Socket.io ·
React + Vite + Tailwind · Recharts · IA via API da Anthropic (Claude).

```
erp-saas/
├── backend/
│   ├── prisma/schema.prisma      # modelo de dados multi-tenant
│   ├── prisma/enable-rls.sql     # endurecimento do Supabase (rode 1x)
│   ├── src/
│   │   ├── server.js             # Express + Socket.io + segurança
│   │   ├── seed.js               # plano TOP, Super Admin, tenant demo
│   │   ├── middleware/           # auth (JWT), permissões, upload
│   │   ├── routes/               # auth, users, products, kanban, chat, dashboard,
│   │   │                         # import-export, ai, infra, plans
│   │   ├── sockets/              # chat e kanban em tempo real
│   │   └── utils/permissions.js  # MATRIZ DE PERMISSÕES (regra central)
│   └── tests/                    # npm test
└── frontend/
    └── src/ (pages, components, context, services, theme)
```

---

## 1. Pré-requisitos

- **Node.js 18 ou superior** (`node -v`)
- Uma conta gratuita no **Supabase** (ou Docker, para um PostgreSQL local)
- _(Opcional)_ Chave da API da Anthropic para ligar as IAs — sem ela o sistema funciona normalmente,
  só as telas de IA mostram um aviso de configuração

---

## 2. Banco de dados gratuito

### Opção A — Supabase (recomendado; PostgreSQL gerenciado, gratuito)

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
2. Escolha nome, **região próxima (ex.: South America / São Paulo)** e defina uma **senha do banco**.
   Guarde essa senha — o Supabase não a mostra de novo.
3. Aguarde o projeto ser criado (1–2 min).
4. Obtenha as duas strings de conexão: no painel do projeto, clique em **Connect** (ou
   _Project Settings → Database → Connection string_) e copie:
   - **`DATABASE_URL`** → a string do **Transaction pooler** (porta **6543**). Acrescente ao final `?pgbouncer=true`.
   - **`DIRECT_URL`** → a string de conexão **direta** (porta **5432**), usada pelas migrações.
     > Se a sua rede for só IPv4 e a conexão direta falhar, use a string do **Session pooler**
     > (porta 5432, no host `...pooler.supabase.com`) como `DIRECT_URL`.
   - Troque `[YOUR-PASSWORD]` pela senha do passo 2. Se a senha tiver caracteres especiais
     (`@`, `#`, `/`…), codifique-os (ex.: `@` → `%40`).

   _(Os nomes exatos de menus do Supabase mudam com o tempo; o que importa é obter essas duas strings.)_

### Opção B — PostgreSQL local com Docker

```bash
docker run --name erp-pg -e POSTGRES_PASSWORD=erp123 -e POSTGRES_DB=erp -p 5432:5432 -d postgres:16
```

No `.env` do backend use as duas variáveis iguais:
`postgresql://postgres:erp123@localhost:5432/erp`

---

## 3. Rodando o backend

```bash
cd backend
cp .env.example .env         # edite: DATABASE_URL, DIRECT_URL, JWT_SECRET, (ANTHROPIC_API_KEY)
npm install
npx prisma generate          # gera o cliente do Prisma
npx prisma migrate dev --name init   # cria as tabelas no banco
npm run seed                 # cria plano TOP, Super Admin e dados de demonstração
npm run dev                  # http://localhost:4000  (teste: /api/health)
```

- Gere um `JWT_SECRET` forte: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Alternativa rápida sem histórico de migrações: `npx prisma db push` no lugar do `migrate dev`.
- **Somente Supabase:** depois de criar as tabelas, abra **SQL Editor**, cole o conteúdo de
  `backend/prisma/enable-rls.sql` e execute. Isso impede que as tabelas fiquem acessíveis pela
  API REST pública do Supabase (o backend continua funcionando normalmente).

### Testes

```bash
npm test
```

Cobre a matriz de permissões, a fiação HTTP (401/403/404, isolamento entre tenants, resiliência a erros),
a reordenação do Kanban e a importação/exportação (CSV/JSON, CSV injection), usando um Prisma simulado
(não exige banco).

---

## 4. Rodando o frontend

```bash
cd frontend
cp .env.example .env         # VITE_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:5173
```

---

## 5. Instalar como app (PWA)

O frontend já vem pronto para isso: depois de publicado (seção 6) com HTTPS, qualquer pessoa pode abrir o site
no Chrome/Edge (computador ou Android) e clicar em **Instalar app** (ícone na barra de endereço ou menu ⋮).
No iPhone/iPad, pelo Safari: **Compartilhar → Adicionar à Tela de Início**. O app ganha ícone próprio e abre sem
a barra do navegador — mas continua sendo o mesmo site, com os mesmos dados; não precisa gerar nada separado.
Arquivos envolvidos: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/`.

## 6. Deploy

**Banco:** Supabase (seção 2).

**Backend** (Render, Railway, Fly.io ou qualquer host Node com suporte a WebSocket):

- Build: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start: `npm start`
- Variáveis: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL` (URL exata do front, para o CORS),
  `NODE_ENV=production`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- Rode `npm run seed` uma vez (pelo shell do host) para criar o plano TOP. **Depois altere/remova as contas demo.**

**Frontend** (Vercel, Netlify ou Cloudflare Pages):

- Build: `npm run build` · Saída: `dist`
- Variável: `VITE_API_URL` = URL pública do backend
- O fallback de SPA já está incluído (`vercel.json` e `public/_redirects`).

⚠️ **Fotos de perfil:** são gravadas em disco local (`backend/uploads`). Em hosts com disco efêmero
(planos gratuitos do Render/Railway) elas somem a cada deploy. Para produção, use um disco persistente ou
troque o `multer.diskStorage` de `src/middleware/upload.js` por Supabase Storage / S3.

---

## 7. Status honesto do que está pronto

**Implementado e coberto por testes automatizados:** matriz de permissões (+ overrides por perfil/tenant e por
usuário), autenticação e bloqueio de usuários, isolamento entre tenants nas rotas, resiliência a erros,
reordenação do Kanban, importação/exportação. O código do backend contra um PostgreSQL real e o frontend no navegador **não foram
executados pelo autor no ambiente de desenvolvimento** (sem banco/Prisma engine disponível) — o schema Prisma foi
validado e o frontend compila (`vite build`). Execute o roteiro da seção 4 e reporte o que encontrar.

**Funcional (código completo):** cadastro de empresa (tenant), login, perfil com foto (pré-visualização + upload),
troca de senha, usuários (criar/bloquear/liberar/excluir/perfil), permissões granulares por usuário (Super Admin),
estoque (produtos, categorias, movimentações, alerta de estoque baixo, comprovante impresso), importação e exportação
CSV/JSON de produtos e movimentações, Kanban (criar/editar/mover/excluir cards, tempo real), chat (PV e grupos, tempo real),
dashboard (faturamento, fluxo de caixa, mais vendidos, status de pedidos; impressão), IA de Suporte e de Marketing,
gerenciamento de infraestrutura (CRUD + teste de conexão), temas (3 paletas × claro/escuro), Plano TOP.

**Limitações conhecidas / próximos passos:**

- **Não há módulo de vendas/PDV.** O "faturamento" é _estimado_ a partir de saídas de estoque × preço de venda,
  e as "compras" do fluxo de caixa a partir de entradas × preço de custo. Para contabilidade real, crie um módulo de
  pedidos/vendas e contas a pagar/receber.
- **Não há painel para o Super Admin gerenciar vários tenants** (criar/bloquear empresas). O campo `Tenant.active`
  já é respeitado no login; falta a tela. Hoje o Super Admin pertence a um tenant e administra os usuários dele.
- Importação/exportação: CSV e JSON (produtos; exportação também de movimentações), com proteção contra
  _CSV injection_, limite de 5.000 linhas por importação e criação automática de categorias. Excel (.xlsx) não
  implementado (adicione `exceljs` nos endpoints de `import-export.routes.js`).
- Multi-plano: só o TOP existe; a tabela `Plan` e `Tenant.planId` já preparam a expansão, mas não há bloqueio por
  recurso/cobrança (gateway de pagamento não incluído).
- Segurança: JWT guardado em `localStorage` (vulnerável a XSS — considere cookies httpOnly), sem refresh token,
  sem verificação de e-mail nem recuperação de senha, cadastro de empresa público, proteção SSRF do "testar conexão"
  baseada em hostname (não cobre DNS rebinding). Rate limit no login e nas IAs já incluído.
- O chat não mostra mensagens não lidas nem avisa outros participantes sobre uma sala nova até recarregar.
- O código-fonte usa `prompt()`/`confirm()` do navegador em alguns fluxos simples (movimentar estoque, criar card,
  categoria) — funcional, mas vale trocar por modais para uma UX mais refinada.
- Escala: a arquitetura (API stateless + Postgres com índices por `tenantId`) permite escalar horizontalmente, mas o
  Socket.io com múltiplas instâncias exige o adaptador Redis; o dashboard agrega em memória (mova para SQL/`groupBy`
  com volume alto).
