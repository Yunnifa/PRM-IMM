import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Auto-sync database schema on startup
 * This ensures all tables and columns exist
 */
export async function syncSchema(): Promise<void> {
  console.log('🔄 Auto-syncing database schema...');
  
  try {
    // Create/update role enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('admin', 'head_dept', 'ga', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new values to existing enum if they don't exist
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'head_dept';
      EXCEPTION
        WHEN others THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'ga';
      EXCEPTION
        WHEN others THEN null;
      END $$;
    `);

    // Update existing users with old roles to new roles
    await db.execute(sql`
      UPDATE users SET role = 'head_dept' WHERE role = 'head_ga';
    `).catch(() => {});
    
    await db.execute(sql`
      UPDATE users SET role = 'ga' WHERE role = 'head_os';
    `).catch(() => {});

    // Create approval_status enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create history_status enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE history_status AS ENUM ('submitted', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(20) NOT NULL UNIQUE,
        birth_date VARCHAR(10),
        department VARCHAR(100),
        role role NOT NULL DEFAULT 'user',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        capacity INTEGER NOT NULL,
        location VARCHAR(255),
        is_hybrid INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS room_facilities (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meeting_requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nama VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(20) NOT NULL,
        department VARCHAR(100) NOT NULL,
        tanggal VARCHAR(10) NOT NULL,
        hari VARCHAR(20) NOT NULL,
        jam_mulai VARCHAR(5) NOT NULL,
        jam_berakhir VARCHAR(5) NOT NULL,
        jumlah_peserta INTEGER NOT NULL,
        agenda TEXT NOT NULL,
        nama_ruangan VARCHAR(100) NOT NULL,
        fasilitas TEXT NOT NULL,
        head_ga approval_status NOT NULL DEFAULT 'pending',
        head_os approval_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meeting_request_history (
        id SERIAL PRIMARY KEY,
        meeting_request_id INTEGER NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        action VARCHAR(255) NOT NULL,
        by VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(20),
        status history_status NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create email_status enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE email_status AS ENUM ('sent', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create email_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        to_email VARCHAR(255) NOT NULL,
        to_name VARCHAR(255),
        subject VARCHAR(500) NOT NULL,
        email_type VARCHAR(50) NOT NULL,
        meeting_request_id INTEGER REFERENCES meeting_requests(id) ON DELETE SET NULL,
        status email_status NOT NULL,
        message_id VARCHAR(255),
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Add missing columns to existing tables (safe migration)
    const alterStatements = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date VARCHAR(10)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1`,
      `ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_hybrid INTEGER DEFAULT 0`,
      // Make user_id nullable for guest users
      `ALTER TABLE meeting_requests ALTER COLUMN user_id DROP NOT NULL`,
    ];

    for (const stmt of alterStatements) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (e) {
        // Column might already exist, ignore error
      }
    }

    console.log('✅ Database schema synced successfully!');
  } catch (error) {
    console.error('⚠️ Schema sync warning (non-fatal):', error);
    // Don't throw - let the app continue even if sync fails
  }
}
