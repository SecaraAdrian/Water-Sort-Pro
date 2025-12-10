self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("watersort-v1").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "style.css",
        "script.js",
        "manifest.json",
        "icon.png",
        "poor.mp3",
        "wrong.mp3",
        "win.mp3"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
