// DEAD TOWN 오프라인 실행용 서비스워커
// 게임 파일을 폰에 저장해두고, 인터넷 없이도 실행. 새 버전을 올리면 VERSION만 올리면 됨.
const VERSION = 'deadtown-v41';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/audio.js', 'js/rng.js', 'js/map.js', 'js/world.js', 'js/county.js', 'js/story.js', 'js/levels.js', 'js/astar.js', 'js/game.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 구글 폰트: 한 번 받으면 저장해두고 재사용
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => new Response('', { status: 503 })))));
    return;
  }
  if (url.origin !== location.origin) return;
  // 게임 파일: 네트워크 우선(새 버전 반영) → 실패하면 저장본
  // 신호가 약하면 2.5초만 기다리고 저장본으로 (홈 화면 실행 시 검은 화면 오래 방지)
  const net = fetch(req).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return res; });
  const timeout = new Promise(r => setTimeout(r, 2500)).then(() => caches.match(req, { ignoreSearch: true }));
  e.respondWith(Promise.race([net.catch(() => null), timeout]).then(r => r || net.catch(() => caches.match(req, { ignoreSearch: true })).then(x => x || caches.match(req, { ignoreSearch: true }))));
});
