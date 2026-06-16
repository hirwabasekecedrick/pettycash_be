"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const budgetItems_1 = require("../controllers/budgetItems");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', budgetItems_1.getBudgetItems);
exports.default = router;
