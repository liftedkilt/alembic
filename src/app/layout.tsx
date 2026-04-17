import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Alembic', description: 'Read books through distilled summaries' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
