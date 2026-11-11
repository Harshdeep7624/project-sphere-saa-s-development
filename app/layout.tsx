import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://projectsphere.app'),
  title: {
    default: 'ProjectSphere · Modern Academic Project Management',
    template: '%s · ProjectSphere',
  },
  description: 'A modern SaaS workspace for academic project tracking, team collaboration, milestone reviews, and progress analytics.',
  applicationName: 'ProjectSphere',
  keywords: [
    'ProjectSphere',
    'project management',
    'academic projects',
    'capstone workspace',
    'student collaboration',
    'faculty review',
  ],
  authors: [{ name: 'ProjectSphere Team' }],
  creator: 'ProjectSphere',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'ProjectSphere · Modern Academic Project Management',
    description: 'Transform your capstone and academic projects into structured progress with milestone tracking, faculty reviews, and team collaboration.',
    siteName: 'ProjectSphere',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf9f6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
