/**
 * Service Worker for سجل حضور وغياب الموظفين الاحترافي (sjel-mobile)
 * الإصدار: v1.4
 */

const CACHE_NAME = 'sjel-v1.4';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './license.js',
    './icon.png',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf',
];

// حدث التثبيت: تحميل الأصول الأساسية في الكاش والتفعيل الفوري
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // إضافة الأصول مع حماية ضد فشل أي رابط خارجي
            return Promise.allSettled(
                PRECACHE_ASSETS.map((url) =>
                    fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' })
                        .then((res) => {
                            if (res.ok) return cache.put(url, res);
                        })
                        .catch((err) => console.warn('[SW] Precache failed for:', url, err))
                )
            );
        })
    );
});

// حدث التفعيل: تنظيف وتطهير كافة نسخ الكاش القديمة والسيطرة الفورية على الصفحات
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// حدث الجلب (Fetch): اعتماد استراتيجية Network-First للملفات الأساسية
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // استبعاد الطلبات غير المدعومة مثل POST أو بروتوكولات أخرى
    if (request.method !== 'GET') return;
    if (request.url.startsWith('chrome-extension://')) return;

    const url = new URL(request.url);
    const isNavigation = request.mode === 'navigate';
    const isCoreFile = isNavigation ||
        url.pathname.endsWith('index.html') ||
        url.pathname.endsWith('manifest.json') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/');

    if (isCoreFile) {
        // استراتيجية Network-First: جلب الأحدث من الخادم، والرجوع للكاش عند انقطاع الإنترنت
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // في حال انقطاع الإنترنت، العودة للنسخة المخزنة بالكاش
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;
                        if (isNavigation) {
                            return caches.match('./index.html') || caches.match('./');
                        }
                    });
                })
        );
        return;
    }

    // استراتيجية Stale-While-Revalidate / Cache-First للأصول الأخرى (الصور، الخطوط، المكتبات)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => null);

            // إرجاع النسخة المخزنة فوراً إن وجدت، مع التحديث في الخلفية، أو انتظار الشبكة
            return cachedResponse || fetchPromise;
        })
    );
});
