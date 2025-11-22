import { drizzle } from 'drizzle-orm/neon-http';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import * as schema from './schema';

// Lazy-load database connection to avoid errors during build time
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: NeonQueryFunction<false, false> | null = null;

function getDb() {
  if (!_db) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error(
        'No database connection string was provided. Set POSTGRES_URL environment variable.'
      );
    }
    _sql = neon(connectionString);
    _db = drizzle(_sql, { schema });
  }
  return _db;
}

// Export a proxy that lazily initializes the database on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;
