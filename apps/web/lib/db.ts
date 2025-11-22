import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@eth-global/database';

const connectionString = process.env.DATABASE_URL || '';

// Create postgres connection
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

export * from '@eth-global/database';
