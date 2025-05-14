import { NextResponse } from 'next/server';

export function GET() {
  const manifest = {
    name: 'Nuestro Aniversario',
    short_name: 'Aniversario',
    description: 'Una aplicación especial para celebrar nuestro segundo aniversario',
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
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  return NextResponse.json(manifest);
} 