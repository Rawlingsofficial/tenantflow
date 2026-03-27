// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TenantFlow',
  description: 'Property management made simple',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ClerkProvider is a client component, so wrap only inside body */}
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}

