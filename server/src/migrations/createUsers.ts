import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email         TEXT UNIQUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Migration complete: users table created (or already exists).');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
