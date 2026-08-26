"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const mailer_1 = require("../utils/mailer");
const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
function generatePassword(length = 12) {
    const bytes = crypto_1.default.randomBytes(length);
    return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join('');
}
const getEmployees = async (req, res) => {
    try {
        const employees = await prisma_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                department: true,
                role: true,
                createdAt: true,
            },
        });
        res.json(employees);
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};
exports.getEmployees = getEmployees;
const createEmployee = async (req, res) => {
    try {
        const { name, email, phone, department, role } = req.body;
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }
        const plainPassword = generatePassword();
        const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 10);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                department,
                role: role || 'EMPLOYEE',
            },
            select: { id: true, name: true, email: true, role: true }
        });
        // Send the password via email asynchronously
        (0, mailer_1.sendPasswordEmail)(email, name, plainPassword);
        res.status(201).json({ ...user, generatedPassword: plainPassword });
    }
    catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, department, role, generateNewPassword } = req.body;
        let updateData = { name, email, phone, department, role };
        let generatedPassword;
        if (generateNewPassword) {
            generatedPassword = generatePassword();
            updateData.password = await bcryptjs_1.default.hash(generatedPassword, 10);
        }
        const user = await prisma_1.default.user.update({
            where: { id: String(id) },
            data: updateData,
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(generatedPassword ? { ...user, generatedPassword } : user);
    }
    catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.user.delete({ where: { id: String(id) } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
};
exports.deleteEmployee = deleteEmployee;
