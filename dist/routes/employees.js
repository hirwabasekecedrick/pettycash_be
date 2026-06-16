"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employees_1 = require("../controllers/employees");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Only accountants can manage employees
router.use(auth_1.authenticateToken, auth_1.requireAccountant);
router.get('/', employees_1.getEmployees);
router.post('/', employees_1.createEmployee);
router.put('/:id', employees_1.updateEmployee);
router.delete('/:id', employees_1.deleteEmployee);
exports.default = router;
