import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vibe Theme Editor',
  description: 'AI-powered Shopify theme editing. Connect your store, chat with Claude, push changes live.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css"
        />
      </head>
      <body>
        {children}
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"
          defer
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"
          defer
        />
      </body>
    </html>
  )
}
