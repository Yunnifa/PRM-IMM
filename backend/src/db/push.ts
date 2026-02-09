import { db, closeConnection } from './index';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

async function push() {
  console.log('🔄 Pushing database schema...');
  
  try {
    // Create enums if they don't exist
    // Note: New role enum is ['admin', 'head', 'ga', 'user']
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('admin', 'head', 'ga', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Migrate existing role values if old enum exists
    console.log('🔧 Checking for role migration...');
    await db.execute(sql`
      DO $$ BEGIN
        -- Add new values to existing enum if they don't exist
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'head';
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'ga';
      EXCEPTION
        WHEN others THEN null;
      END $$;
    `);

    // Update existing users with old roles to new roles
    await db.execute(sql`
      UPDATE users SET role = 'head' WHERE role = 'head_ga' OR role = 'head_os';
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE history_status AS ENUM ('submitted', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(20),
        department VARCHAR(100),
        role role NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
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
        head_dept approval_status NOT NULL DEFAULT 'pending',
        ga approval_status NOT NULL DEFAULT 'pending',
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

    // Add missing columns to existing tables
    console.log('🔧 Adding missing columns...');
    
    // Add birth_date to users if not exists
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN birth_date VARCHAR(10);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add is_active to users if not exists
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Make whatsapp NOT NULL and UNIQUE (if it's not already)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE users ALTER COLUMN whatsapp SET NOT NULL;
      EXCEPTION
        WHEN others THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT users_whatsapp_unique UNIQUE (whatsapp);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add is_active to departments if not exists
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE departments ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add is_hybrid to rooms if not exists
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN is_hybrid INTEGER NOT NULL DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Migration: Rename head_ga to head_dept and head_os to ga if old columns exist
    console.log('🔧 Migrating meeting_requests columns...');
    await db.execute(sql`
      DO $$ BEGIN
        -- Rename head_ga to head_dept if exists
        ALTER TABLE meeting_requests RENAME COLUMN head_ga TO head_dept;
      EXCEPTION
        WHEN undefined_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        -- Rename head_os to ga if exists
        ALTER TABLE meeting_requests RENAME COLUMN head_os TO ga;
      EXCEPTION
        WHEN undefined_column THEN null;
      END $$;
    `);

    // Add new columns if they don't exist (for fresh installations)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE meeting_requests ADD COLUMN head_dept approval_status NOT NULL DEFAULT 'pending';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE meeting_requests ADD COLUMN ga approval_status NOT NULL DEFAULT 'pending';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    console.log('✅ Database schema pushed successfully!');
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    await closeConnection();
    process.exit(1);
  }
}

push();
