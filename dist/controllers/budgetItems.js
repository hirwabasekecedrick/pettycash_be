"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetItems = void 0;
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
