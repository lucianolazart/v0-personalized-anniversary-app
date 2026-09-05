const CACHE_NAME = "lazarski-v4"
const urlsToCache = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }
        if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/)) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  )
})

self.addEventListener("push", (event) => {
  let data = { title: "🍿 Movie Night", body: "It is almost time.", url: "/movie-night" }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: data.url || "/movie-night" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/movie-night"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const targetPath = new URL(url, self.location.origin).pathname
      const existing = clients.find((client) => {
        try {
          return new URL(client.url).pathname === targetPath
        } catch {
          return client.url.includes(targetPath)
        }
      })
      if (existing) {
        return existing.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
