import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { RegisterSW } from './register-sw';

export const metadata: Metadata = {
  title: 'Alembic',
  description: 'Read books through distilled summaries',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#7a2a00',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
