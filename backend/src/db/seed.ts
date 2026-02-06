import { db } from './index';
import { users, departments } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create default department first
    const [dept] = await db.insert(departments).values({
      name: 'IT Department',
      description: 'Information Technology Department',
    }).returning();

    console.log('✅ Department created:', dept.name);

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const [admin] = await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      email: 'admin@prm-imm.com',
      role: 'admin',
      departmentId: dept.id,
    }).returning();

    console.log('✅ Admin user created!');
    console.log('');
    console.log('========================================');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('========================================');
    console.log('');
    console.log('🎉 Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }

  process.exit(0);
}

seed();
