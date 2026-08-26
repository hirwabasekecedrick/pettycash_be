"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignments = exports.createAssignment = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createAssignment = async (req, res) => {
    try {
        const { amount, assignedToId, authorizedItems } = req.body;
        const assignedById = req.user.id; // from auth middleware
        const assignment = await prisma_1.default.petitCashAssignment.create({
            data: {
                amount: Number(amount),
                assignedToId: assignedToId,
                assignedById,
                authorizedItems: {
                    connectOrCreate: (authorizedItems || []).map(name => ({
                        where: { name },
                        create: { name }
                    }))
                }
            },
            include: {
                assignedTo: { select: { name: true, email: true } },
                authorizedItems: true
            }
        });
        res.status(201).json(assignment);
    }
    catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ error: 'Failed to assign cash' });
    }
};
exports.createAssignment = createAssignment;
const getAssignments = async (req, res) => {
    try {
        const { id, role } = req.user;
        // If accountant, view all. If employee, view own.
        const whereClause = role === 'ACCOUNTANT' ? {} : { assignedToId: id };
        const assignments = await prisma_1.default.petitCashAssignment.findMany({
            where: whereClause,
            include: {
                assignedTo: { select: { name: true, email: true } },
                assignedBy: { select: { name: true } },
                authorizedItems: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
};
exports.getAssignments = getAssignments;
