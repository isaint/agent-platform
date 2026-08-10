export const metadata = {
  title: 'task.sant.ltd',
  description: 'Agent Task Control Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#0a0a0a', color: '#e5e5e5' }}>
        {children}
      </body>
    </html>
  )
}
