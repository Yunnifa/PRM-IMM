import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

console.log('📊 Connecting to database...');
if (connectionString.includes('railway.internal')) {
  console.log('⚠️  Using Railway Private Network - ensure Private Networking is enabled!');
} else if (connectionString.includes('railway.app') || connectionString.includes('.rlwy.net')) {
  console.log('✅ Using Railway Public URL');
}

// Postgres connection options - optimized for Railway
const connectionOptions = {
  connect_timeout: 15, // 15 seconds timeout
  idle_timeout: 30, // Keep idle connections for 30s
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
  max: 10, // connection pool size
  onnotice: () => {}, // Suppress notices
  fetch_types: false, // Disable type fetching for faster connection
};

// For query purposes
const queryClient = postgres(connectionString, connectionOptions);
export const db = drizzle(queryClient, { schema });

// For migrations
const migrationClient = postgres(connectionString, { ...connectionOptions, max: 1 });
export const migrationDb = drizzle(migrationClient, { schema });

// Export untuk close connection
export const closeConnection = async () => {
  await queryClient.end();
  await migrationClient.end();
};