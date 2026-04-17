// Minimal offline-capable SW: cache app shell; pass everything else to network.
const CACHE = 'alembic-v1';
const SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r ?? caches.match('/'))),
  );
});
