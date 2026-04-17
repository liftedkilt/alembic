import Link from 'next/link';
import { prisma } from '@/lib/db';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return (
    <main className="container max-w-2xl py-10">
      <div className="mb-6"><Link href="/" className="text-sm text-muted-foreground hover:text-primary">← Library</Link></div>
      <h1 className="font-serif text-3xl text-primary mb-6">Settings</h1>
      <SettingsForm initial={{ provider: s.llmProvider, model: s.llmModel, baseUrl: s.baseUrl }} />
    </main>
  );
}
