"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignments_1 = require("../controllers/assignments");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Both can view (Accountants see all, Employees see their own)
router.get('/', assignments_1.getAssignments);
// Only accountants can assign cash
router.post('/', auth_1.requireAccountant, assignments_1.createAssignment);
exports.default = router;
