"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTheme = exports.getTheme = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getTheme = async (req, res) => {
    try {
        let tenantId;
        const userId = req.user?.id;
        if (userId) {
            const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
            tenantId = user?.tenantId;
        }
        if (!tenantId) {
            const firstTenant = await prisma_1.default.tenant.findFirst();
            if (firstTenant) {
                tenantId = firstTenant.id;
            }
            else {
                res.json(null);
                return;
            }
        }
        const theme = await prisma_1.default.theme.findUnique({
            where: { tenantId }
        });
        res.json(theme);
    }
    catch (error) {
        console.error('Get theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTheme = getTheme;
const updateTheme = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        if (!tenantId) {
            const firstTenant = await prisma_1.default.tenant.findFirst();
            if (!firstTenant) {
                res.status(400).json({ error: 'No tenant found.' });
                return;
            }
            tenantId = firstTenant.id;
        }
        const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, successColor, warningColor, errorColor } = req.body;
        const theme = await prisma_1.default.theme.upsert({
            where: { tenantId },
            update: {
                primaryColor,
                secondaryColor,
                accentColor,
                backgroundColor,
                textColor,
                successColor,
                warningColor,
                errorColor
            },
            create: {
                tenantId,
                primaryColor,
                secondaryColor,
                accentColor,
                backgroundColor,
                textColor,
                successColor,
                warningColor,
                errorColor
            }
        });
        res.json(theme);
    }
    catch (error) {
        console.error('Update theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateTheme = updateTheme;
