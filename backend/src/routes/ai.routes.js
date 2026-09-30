const express = require('express');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();
router.use(auth);

const SUPPORT_SYSTEM_PROMPT = `Você é o assistente de suporte interno do ERP "Luxury Tech ERP".
Responda sempre em português do Brasil, de forma direta, cordial e prática.
Seu papel é ajudar a equipe (administradores e colaboradores) com dúvidas de uso do
sistema: estoque, kanban, chat, relatórios, importação/exportação de dados e configurações.
Dê passos objetivos e, quando fizer sentido, sugira boas práticas operacionais para o
segmento do negócio do usuário (varejo, mercadinho, restaurante, padaria, loja de tecnologia).
Nunca invente funcionalidades que não existem no sistema.`;

const MARKETING_SYSTEM_PROMPT = `Você é uma IA de marketing especializada em pequenos e médios
negócios B2B/B2C (varejo, mercadinhos, restaurantes, padarias, lojas de tecnologia).
Responda sempre em português do Brasil.
Ajude a estruturar: copywriting, ideias de conteúdo, posts para redes sociais (Instagram,
Facebook, WhatsApp), campanhas promocionais e estratégias de crescimento de vendas.
Seja criativo, específico e sempre entregue algo pronto para usar (texto, legenda,
cronograma ou lista de ideias), não apenas teoria.`;

async function callClaude(systemPrompt, userMessage, history = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada no .env do backend.');
  }

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API da Anthropic: ${errText}`);
  }

  const data = await response.json();
  return data.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n');
}

// POST /api/ai/support  { message, history }
router.post('/support', requirePermission('USE_AI_SUPPORT'), async (req, res) => {
  try {
    const { message, history } = req.body;
    const reply = await callClaude(SUPPORT_SYSTEM_PROMPT, message, history);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao consultar a IA de suporte.' });
  }
});

// POST /api/ai/marketing  { message, history }
router.post('/marketing', requirePermission('USE_AI_MARKETING'), async (req, res) => {
  try {
    const { message, history } = req.body;
    const reply = await callClaude(MARKETING_SYSTEM_PROMPT, message, history);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao consultar a IA de marketing.' });
  }
});

module.exports = router;
