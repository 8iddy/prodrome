import React from "react"
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

import './globals.css'

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
}

const description = 'ProDrome watches weekly laboratory data and alerts surveillance teams when testing patterns start to look unusual. An open source early warning tool from Neuravox Foundation, Uganda.'

export const metadata: Metadata = {
  metadataBase: new URL('https://prodrome.health'),
  title: 'Prodrome - Laboratory Surveillance and Early Warning',
  description,
  keywords: ['laboratory surveillance', 'early warning', 'outbreak detection', 'disease surveillance', 'Uganda', 'public health', 'open source'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Prodrome - Laboratory Surveillance and Early Warning',
    description,
    url: 'https://prodrome.health',
    siteName: 'ProDrome',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Prodrome - Laboratory Surveillance and Early Warning', description },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  )
}
