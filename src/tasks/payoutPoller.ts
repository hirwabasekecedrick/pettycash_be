import prisma from '../utils/prisma';
import { isConfigured } from '../services/xentriPay';
import { refreshPaymentFromProvider } from '../controllers/payments';

const POLL_INTERVAL_MS = Number(process.env.PAYOUT_POLL_INTERVAL_MS) || 60000;

let timer: NodeJS.Timeout | null = null;

async function pollOnce() {
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
        const fresh = result.payment;
        console.log(`[payout-poller] payment ${payment.id} -> ${fresh.status}`);
      }
    } catch (error) {
      console.error(`[payout-poller] error on payment ${payment.id}:`, error);
    }
  }
}

export function startPayoutPoller() {
  if (timer) return;
  timer = setInterval(() => {
    pollOnce().catch((error) => console.error('[payout-poller] cycle failed:', error));
  }, POLL_INTERVAL_MS);

  // Kick off one cycle shortly after boot so in-flight payouts settle quickly.
  setTimeout(() => {
    pollOnce().catch(() => {});
  }, 5000);

  console.log(`✅ Payout poller started (every ${POLL_INTERVAL_MS}ms)`);
}