import React from "react"
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

import './globals.css'

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ProDrome — Surveillance Research Platform',
  description: 'Reproducible laboratory-signal surveillance research and retrospective analysis.',
  openGraph: {
    title: 'ProDrome — Surveillance Research Platform',
    description: 'Reproducible laboratory-signal surveillance research and retrospective analysis.',
  },
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
