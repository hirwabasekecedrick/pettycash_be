"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const theme_1 = require("../controllers/theme");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', theme_1.getTheme);
router.put('/', auth_1.authenticateToken, auth_1.requireAccountant, theme_1.updateTheme);
exports.default = router;
