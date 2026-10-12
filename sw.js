// 오프라인에서도 플레이할 수 있게 게임 파일을 저장해 둔다.
// 온라인이면 항상 새 파일을 먼저 받고(업데이트 바로 반영), 오프라인이면 저장해 둔 파일을 쓴다.
const CACHE = 'workneverend-v2';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'js/ai.js',
  'js/apps.js',
  'js/career.js',
  'js/core.js',
  'js/data/career.js',
  'js/data/context.js',
  'js/data/messages.js',
  'js/data/office.js',
  'js/data/manage.js',
  'js/data/people.js',
  'js/data/personas.js',
  'js/data/stories.js',
  'js/data/tasks.js',
  'js/data/teams.js',
  'js/data/terms.js',
  'js/data/vacation.js',
  'js/generators.js',
  'js/main.js',
  'js/messenger.js',
  'js/office.js',
  'js/manage.js',
  'js/pwa.js',
  'js/relations.js',
  'js/teamwork.js',
  'js/twists.js',
  'js/vacation.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
