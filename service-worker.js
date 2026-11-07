const CACHE = "tushar-sim-shell-v8-compact-ui";
const SHELL = [
  "./",
  "./index.html",
  "./firebase-sync.js",
  "./firebase-config.js",
  "./manifest.webmanifest",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/tushar-visa-logo.jpg",
  "./assets/tushar-visa-mark.png"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.destination === "document" || SHELL.some((path) => url.pathname.endsWith(path.replace(/^\.\//, ""))))) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || caches.match("./index.html")));
});
