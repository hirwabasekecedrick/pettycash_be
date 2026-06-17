"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayments = exports.submitPayment = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
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
        const images = files ? files.map(file => `/uploads/${file.filename}`) : [];
        const paymentAmount = Number(amount);
        // Get the specific assignment to check balance
        const assignment = await prisma_1.default.petitCashAssignment.findUnique({
            where: { id: Number(assignmentId) }
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
        res.status(201).json(payment);
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
        const whereClause = role === 'ACCOUNTANT' ? {} : { employeeId: id };
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [yearStr, monthStr] = month.split('-');
            const startOfMonth = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            const endOfMonth = new Date(Number(yearStr), Number(monthStr), 1);
            whereClause.createdAt = {
                gte: startOfMonth,
                lt: endOfMonth
            };
        }
        const payments = await prisma_1.default.payment.findMany({
            where: whereClause,
            include: {
                employee: { select: { name: true, email: true, department: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    }
    catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};
exports.getPayments = getPayments;
