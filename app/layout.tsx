import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Dev Cycle - Security Demo',
  description: 'セキュリティ対策実装デモ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}