const CACHE_NAME = 'rihlaty-permanent-cache';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ١. التثبيت والتحميل الأولي
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
  );
});

// ٢. التفعيل والاستحواذ الفوري على الصفحات
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ٣. استراتيجية (Network-First): جلب التحديث الجديد تلقائياً مع العمل أوفلاين عند انقطاع النت
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // استثناء طلبات الذكاء الاصطناعي (Gemini) لكي لا تُخزن مؤقتاً
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // إذا نجح جلب الكود الجديد من الإنترنت، حدّث الكاش في الخلفية فوراً
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // في حال عدم وجود إنترنت، اجلب النسخة المخزنة في الهاتف
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
