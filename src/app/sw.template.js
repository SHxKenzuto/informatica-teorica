/* service worker: salva tutta l'app per l'uso offline */
const VERSION = "it-__VERSION__";
const FILES = __FILES__;
self.addEventListener("install", e => {
  // Una nuova cache deve ricevere i file appena pubblicati, anche se la cache
  // HTTP del browser contiene ancora quelli della versione precedente.
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(file => new Request(file, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const previous = (await caches.keys()).filter(k => k.startsWith("it-") && k !== VERSION && k !== "it-fonts");
    await Promise.all(previous.map(k => caches.delete(k)));
    await self.clients.claim();
    if (!previous.length) return; // La prima installazione non richiede un ricaricamento.
    // claim() cambia chi serve i file, ma non sostituisce il JS già in memoria.
    // Riapriamo anche i client delle versioni prive di listener di aggiornamento:
    // URL, hash e progressi in localStorage restano gli stessi.
    const windows = await self.clients.matchAll({ type: "window" });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) {
        // Non attendere la navigazione nell'activate: i suoi fetch devono poter
        // essere gestiti dopo il completamento di questo evento.
        client.navigate(client.url).catch(() => {});
      }
    }
  })());
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
