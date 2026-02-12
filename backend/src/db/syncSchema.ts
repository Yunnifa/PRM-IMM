import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Wait helper with retry logic
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute query with timeout
 */
async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry database connection with exponential backoff
 */
async function retryDatabaseConnection(maxRetries = 5): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await executeWithTimeout(
        db.execute(sql`SELECT 1`),
        10000,
        'Database ping'
      );
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const waitTime = Math.min(1000 * Math.pow(2, i), 5000); // Max 5 seconds
      console.log(`⏳ Connection attempt ${i + 1}/${maxRetries} failed: ${errorMsg}`);
      if (i < maxRetries - 1) {
        console.log(`   Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
      }
    }
  }
  return false;
}

/**
 * Auto-sync database schema on startup
 * This ensures all tables and columns exist
 */
export async function syncSchema(): Promise<void> {
  console.log('🔄 Auto-syncing database schema...');
  
  // Try to connect with retry logic
  const connected = await retryDatabaseConnection(5);
  if (!connected) {
    throw new Error('Failed to connect to database after 5 retries');
  }
  
  const operations = [
    { name: 'Create role enum', query: sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('admin', 'head_dept', 'ga', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    ` },
    { name: 'Add head_dept to role enum', query: sql`
      DO $$ BEGIN
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'head_dept';
      EXCEPTION
        WHEN others THEN null;
      END $$;
    ` },
    { name: 'Add ga to role enum', query: sql`
      DO $$ BEGIN
        ALTER TYPE role ADD VALUE IF NOT EXISTS 'ga';
      EXCEPTION
        WHEN others THEN null;
      END $$;
    ` },
    { name: 'Create approval_status enum', query: sql`
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    ` },
    { name: 'Create history_status enum', query: sql`
      DO $$ BEGIN
        CREATE TYPE history_status AS ENUM ('submitted', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    ` },
    { name: 'Create email_status enum', query: sql`
      DO $$ BEGIN
        CREATE TYPE email_status AS ENUM ('sent', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    ` },
  ];

  // Execute operations with timeout
  for (const op of operations) {
    try {
      await executeWithTimeout(db.execute(op.query), 5000, op.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  ${op.name} skipped: ${errorMsg}`);
    }
  }

  // Create tables (wrapped with timeout and error handling)
  const tableOperations = [
    { name: 'users table', query: sql`
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
        telegram_chat_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    ` },
    { name: 'departments table', query: sql`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    ` },
    { name: 'rooms table', query: sql`
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
    ` },
    { name: 'facilities table', query: sql`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    ` },
    { name: 'room_facilities table', query: sql`
      CREATE TABLE IF NOT EXISTS room_facilities (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    ` },
    { name: 'meeting_requests table', query: sql`
      CREATE TABLE IF NOT EXISTS meeting_requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL UNIQUE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    ` },
    { name: 'meeting_request_history table', query: sql`
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
    ` },
    { name: 'email_logs table', query: sql`
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
    ` },
    { name: 'api_logs table', query: sql`
      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(500) NOT NULL,
        status_code INTEGER NOT NULL,
        request_body TEXT,
        user_agent VARCHAR(500),
        ip_address VARCHAR(50),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        duration INTEGER NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    ` },
  ];

  for (const op of tableOperations) {
    try {
      await executeWithTimeout(db.execute(op.query), 10000, op.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  ${op.name} skipped: ${errorMsg}`);
    }
  }

  console.log('✅ Database schema sync completed!');
}
