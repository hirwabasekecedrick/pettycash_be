"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPayoutPoller = startPayoutPoller;
const prisma_1 = __importDefault(require("../utils/prisma"));
const xentriPay_1 = require("../services/xentriPay");
const payments_1 = require("../controllers/payments");
const collections_1 = require("../controllers/collections");
const POLL_INTERVAL_MS = Number(process.env.PAYOUT_POLL_INTERVAL_MS) || 60000;
let timer = null;
async function pollPayouts() {
    if (!(0, xentriPay_1.isConfigured)())
        return;
    const payments = await prisma_1.default.payment.findMany({
        where: { status: 'PROCESSING' },
        orderBy: { createdAt: 'asc' },
        take: 25,
    });
    for (const payment of payments) {
        try {
            const result = await (0, payments_1.refreshPaymentFromProvider)(payment.id);
            if (result.payment) {
                console.log(`[poller] payment ${payment.id} -> ${result.payment.status}`);
            }
        }
        catch (error) {
            console.error(`[poller] error on payment ${payment.id}:`, error);
        }
    }
}
async function pollCollections() {
    if (!(0, xentriPay_1.isConfigured)())
        return;
    const collections = await prisma_1.default.collection.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 25,
    });
    for (const collection of collections) {
        try {
            const result = await (0, collections_1.refreshCollectionFromProvider)(collection.id);
            if (result.collection) {
                console.log(`[poller] collection ${collection.id} -> ${result.collection.status}`);
                if (result.collection.status === 'SUCCESSFUL') {
                    console.log(`[poller] collection ${collection.id} credited the wallet`);
                }
            }
        }
        catch (error) {
            console.error(`[poller] error on collection ${collection.id}:`, error);
        }
    }
}
async function pollOnce() {
    await Promise.all([pollPayouts(), pollCollections()]);
}
function startPayoutPoller() {
    if (timer)
        return;
    timer = setInterval(() => {
        pollOnce().catch((error) => console.error('[poller] cycle failed:', error));
    }, POLL_INTERVAL_MS);
    // Kick off one cycle shortly after boot so in-flight transactions settle quickly.
    setTimeout(() => {
        pollOnce().catch(() => { });
    }, 5000);
    console.log(`✅ Payout/collection poller started (every ${POLL_INTERVAL_MS}ms)`);
}
