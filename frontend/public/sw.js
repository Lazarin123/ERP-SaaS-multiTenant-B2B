// Service worker simples do Luxury Tech ERP.
// Objetivo: permitir "Instalar app" no navegador e abrir a interface mais rápido depois da primeira visita.
// NÃO guarda dados do sistema (produtos, mensagens, etc.) — isso sempre vem ao vivo da API.

const CACHE_NAME = 'luxury-tech-shell-v1';
const SHELL_FILES = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Nunca mexe em chamadas de API nem em WebSocket: elas precisam sempre ser "ao vivo".
  if (request.method !== 'GET' || request.url.includes('/api/') || request.url.includes('/socket.io/')) {
    return;
  }

  // Para a navegação (abrir a página), tenta a rede primeiro; se estiver offline, cai no esqueleto salvo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Para arquivos estáticos (ícones, css, js), usa o cache se existir e atualiza em segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.ok) caches.open(CACHE_NAME).then((c) => c.put(request, resp.clone()));
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
