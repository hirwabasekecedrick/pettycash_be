import prisma from '../utils/prisma';
import { isConfigured } from '../services/xentriPay';
import { refreshPaymentFromProvider } from '../controllers/payments';
import { refreshCollectionFromProvider } from '../controllers/collections';

const POLL_INTERVAL_MS = Number(process.env.PAYOUT_POLL_INTERVAL_MS) || 60000;

let timer: NodeJS.Timeout | null = null;

async function pollPayouts() {
  if (!isConfigured()) return;

  const payments = await prisma.payment.findMany({
    where: { status: 'PROCESSING' },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  for (const payment of payments) {
    try {
      const result = await refreshPaymentFromProvider(payment.id);
      if (result.payment) {
        console.log(`[poller] payment ${payment.id} -> ${result.payment.status}`);
      }
    } catch (error) {
      console.error(`[poller] error on payment ${payment.id}:`, error);
    }
  }
}

async function pollCollections() {
  if (!isConfigured()) return;

  const collections = await prisma.collection.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  for (const collection of collections) {
    try {
      const result = await refreshCollectionFromProvider(collection.id);
      if (result.collection) {
        console.log(`[poller] collection ${collection.id} -> ${result.collection.status}`);
        if (result.collection.status === 'SUCCESSFUL') {
          console.log(`[poller] collection ${collection.id} credited the wallet`);
        }
      }
    } catch (error) {
      console.error(`[poller] error on collection ${collection.id}:`, error);
    }
  }
}

async function pollOnce() {
  await Promise.all([pollPayouts(), pollCollections()]);
}

export function startPayoutPoller() {
  if (timer) return;
  timer = setInterval(() => {
    pollOnce().catch((error) => console.error('[poller] cycle failed:', error));
  }, POLL_INTERVAL_MS);

  // Kick off one cycle shortly after boot so in-flight transactions settle quickly.
  setTimeout(() => {
    pollOnce().catch(() => {});
  }, 5000);

  console.log(`✅ Payout/collection poller started (every ${POLL_INTERVAL_MS}ms)`);
}