import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env file');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PGPOOL_MAX, 10) || 10,
  idleTimeoutMillis: parseInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 10) || 30000,
  connectionTimeoutMillis:
    parseInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 10) || 5000
});

export const db = drizzle(pool, { schema });
