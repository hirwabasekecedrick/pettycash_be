"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getDashboardStats = async (req, res) => {
    try {
        const { id, role } = req.user;
        const month = req.query.month;
        // Parse month filter boundaries in JS
        let startOfMonth = null;
        let endOfMonth = null;
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [yearStr, monthStr] = month.split('-');
            startOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
            endOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));
        }
        const inRange = (date) => {
            if (!startOfMonth || !endOfMonth)
                return true;
            const d = new Date(date);
            return d >= startOfMonth && d < endOfMonth;
        };
        let totalAssigned = 0;
        let totalSpent = 0;
        if (role === 'ACCOUNTANT') {
            const allAssignments = await prisma_1.default.petitCashAssignment.findMany({ select: { amount: true, createdAt: true } });
            const allPayments = await prisma_1.default.payment.findMany({ select: { amount: true, createdAt: true } });
            totalAssigned = allAssignments.filter(a => inRange(a.createdAt)).reduce((s, a) => s + a.amount, 0);
            totalSpent = allPayments.filter(p => inRange(p.createdAt)).reduce((s, p) => s + p.amount, 0);
        }
        else {
            const allAssignments = await prisma_1.default.petitCashAssignment.findMany({ where: { assignedToId: id }, select: { amount: true, createdAt: true } });
            const allPayments = await prisma_1.default.payment.findMany({ where: { employeeId: id }, select: { amount: true, createdAt: true } });
            totalAssigned = allAssignments.filter(a => inRange(a.createdAt)).reduce((s, a) => s + a.amount, 0);
            totalSpent = allPayments.filter(p => inRange(p.createdAt)).reduce((s, p) => s + p.amount, 0);
        }
        res.json({
            totalAssigned,
            totalSpent,
            remaining: totalAssigned - totalSpent
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
