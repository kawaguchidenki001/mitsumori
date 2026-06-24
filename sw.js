/**
 * KE-Mitsumori Service Worker
 *
 * オフライン対応のため、アプリシェル（HTML/CSS/JS）をキャッシュ。
 * - GASへのAPIリクエスト（dynamic）はキャッシュしない（network-only）
 * - 静的ファイル（app shell）はcache-first戦略
 * - キャッシュ更新時は古いキャッシュを削除
 */

const CACHE_VERSION = 'ke-mitsumori-v0.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// プリキャッシュするアプリシェルのファイル
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/config.js',
  'js/common.js',
  'js/mockApi.js',
  'js/api.js',
  'js/router.js',
  'js/dashboard.js',
  'js/customer.js',
  'js/unit_prices.js',
  'js/quote_edit.js',
  'js/quote_preview.js',
  'js/settings.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// =====================================================
// インストール時：app shell をプリキャッシュ
// =====================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(APP_SHELL).catch((err) => {
          console.warn('[SW] Some files failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// =====================================================
// アクティブ化時：古いキャッシュをクリア
// =====================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('ke-mitsumori-') && name !== STATIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// =====================================================
// fetch時：戦略的にキャッシュ／ネットワーク選択
// =====================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GASへのAPIリクエストはキャッシュしない（network-only）
  if (url.href.includes('script.google.com') || url.href.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: 'オフラインのためAPIにアクセスできません' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // GETリクエストのみキャッシュ対象
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 静的ファイル: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // バックグラウンドで更新を試みる
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // ネットワーク失敗時、ナビゲーションならindex.htmlを返す（SPAルート対応）
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return new Response('オフラインです', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// =====================================================
// メッセージハンドラ（手動キャッシュクリア等）
// =====================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      Promise.all(names.map((n) => caches.delete(n)));
    });
  }
});
