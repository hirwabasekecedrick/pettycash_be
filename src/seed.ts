import prisma from './utils/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const accountantPassword = await bcrypt.hash('admin123', 10);
  const employeePassword = await bcrypt.hash('employee123', 10);

  // Seed default TENANT
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Testing Organization',
    },
  });

  // Seed default THEME
  const theme = await prisma.theme.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      primaryColor: '#00AF54',
      secondaryColor: '#007CBE',
      accentColor: '#00AF54',
      backgroundColor: '#ffffff',
      textColor: '#020617',
      successColor: '#22c55e',
      warningColor: '#eab308',
      errorColor: '#ef4444',
    },
  });

  // Seed ACCOUNTANT user
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@pettycash.com' },
    update: {},
    create: {
      email: 'accountant@pettycash.com',
      name: 'System Accountant',
      password: accountantPassword,
      role: 'ACCOUNTANT',
      phone: '0780000001',
      department: 'Finance',
      tenantId: tenant.id,
    },
  });

  // Seed EMPLOYEE user
  const employee = await prisma.user.upsert({
    where: { email: 'employee@pettycash.com' },
    update: {},
    create: {
      email: 'employee@pettycash.com',
      name: 'John Employee',
      password: employeePassword,
      role: 'EMPLOYEE',
      phone: '0780000002',
      department: 'Operations',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Seeded Tenant:', tenant.name);
  console.log('✅ Seeded Theme for Tenant:', tenant.name);
  console.log('✅ Seeded users:');
  console.log('  ACCOUNTANT →', accountant.email, '| password: admin123');
  console.log('  EMPLOYEE   →', employee.email, '| password: employee123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
