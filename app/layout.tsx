import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ProDrome - Early Outbreak Detection',
  description: 'Surveillance from diagnostic system telemetry - detecting outbreaks 48-72 hours earlier.',
  generator: 'v0.app',
  openGraph: {
    title: 'ProDrome - Early Outbreak Detection',
    description: 'Surveillance from diagnostic system telemetry - detecting outbreaks 48-72 hours earlier.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
