"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../generated/prisma/client");
const adapter_neon_1 = require("@prisma/adapter-neon");
require("dotenv/config");
const adapter = new adapter_neon_1.PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
