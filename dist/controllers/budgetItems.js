"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBudgetItem = exports.getBudgetItems = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getBudgetItems = async (req, res) => {
    try {
        const budgetItems = await prisma_1.default.budgetItem.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(budgetItems);
    }
    catch (error) {
        console.error('Error fetching budget items:', error);
        res.status(500).json({ error: 'Failed to fetch budget items' });
    }
};
exports.getBudgetItems = getBudgetItems;
const createBudgetItem = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            res.status(400).json({ error: 'Budget item name is required' });
            return;
        }
        const trimmed = String(name).trim();
        const existing = await prisma_1.default.budgetItem.findUnique({ where: { name: trimmed } });
        if (existing) {
            res.status(400).json({ error: 'Budget item already exists' });
            return;
        }
        const item = await prisma_1.default.budgetItem.create({ data: { name: trimmed } });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Error creating budget item:', error);
        res.status(500).json({ error: 'Failed to create budget item' });
    }
};
exports.createBudgetItem = createBudgetItem;
