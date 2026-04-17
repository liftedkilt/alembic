import 'dotenv/config';
import { prisma } from '@/lib/db';
import { buildProviderFromSettings } from '@/llm/factory';
import { runSummarizeJob } from './summarize';

const POLL_INTERVAL_MS = 2_000;

async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const next = await tx.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
    if (!next) return null;
    return tx.job.update({ where: { id: next.id }, data: { status: 'running' } });
  });
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return;
  console.log(`[worker] running job ${job.id} (${job.type})`);
  try {
    const provider = await buildProviderFromSettings();
    if (job.type === 'summarize-book-and-chapters') {
      await runSummarizeJob(job.id, provider);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
    console.log(`[worker] job ${job.id} done`);
  } catch (e) {
    console.error(`[worker] job ${job.id} failed:`, e);
  }
}

async function main() {
  console.log('[worker] started');
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error('[worker] tick error:', e);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((e) => {
  console.error('[worker] fatal:', e);
  process.exit(1);
});
