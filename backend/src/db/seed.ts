import { db, closeConnection } from './index';
import { users, departments } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Check if admin user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.whatsapp, '085754538366'));
    
    if (existingUser) {
      console.log('✅ Admin user already exists, skipping seed...');
      console.log('');
      console.log('========================================');
      console.log('🔐 LOGIN CREDENTIALS:');
      console.log('   Nomor Telepon: 085754538366');
      console.log('   Password: yunnifa12062003');
      console.log('========================================');
      await closeConnection();
      process.exit(0);
    }

    // Create default department first (ignore if exists)
    try {
      const [dept] = await db.insert(departments).values({
        name: 'IT Department',
        description: 'Information Technology Department',
      }).returning();
      console.log('✅ Department created:', dept.name);
    } catch (e) {
      console.log('ℹ️ Department already exists, skipping...');
    }

    // Create admin user
    // Password = nama depan (lowercase) + tanggal lahir (DDMMYYYY)
    // Contoh: yunnifa + 12062003 = yunnifa12062003
    const hashedPassword = await bcrypt.hash('yunnifa12062003', 10);
    
    const [admin] = await db.insert(users).values({
      username: 'yunnifa',
      password: hashedPassword,
      fullName: 'Yunnifa Nur Lailli',
      email: 'yunnifa@prm-imm.com',
      whatsapp: '085754538366',
      birthDate: '2003-06-12',
      department: 'IT Department',
      role: 'admin',
    }).returning();

    console.log('✅ Admin user created!');
    console.log('');
    console.log('========================================');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   Nomor Telepon: 085754538366');
    console.log('   Password: yunnifa12062003');
    console.log('========================================');
    console.log('');
    console.log('🎉 Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }

  await closeConnection();
  process.exit(0);
}

seed();
