import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AEO Diagnostic',
  description: 'AI Engine Optimization report card for product recommendation visibility.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
