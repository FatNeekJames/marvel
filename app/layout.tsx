import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MCU Temporal Loom',
  description: 'A database-backed visualisation of the Marvel multiverse timeline.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
