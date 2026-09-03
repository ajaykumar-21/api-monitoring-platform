import { Pool, Client } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/api_sentinel';

const isCloudDb =
  connectionString.includes('neon.tech') ||
  connectionString.includes('render.com') ||
  connectionString.includes('supabase.co') ||
  connectionString.includes('sslmode=require');

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: isCloudDb ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

export async function initDb() {
  if (!isCloudDb) {
    try {
      const url = new URL(connectionString);
      const dbName = url.pathname.replace('/', '') || 'api_sentinel';
      const baseUrl = connectionString.replace(url.pathname, '/postgres');

      const rootClient = new Client({ connectionString: baseUrl });
      await rootClient.connect();

      const checkDbRes = await rootClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (checkDbRes.rows.length === 0) {
        console.log(`📦 Database "${dbName}" not found. Creating database automatically...`);
        try {
          await rootClient.query(`CREATE DATABASE "${dbName}"`);
        } catch {
          await rootClient.query(`CREATE DATABASE "${dbName}" TEMPLATE template0`);
        }
        console.log(`✅ Database "${dbName}" created!`);
      }
      await rootClient.end();
    } catch {
      // Continue
    }
  }

  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      method VARCHAR(20) DEFAULT 'GET',
      interval_sec INT DEFAULT 60,
      expected_status INT DEFAULT 200,
      timeout_ms INT DEFAULT 10000,
      headers TEXT,
      body TEXT,
      assertions TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      current_status VARCHAR(50) DEFAULT 'UP',
      consecutive_failures INT DEFAULT 0,
      failure_threshold INT DEFAULT 2,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ping_logs (
      id VARCHAR(255) PRIMARY KEY,
      monitor_id VARCHAR(255) NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status_code INT,
      response_time INT NOT NULL,
      is_success BOOLEAN NOT NULL,
      error_message TEXT,
      tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id VARCHAR(255) PRIMARY KEY,
      monitor_id VARCHAR(255) NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'OPEN',
      started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE,
      cause TEXT
    );

    CREATE TABLE IF NOT EXISTS alert_channels (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      target TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS status_pages (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      is_public BOOLEAN DEFAULT TRUE,
      monitors TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
    CREATE INDEX IF NOT EXISTS idx_ping_logs_monitor_id ON ping_logs(monitor_id, tested_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id);
  `;

  await query(createTablesSQL);
  console.log('✅ PostgreSQL database tables and indexes initialized!');
}
