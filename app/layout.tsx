import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ordano — Invest in Real Commerce',
  description: 'Ordano lets retail investors fund purchase order financing for real businesses. Earn attractive returns while powering real commerce.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  )
}
