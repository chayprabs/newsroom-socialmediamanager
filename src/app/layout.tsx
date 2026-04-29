import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/index.css';

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
const title = 'Newsroom | Crustdata-Backed Trend Discovery';
const description =
  'Discover, validate, and generate data-backed newsroom ideas using Grok, Claude, and verified Crustdata endpoints.';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: 'Newsroom',
  title: {
    default: title,
    template: '%s | Newsroom',
  },
  description,
  keywords: [
    'Crustdata',
    'Newsroom',
    'trend discovery',
    'AI newsroom',
    'data-backed stories',
    'API feasibility',
  ],
  authors: [{ name: 'Crustdata Newsroom' }],
  creator: 'Crustdata Newsroom',
  publisher: 'Crustdata Newsroom',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Newsroom',
    title,
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Newsroom trend discovery pipeline with API feasibility validation.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f8f8f7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
