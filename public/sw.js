const WEPRAY_SW_VERSION = "wepray-pwa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep a fetch listener for installability without caching dynamic, authenticated pages.
self.addEventListener("fetch", () => {
  return;
});
