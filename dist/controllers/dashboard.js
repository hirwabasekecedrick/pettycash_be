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
        let dateFilter = {};
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [yearStr, monthStr] = month.split('-');
            const startOfMonth = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            const endOfMonth = new Date(Number(yearStr), Number(monthStr), 1);
            dateFilter = {
                createdAt: {
                    gte: startOfMonth,
                    lt: endOfMonth
                }
            };
        }
        let totalAssigned = 0;
        let totalSpent = 0;
        if (role === 'ACCOUNTANT') {
            const assignments = await prisma_1.default.petitCashAssignment.aggregate({
                where: dateFilter,
                _sum: { amount: true }
            });
            const payments = await prisma_1.default.payment.aggregate({
                where: dateFilter,
                _sum: { amount: true }
            });
            totalAssigned = assignments._sum.amount || 0;
            totalSpent = payments._sum.amount || 0;
        }
        else {
            const assignments = await prisma_1.default.petitCashAssignment.aggregate({
                where: { assignedToId: id, ...dateFilter },
                _sum: { amount: true }
            });
            const payments = await prisma_1.default.payment.aggregate({
                where: { employeeId: id, ...dateFilter },
                _sum: { amount: true }
            });
            totalAssigned = assignments._sum.amount || 0;
            totalSpent = payments._sum.amount || 0;
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
