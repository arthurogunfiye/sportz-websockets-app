import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env file');
}

const readInt = (envVar, defaultValue) => {
  const value = process.env[envVar];
  if (value == null || value === '') return defaultValue;
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(
      `Invalid value for ${envVar}: ${value}. Must be a non-negative integer.`
    );
  }
  return parsedValue;
};

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: readInt(process.env.PGPOOL_MAX, 10),
  idleTimeoutMillis: readInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30000),
  connectionTimeoutMillis: readInt(
    process.env.PGPOOL_CONNECTION_TIMEOUT_MS,
    5000
  )
});

export const db = drizzle(pool, { schema });
