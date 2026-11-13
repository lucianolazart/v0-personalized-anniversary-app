import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lazarski',
    short_name: 'Lazarski',
    description: 'Una aplicación especial para nosotros',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    // Long-press the app icon (Android) to jump straight to these.
    shortcuts: [
      {
        name: 'Nuevo plan',
        short_name: 'Nuevo plan',
        url: '/plans?nuevo=1',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Agregar noche de peli',
        short_name: 'Noche de peli',
        url: '/movie-night?nuevo=1',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Calendario',
        short_name: 'Calendario',
        url: '/calendario',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      }
    ]
  };
} 