import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { FirebaseProvider } from "./context/firebase-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Lazarski",
  description: "Una aplicación especial para nosotros",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nuestro Aniversario',
  },
  applicationName: 'Lazarski',
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <FirebaseProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-1 pb-16">{children}</main>
              <BottomNavigation />
            </div>
          </FirebaseProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost')) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js').catch(function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }`,
          }}
        />
      </body>
    </html>
  )
}
