import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PackagePro — Proof-of-Packing Video for WooCommerce',
  description:
    'Record per-order packing videos, print ShipStation labels, and send customers a secure link to watch their order being packed. Built for WooCommerce fulfillment teams.',
  keywords: [
    'WooCommerce',
    'packing video',
    'fulfillment',
    'ShipStation',
    'proof of packing',
    'shipping labels',
    'order verification',
  ],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'PackagePro — Proof-of-Packing Video for WooCommerce',
    description:
      'Record per-order packing videos, print ShipStation labels, and send customers a secure link to watch their order being packed.',
    type: 'website',
    siteName: 'PackagePro',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">{children}</body>
    </html>
  );
}
