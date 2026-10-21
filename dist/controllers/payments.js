"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshPaymentStatus = exports.triggerPayout = exports.getPaymentById = exports.getPayments = exports.submitPayment = void 0;
exports.refreshPaymentFromProvider = refreshPaymentFromProvider;
const prisma_1 = __importDefault(require("../utils/prisma"));
const xentriPay_1 = require("../services/xentriPay");
async function getDefaultWallet() {
    let wallet = await prisma_1.default.wallet.findFirst();
    if (!wallet) {
        wallet = await prisma_1.default.wallet.create({ data: {} });
    }
    return wallet;
}
function generateCustomerRef() {
    return `PC-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}
async function hasDebitForPayment(paymentId) {
    const count = await prisma_1.default.walletTransaction.count({
        where: { paymentId, type: 'DEBIT' }
    });
    return count > 0;
}
async function debitWallet(paymentId, amount, options = {}) {
    if (await hasDebitForPayment(paymentId))
        return; // idempotent — don't double-debit
    const wallet = await getDefaultWallet();
    await prisma_1.default.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount }, updatedAt: new Date() }
    });
    await prisma_1.default.walletTransaction.create({
        data: {
            type: 'DEBIT',
            amount,
            description: options.description || 'Payment',
            reference: options.reference,
            paymentId,
            walletId: wallet.id,
        }
    });
}
async function processPayout(paymentId) {
    const payment = await prisma_1.default.payment.findUnique({ where: { id: paymentId } });
    if (!payment)
        return { payoutStarted: false, reason: 'not_found' };
    if (payment.status === 'SUCCESSFUL')
        return { payoutStarted: false, reason: 'already_paid' };
    if (payment.status === 'PROCESSING')
        return { payoutStarted: false, reason: 'in_progress' };
    // Always use a fresh reference so retries never collide with a unique customerReference.
    const customerRef = generateCustomerRef();
    await prisma_1.default.payment.update({
        where: { id: paymentId },
        data: { status: 'PROCESSING', customerRef }
    });
    if (!(0, xentriPay_1.isConfigured)()) {
        await prisma_1.default.payment.update({
            where: { id: paymentId },
            data: { status: 'PENDING', customerRef, providerStatus: 'NOT_CONFIGURED' }
        });
        return { payoutStarted: false, reason: 'not_configured' };
    }
    try {
        const resp = await (0, xentriPay_1.createPaymentRequest)({
            customerReference: customerRef,
            msisdn: payment.vendorNumber,
            name: payment.reason || 'PettyCash payment',
            transactionType: 'PAYOUT',
            currency: 'RWF',
            amount: payment.amount,
        });
        // XentriPay returns the payout as PENDING initially; it is finalised asynchronously.
        const providerStatus = String(resp?.status || resp?.statusMessage || 'PENDING');
        const providerRef = resp?.internalRef || (resp?.id != null ? String(resp.id) : resp?.reference || null);
        const status = (0, xentriPay_1.mapProviderStatus)(providerStatus);
        await prisma_1.default.payment.update({
            where: { id: paymentId },
            data: {
                status,
                customerRef,
                providerRef,
                providerStatus,
            }
        });
        if (status === 'SUCCESSFUL') {
            await debitWallet(payment.id, payment.amount, {
                description: `Payment to ${payment.vendorNumber}`,
                reference: customerRef,
            });
        }
        return { payoutStarted: true, status };
    }
    catch (error) {
        console.error('Error processing payout:', error);
        await prisma_1.default.payment.update({
            where: { id: paymentId },
            data: { status: 'FAILED', customerRef, providerStatus: 'PAYOUT_ERROR' }
        });
        return { payoutStarted: false, reason: 'provider_error' };
    }
}
/**
 * Polls XentriPay for the latest status of a PROCESSING payout and (when
 * finally successful) debits the organisation wallet exactly once.
 * Used by both the manual refresh endpoint and the background poller.
 */
async function refreshPaymentFromProvider(paymentId) {
    const payment = await prisma_1.default.payment.findUnique({ where: { id: paymentId } });
    if (!payment)
        return { status: 'NOT_FOUND' };
    if (!payment.customerRef)
        return { status: 'NO_REF' };
    if (!(0, xentriPay_1.isConfigured)())
        return { status: 'NOT_CONFIGURED' };
    const data = await (0, xentriPay_1.getPaymentStatus)(payment.customerRef);
    // Response shape: { timestamp, message, data: { status, reference_number, amount } }
    const inner = data?.data || data;
    const providerStatus = String(inner?.status || 'UNKNOWN');
    const mapped = (0, xentriPay_1.mapProviderStatus)(providerStatus);
    const externalRef = inner?.reference_number || inner?.reference || null;
    const updated = await prisma_1.default.payment.update({
        where: { id: paymentId },
        data: {
            providerStatus,
            status: mapped,
            ...(externalRef ? { providerRef: String(externalRef) } : {}),
        },
    });
    if (mapped === 'SUCCESSFUL') {
        await debitWallet(updated.id, updated.amount, {
            description: `Payment to ${updated.vendorNumber}`,
            reference: updated.customerRef || undefined,
        });
    }
    return { status: mapped, payment: updated };
}
const submitPayment = async (req, res) => {
    try {
        const { vendorNumber, amount, reason, assignmentId, budgetItemName } = req.body;
        const employeeId = req.user.id;
        const idempotencyKey = req.header('Idempotency-Key');
        if (idempotencyKey) {
            const existingPayment = await prisma_1.default.payment.findUnique({
                where: { idempotencyKey }
            });
            if (existingPayment) {
                res.status(200).json(existingPayment);
                return;
            }
        }
        if (!assignmentId) {
            res.status(400).json({ error: 'assignmentId is required' });
            return;
        }
        const files = req.files;
        const images = files ? files.map((file) => `/uploads/${file.filename}`) : [];
        const paymentAmount = Number(amount);
        // Get the specific assignment to check balance
        const assignment = await prisma_1.default.petitCashAssignment.findUnique({
            where: { id: assignmentId }
        });
        if (!assignment || assignment.assignedToId !== employeeId) {
            res.status(403).json({ error: 'Invalid or unauthorized assignment' });
            return;
        }
        const existingPayments = await prisma_1.default.payment.aggregate({
            where: { assignmentId: assignment.id },
            _sum: { amount: true }
        });
        const totalSpent = existingPayments._sum?.amount || 0;
        if (assignment.amount - totalSpent < paymentAmount) {
            res.status(400).json({ error: 'Insufficient balance in this allocation to make the payment.' });
            return;
        }
        let budgetItemId;
        if (budgetItemName && budgetItemName.trim() !== '') {
            const bItem = await prisma_1.default.budgetItem.upsert({
                where: { name: budgetItemName.trim() },
                update: {},
                create: { name: budgetItemName.trim() }
            });
            budgetItemId = bItem.id;
        }
        const paymentData = {
            vendorNumber,
            amount: paymentAmount,
            reason: reason || "",
            images,
            idempotencyKey,
            employeeId,
            assignmentId: assignment.id,
            ...(budgetItemId ? { budgetItemId } : {})
        };
        const payment = await prisma_1.default.payment.create({
            data: paymentData,
            include: {
                employee: { select: { name: true, email: true } },
                assignment: true,
                budgetItem: true
            }
        });
        // Decide payout behaviour based on the organisation's wallet setting
        const wallet = await getDefaultWallet();
        if (wallet.payoutMode === 'AUTO') {
            await processPayout(payment.id);
        }
        const updated = await prisma_1.default.payment.findUnique({
            where: { id: payment.id },
            include: {
                employee: { select: { name: true, email: true } },
                assignment: true,
                budgetItem: true
            }
        });
        res.status(201).json(updated);
    }
    catch (error) {
        console.error('Error submitting payment:', error);
        res.status(500).json({ error: 'Failed to submit payment' });
    }
};
exports.submitPayment = submitPayment;
const getPayments = async (req, res) => {
    try {
        const { id, role } = req.user;
        const month = req.query.month;
        const whereClause = role === 'ACCOUNTANT'
            ? {}
            : { employeeId: id };
        let payments = await prisma_1.default.payment.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: {
                        name: true,
                        email: true,
                        department: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // Filter by month
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            payments = payments.filter((payment) => {
                const paymentMonth = new Date(payment.createdAt)
                    .toISOString()
                    .slice(0, 7);
                return paymentMonth === month;
            });
        }
        res.json(payments);
    }
    catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};
exports.getPayments = getPayments;
const getPaymentById = async (req, res) => {
    try {
        const { id: roleId, role } = req.user;
        const paymentId = String(req.params.id);
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: {
                employee: { select: { name: true, email: true, department: true } },
                assignment: true,
                budgetItem: true,
            }
        });
        if (!payment) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }
        if (role !== 'ACCOUNTANT' && payment.employeeId !== roleId) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        res.json(payment);
    }
    catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
};
exports.getPaymentById = getPaymentById;
const triggerPayout = async (req, res) => {
    try {
        if (req.user.role !== 'ACCOUNTANT') {
            res.status(403).json({ error: 'Only accountants can trigger payouts' });
            return;
        }
        const id = String(req.params.id);
        const result = await processPayout(id);
        if (!result.payoutStarted) {
            const message = result.reason === 'not_configured'
                ? 'Payout pending — XENTRI PAY is not configured'
                : result.reason === 'already_paid'
                    ? 'This payment has already been paid'
                    : result.reason === 'in_progress'
                        ? 'This payout is still processing — check its status'
                        : result.reason === 'provider_error'
                            ? 'The payout provider returned an error. A new attempt will use a fresh reference.'
                            : 'Payout could not be started';
            res.status(400).json({ error: message });
            return;
        }
        const updated = await prisma_1.default.payment.findUnique({
            where: { id },
            include: {
                employee: { select: { name: true, email: true, department: true } },
                assignment: true,
                budgetItem: true,
            }
        });
        res.json({ ...updated, payoutStarted: true });
    }
    catch (error) {
        console.error('Error triggering payout:', error);
        res.status(500).json({ error: 'Failed to trigger payout' });
    }
};
exports.triggerPayout = triggerPayout;
const refreshPaymentStatus = async (req, res) => {
    try {
        if (req.user.role !== 'ACCOUNTANT') {
            res.status(403).json({ error: 'Only accountants can refresh payment status' });
            return;
        }
        const id = String(req.params.id);
        const payment = await prisma_1.default.payment.findUnique({ where: { id } });
        if (!payment) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }
        if (payment.status === 'FAILED' || payment.status === 'PENDING') {
            res.status(400).json({ error: 'No provider transaction in flight — use Send Payout to (re)initiate' });
            return;
        }
        const result = await refreshPaymentFromProvider(id);
        if (result.status === 'NOT_CONFIGURED') {
            res.status(400).json({ error: 'XENTRI PAY not configured' });
            return;
        }
        res.json(result.payment);
    }
    catch (error) {
        console.error('Error refreshing payment status:', error);
        res.status(500).json({ error: 'Failed to refresh payment status' });
    }
};
exports.refreshPaymentStatus = refreshPaymentStatus;
