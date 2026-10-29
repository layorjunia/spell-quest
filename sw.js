// Spell Quest — offline cache.
// App shell is precached; word and sentence recordings are cached the first time
// they are played (about 22 MB in all), so after one round the app works offline.
// iOS Safari requests media with a Range header and refuses a plain 200 from a
// service worker cache, so audio is answered with real 206 slices. It also refuses
// OPAQUE responses, so we never hand an <audio> request straight to fetch().
const CACHE = 'sq-20261029-1202-d391628';
const ASSETS = [
  '.', 'index.html', 'style.css', 'manifest.json', 'firebase-config.js', 'words.js', 'data.js', 'data-allies.js',
  'art.js', 'art-more.js', 'engine.js', 'store.js', 'sync.js', 'audio.js', 'app-core.js', 'app-home.js', 'app-play.js', 'app-meta.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];
const SFX = ['key', 'tap', 'del', 'correct', 'wrong', 'retry', 'combo', 'coin', 'star', 'hint', 'flip', 'whoosh', 'levelup', 'fanfare',
             'evolve', 'shake', 'open', 'hit', 'hurt', 'heart', 'win', 'lose', 'tick', 'go', 'unlock'].map(n => 'audio/sfx/' + n + '.m4a');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.concat(SFX))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Caches are origin-wide on github.io: only ever delete OUR old ones (sq-*), never another app's.
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sq-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (url.pathname.includes('/audio/') && /\.(mp3|m4a)$/.test(url.pathname)) {
    e.respondWith((async () => {
      let res = await caches.match(url.pathname);
      if (!res) {
        // re-issue in cors mode: an audio element's own request is no-cors, and an opaque response is unplayable in Safari
        res = await fetch(new Request(url.pathname, { mode: 'cors', credentials: 'omit' }));
        if (res.ok && res.status === 200 && res.type !== 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname, copy)); }
      }
      const range = e.request.headers.get('range');
      if (!range || !res.ok) return res;
      const m = /bytes=(\d*)-(\d*)/.exec(range);                       // "bytes=0-99", "bytes=100-", "bytes=-500"
      if (!m || (!m[1] && !m[2])) return res;
      const buf = await res.arrayBuffer();
      let start, end;
      if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1; }
      else { start = Math.max(0, buf.byteLength - Number(m[2])); end = buf.byteLength - 1; }
      if (start >= buf.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + buf.byteLength } });
      return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
        'Content-Type': res.headers.get('Content-Type') || 'audio/mp4', 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
        'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    })());
    return;
  }
  // App shell: network first with cache:'reload' so a deploy actually lands; cache is the offline fallback.
  e.respondWith(fetch(e.request, { cache: 'reload' }).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
