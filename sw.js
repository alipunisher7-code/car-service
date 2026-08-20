// Bump this on every deploy that changes app files — changing the string
// changes this file's bytes, which is what makes browsers notice an update
// and run activate() below (which deletes every old-named cache).
var CACHE_NAME = 'car-service-booklet-v2-2026-08-20';

var STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(STATIC_ASSETS);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isNavigation = req.mode === 'navigate';
  var isAppShell = isNavigation || url.pathname.endsWith('/index.html') || url.pathname === '/' || url.pathname.endsWith('/manifest.json');

  if (url.origin === self.location.origin && isAppShell) {
    // Network-first for the app shell (HTML + manifest): always try to get
    // the latest deployed version first, so a new GitHub Pages deploy shows
    // up on next reload without anyone needing to clear anything. Falls back
    // to cache only when offline.
    event.respondWith(
      fetch(req).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
  } else if (url.origin === self.location.origin) {
    // Cache-first for static assets that rarely change (icons).
    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached) return cached;
        return fetch(req).then(function(res){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
          return res;
        });
      })
    );
  } else {
    // Cross-origin (fonts, OCR engine CDN): network-first, cache fallback.
    event.respondWith(
      fetch(req).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        return res;
      }).catch(function(){ return caches.match(req); })
    );
  }
});
