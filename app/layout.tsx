import type React from "react"
import type { Metadata, Viewport } from "next"
import { Fraunces, Inter } from "next/font/google"
import "./globals.css"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Lazarski",
  description: "Una aplicación especial para nosotros",
  generator: 'v0.dev',
  // The PWA manifest comes from app/manifest.ts (served at /manifest.webmanifest).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nuestro Aniversario',
  },
  applicationName: 'Lazarski',
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F5F0' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0D0C' }
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
        {/* Next only emits mobile-web-app-capable for appleWebApp.capable; iOS still reads this one. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${fraunces.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 pb-20">{children}</main>
            <BottomNavigation />
          </div>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
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
