"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const payments_1 = __importDefault(require("./routes/payments"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const budgetItems_1 = __importDefault(require("./routes/budgetItems"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security middlewares
app.use((0, helmet_1.default)());
// Rate Limiting (e.g., 100 requests per 15 minutes)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/budget-items', budgetItems_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/', (req, res) => {
    res.send('Petty Cash API running');
});
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
});
