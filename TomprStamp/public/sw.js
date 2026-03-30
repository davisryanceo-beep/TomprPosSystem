// Simple Service Worker for PWA installation support
const CACHE_NAME = 'tompr-stamp-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetching
    event.respondWith(fetch(event.request));
});
