import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GPL Dashboard',
  description: 'Green Power Ltd. Project Management Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen" style={{ background: 'var(--gpl-bg)', color: 'var(--gpl-text)' }}>
        {children}
      </body>
    </html>
  )
}
