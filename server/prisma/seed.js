/**
 * Prisma seed script.
 * Creates the default Super Admin user.
 *
 * Run: node prisma/seed.js
 * Or:  npm run db:seed
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@payroll.com' },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@payroll.com',
        password: hashed,
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`✅ Created Super Admin: ${admin.email}`);
  } else {
    console.log('ℹ️  Super Admin already exists, skipping.');
  }

  console.log('\n✅ Seeding complete!');
  console.log('   Email    : admin@payroll.com');
  console.log('   Password : Admin@123');
  console.log('   ⚠️  Change this password in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
