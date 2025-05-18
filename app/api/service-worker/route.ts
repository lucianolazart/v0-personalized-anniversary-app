import { NextResponse } from 'next/server';

export function GET() {
  const swContent = `
    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open('lazarski-v1').then((cache) => {
          return cache.addAll([
            '/',
            '/index.html',
            '/manifest.json',
            '/icons/icon-192x192.png',
            '/icons/icon-384x384.png',
            '/icons/icon-512x512.png',
          ]);
        })
      );
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
    });
  `;

  return new NextResponse(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  });
} 