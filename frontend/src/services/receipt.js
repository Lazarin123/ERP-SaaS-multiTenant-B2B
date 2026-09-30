// Gera e imprime um comprovante simples de movimentação de estoque.
// Abre uma janela com HTML próprio (independente do tema do sistema) e chama window.print().
export function printReceipt({ empresa, produto, tipo, quantidade, motivo, usuario }) {
  const tipos = { IN: 'ENTRADA', OUT: 'SAÍDA', ADJUST: 'AJUSTE' };
  const w = window.open('', '_blank', 'width=420,height=600');
  if (!w) return alert('Permita pop-ups para imprimir o comprovante.');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#0A1A33}
      h1{font-size:18px;margin:0;border-bottom:2px solid #D4AF37;padding-bottom:8px}
      p{margin:8px 0;font-size:14px} .muted{color:#5B6B8C;font-size:12px}
    </style></head><body>
      <h1>${esc(empresa)} — Comprovante de ${tipos[tipo] || esc(tipo)}</h1>
      <p><b>Produto:</b> ${esc(produto)}</p>
      <p><b>Quantidade:</b> ${esc(quantidade)}</p>
      <p><b>Motivo:</b> ${esc(motivo || '—')}</p>
      <p><b>Responsável:</b> ${esc(usuario)}</p>
      <p class="muted">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`);
  w.document.close();
}
