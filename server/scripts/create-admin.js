// One-off CLI bootstrap for the first admin account, since a brand-new install has no
// admins yet to use the /manage/users page. Not exposed over HTTP.
//
// Usage: node scripts/create-admin.js <username> <password>
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../lib/db');

async function main() {
  const [, , rawUsername, password] = process.argv;
  const username = (rawUsername || '').trim().toLowerCase();
  if (!username || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`Username "${username}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, passwordHash, isActive: true, isApproved: true, isAdmin: true },
  });
  console.log(`Created admin "${user.username}" (id ${user.id}).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
