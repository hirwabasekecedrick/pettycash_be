"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./utils/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const accountantPassword = await bcryptjs_1.default.hash('admin123', 10);
    const employeePassword = await bcryptjs_1.default.hash('employee123', 10);
    // Seed ACCOUNTANT user
    const accountant = await prisma_1.default.user.upsert({
        where: { email: 'accountant@pettycash.com' },
        update: {},
        create: {
            email: 'accountant@pettycash.com',
            name: 'System Accountant',
            password: accountantPassword,
            role: 'ACCOUNTANT',
            phone: '0780000001',
            department: 'Finance',
        },
    });
    // Seed EMPLOYEE user
    const employee = await prisma_1.default.user.upsert({
        where: { email: 'employee@pettycash.com' },
        update: {},
        create: {
            email: 'employee@pettycash.com',
            name: 'John Employee',
            password: employeePassword,
            role: 'EMPLOYEE',
            phone: '0780000002',
            department: 'Operations',
        },
    });
    console.log('✅ Seeded users:');
    console.log('  ACCOUNTANT →', accountant.email, '| password: admin123');
    console.log('  EMPLOYEE   →', employee.email, '| password: employee123');
}
main()
    .then(async () => {
    await prisma_1.default.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma_1.default.$disconnect();
    process.exit(1);
});
