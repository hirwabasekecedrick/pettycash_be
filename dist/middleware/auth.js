"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAccountant = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token missing' });
        return;
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) {
            res.status(403).json({ error: 'Invalid token' });
            return;
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
const requireAccountant = (req, res, next) => {
    if (req.user?.role !== 'ACCOUNTANT') {
        res.status(403).json({ error: 'Access denied. Accountant role required.' });
        return;
    }
    next();
};
exports.requireAccountant = requireAccountant;
