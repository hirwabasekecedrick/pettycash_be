"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshCollectionStatus = exports.refreshCollectionFromProvider = exports.getCollections = exports.createCollection = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const xentriPay_1 = require("../services/xentriPay");
async function getOrCreateWallet() {
    let wallet = await prisma_1.default.wallet.findFirst();
    if (!wallet) {
        wallet = await prisma_1.default.wallet.create({ data: {} });
    }
    return wallet;
}
function generateCollectionRef() {
    return `COL-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}
function businessEmail() {
    return process.env.XENTRI_PAY_BUSINESS_EMAIL || 'admin@example.com';
}
function businessName() {
    return process.env.XENTRI_PAY_BUSINESS_NAME || 'PettyCash';
}
// Credit the wallet exactly once per successful collection.
async function creditWalletFromCollection(collectionId) {
    const collection = await prisma_1.default.collection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.status !== 'SUCCESSFUL')
        return;
    const reference = collection.customerRef || collection.refid || collection.id;
    const alreadyCredited = await prisma_1.default.walletTransaction.findFirst({
        where: { type: 'CREDIT', reference },
    });
    if (alreadyCredited)
        return;
    const wallet = await getOrCreateWallet();
    await prisma_1.default.$transaction([
        prisma_1.default.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: collection.amount }, updatedAt: new Date() },
        }),
        prisma_1.default.walletTransaction.create({
            data: {
                type: 'CREDIT',
                amount: collection.amount,
                description: `Wallet funding (MoMo collection)`,
                reference,
                walletId: wallet.id,
            },
        }),
    ]);
}
const createCollection = async (req, res) => {
    try {
        if (req.user.role !== 'ACCOUNTANT') {
            res.status(403).json({ error: 'Only accountants can initiate collections' });
            return;
        }
        const { amount, msisdn, note } = req.body;
        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            res.status(400).json({ error: 'amount must be a positive number' });
            return;
        }
        let localNumber;
        let international;
        try {
            localNumber = (0, xentriPay_1.normalizeLocalMsisdn)(msisdn || '');
            international = (0, xentriPay_1.normalizeCollectionMsisdn)(msisdn || '');
        }
        catch (error) {
            res.status(400).json({ error: error.message });
            return;
        }
        const customerRef = generateCollectionRef();
        const collection = await prisma_1.default.collection.create({
            data: {
                amount: Math.floor(amountNum),
                cnumber: localNumber,
                msisdn: international,
                customerRef,
                note: note ? String(note).trim() : null,
                createdById: req.user.id,
            },
        });
        if (!(0, xentriPay_1.isConfigured)()) {
            await prisma_1.default.collection.update({
                where: { id: collection.id },
                data: { providerStatus: 'NOT_CONFIGURED' },
            });
            res.status(201).json({
                ...collection,
                providerConfigured: false,
                message: 'XENTRI PAY not configured — request saved as PENDING. Configure be/.env to initiate.',
            });
            return;
        }
        try {
            const resp = await (0, xentriPay_1.createCollection)({
                email: businessEmail(),
                cname: businessName(),
                amount: collection.amount,
                cnumber: collection.cnumber,
                msisdn: collection.msisdn,
                customerRef: collection.customerRef,
                currency: 'RWF',
                pmethod: 'momo',
                chargesIncluded: true,
            });
            const refid = resp?.refid || null;
            const providerStatus = refid
                ? (resp?.success === 1 ? 'PENDING' : String(resp?.reply || 'INITIATED'))
                : String(resp?.reply || 'INITIATED');
            const updated = await prisma_1.default.collection.update({
                where: { id: collection.id },
                data: { refid, providerStatus },
            });
            res.status(201).json({
                ...updated,
                providerConfigured: true,
                message: resp?.reply || 'Collection initiated — customer approves payment on 182*7*1#',
            });
        }
        catch (error) {
            console.error('Error initiating collection:', error);
            const saved = await prisma_1.default.collection.update({
                where: { id: collection.id },
                data: { providerStatus: 'COLLECTION_ERROR' },
            });
            res.status(201).json({
                ...saved,
                providerConfigured: true,
                message: 'Collection saved, but the gateway is unreachable — it will be retried. Check XENTRI connectivity.',
            });
        }
    }
    catch (error) {
        console.error('Error creating collection:', error);
        res.status(500).json({ error: 'Failed to create collection' });
    }
};
exports.createCollection = createCollection;
const getCollections = async (req, res) => {
    try {
        if (req.user.role !== 'ACCOUNTANT') {
            res.status(403).json({ error: 'Only accountants can view collections' });
            return;
        }
        const collections = await prisma_1.default.collection.findMany({
            where: { createdById: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(collections);
    }
    catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
};
exports.getCollections = getCollections;
const refreshCollectionFromProvider = async (collectionId) => {
    const collection = await prisma_1.default.collection.findUnique({ where: { id: collectionId } });
    if (!collection)
        return { status: 'NOT_FOUND' };
    if (!collection.refid)
        return { status: 'NO_REF' };
    if (!(0, xentriPay_1.isConfigured)())
        return { status: 'NOT_CONFIGURED' };
    const data = await (0, xentriPay_1.getCollectionStatus)(collection.refid);
    const providerStatus = String(data?.status || 'PENDING');
    const mapped = (0, xentriPay_1.mapCollectionStatus)(providerStatus);
    const rid = data?.rid || collection.refid;
    const updated = await prisma_1.default.collection.update({
        where: { id: collectionId },
        data: {
            providerStatus,
            status: mapped,
            ...(rid ? { refid: String(rid) } : {}),
        },
    });
    if (mapped === 'SUCCESSFUL') {
        await creditWalletFromCollection(collectionId);
    }
    return { status: mapped, collection: updated };
};
exports.refreshCollectionFromProvider = refreshCollectionFromProvider;
const refreshCollectionStatus = async (req, res) => {
    try {
        if (req.user.role !== 'ACCOUNTANT') {
            res.status(403).json({ error: 'Only accountants can refresh collection status' });
            return;
        }
        const id = String(req.params.id);
        const collection = await prisma_1.default.collection.findUnique({ where: { id } });
        if (!collection) {
            res.status(404).json({ error: 'Collection not found' });
            return;
        }
        if (collection.status === 'SUCCESSFUL') {
            res.json(collection);
            return;
        }
        if (!collection.refid) {
            res.status(400).json({ error: 'Collection has no provider reference yet — gateway was unreachable at initiation, retry initiation' });
            return;
        }
        const result = await (0, exports.refreshCollectionFromProvider)(id);
        if (result.status === 'NOT_CONFIGURED') {
            res.status(400).json({ error: 'XENTRI PAY not configured' });
            return;
        }
        res.json(result.collection);
    }
    catch (error) {
        console.error('Error refreshing collection status:', error);
        res.status(500).json({ error: 'Failed to refresh collection status' });
    }
};
exports.refreshCollectionStatus = refreshCollectionStatus;
