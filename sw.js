// Service Worker — מסך בקרה חירום הגבורה 3
// תפקיד: תפיסה אופליין מלאה של קונכית האפליקציה (HTML/CSS/JS/מניפסט/אייקונים).
// נתוני הטלפונים/תפקידים נשלפים ע"י הדף עצמו מ-Google Sheets (fetch רגיל,
// לא עובר כאן) ונשמרים ב-localStorage של הדף — כך שגם הם נשארים זמינים אופליין.

const CACHE_NAME = "emergency-ashkelon-v7";
const APP_SHELL = [
  "./emergency-dashboard.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// אסטרטגיה: stale-while-revalidate לקונכית האפליקציה.
// בקשות ל-Google Sheets (docs.google.com) לא נתפסות כאן בכלל — מנוהלות ע"י
// לוגיקת הסנכרון בדף עצמו (fetch + localStorage + טיימאאוט), כדי שתקלת רשת
// בקריאה לגוגל לעולם לא תחסום את טעינת הדף.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes("google.com") || url.hostname.includes("googleusercontent.com")) {
    return; // תן לדף עצמו להתמודד עם זה
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached); // אין רשת — חזרה לקאש
      return cached || network;
    })
  );
});
