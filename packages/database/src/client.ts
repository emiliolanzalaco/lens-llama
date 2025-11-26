import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Lazy initialization function to avoid caching the connection
export function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is required');
  }
  const sql = neon(process.env.POSTGRES_URL);
  return drizzle(sql, { schema });
}

// Export a fresh instance each time for backwards compatibility
// This ensures we always read the latest POSTGRES_URL from environment
export const db = getDb();

export type Database = ReturnType<typeof getDb>;
