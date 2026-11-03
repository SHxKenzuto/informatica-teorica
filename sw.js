/* service worker: salva tutta l'app per l'uso offline */
const VERSION = "it-54b0a5c001";
const FILES = ["./", "index.html", "app.css", "app.js", "engine.js", "widgets.js", "registry.js", "content.js", "quiz.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "vendor/auto-render.min.js", "vendor/fonts/KaTeX_AMS-Regular.woff2", "vendor/fonts/KaTeX_Caligraphic-Bold.woff2", "vendor/fonts/KaTeX_Caligraphic-Regular.woff2", "vendor/fonts/KaTeX_Fraktur-Bold.woff2", "vendor/fonts/KaTeX_Fraktur-Regular.woff2", "vendor/fonts/KaTeX_Main-Bold.woff2", "vendor/fonts/KaTeX_Main-BoldItalic.woff2", "vendor/fonts/KaTeX_Main-Italic.woff2", "vendor/fonts/KaTeX_Main-Regular.woff2", "vendor/fonts/KaTeX_Math-BoldItalic.woff2", "vendor/fonts/KaTeX_Math-Italic.woff2", "vendor/fonts/KaTeX_SansSerif-Bold.woff2", "vendor/fonts/KaTeX_SansSerif-Italic.woff2", "vendor/fonts/KaTeX_SansSerif-Regular.woff2", "vendor/fonts/KaTeX_Script-Regular.woff2", "vendor/fonts/KaTeX_Size1-Regular.woff2", "vendor/fonts/KaTeX_Size2-Regular.woff2", "vendor/fonts/KaTeX_Size3-Regular.woff2", "vendor/fonts/KaTeX_Size4-Regular.woff2", "vendor/fonts/KaTeX_Typewriter-Regular.woff2", "vendor/katex.min.css", "vendor/katex.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "it-fonts").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open("it-fonts").then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
