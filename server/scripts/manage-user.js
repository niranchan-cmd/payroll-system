/**
 * Script to Add or Update User Credentials
 *
 * Usage:
 *   node scripts/manage-user.js <email> <password> [name] [role]
 *
 * Example:
 *   node scripts/manage-user.js niranchan@company.com MySecurePass123 "Niranchan" SUPER_ADMIN
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage:
  node scripts/manage-user.js <email> <password> [name] [role]

Arguments:
  email     - User email (e.g. niranchan@company.com)
  password  - Password (minimum 6 characters)
  name      - (Optional) Full name (default: Admin)
  role      - (Optional) SUPER_ADMIN, ADMIN, HR, VIEWER (default: SUPER_ADMIN)

Example:
  node scripts/manage-user.js myemail@gmail.com Secret123 "Niranchan" SUPER_ADMIN
`);
    process.exit(1);
  }

  const [email, password, name = 'Admin', role = 'SUPER_ADMIN'] = args;

  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'VIEWER'];
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: userEmail } });

  if (existing) {
    // Update existing user password / name
    const updated = await prisma.user.update({
      where: { email: userEmail },
      data: {
        password: hashedPassword,
        name: name || existing.name,
        role: role || existing.role,
        is_active: true,
      },
    });
    console.log(`\n✅ Successfully UPDATED credentials for: ${updated.email}`);
    console.log(`   Name : ${updated.name}`);
    console.log(`   Role : ${updated.role}\n`);
  } else {
    // Create new user
    const created = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        name: name,
        role: role,
        is_active: true,
      },
    });
    console.log(`\n✅ Successfully CREATED new user: ${created.email}`);
    console.log(`   Name : ${created.name}`);
    console.log(`   Role : ${created.role}\n`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
