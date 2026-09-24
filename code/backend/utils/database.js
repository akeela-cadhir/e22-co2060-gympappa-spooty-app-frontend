import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Prevent pg from parsing DATE columns into JS Date objects.
// By default, node-postgres converts DATE columns into JS Date objects
// using the server's LOCAL timezone, which shifts the day backward/forward
// when your server timezone isn't UTC (e.g. Sri Lanka UTC+5:30).
// Returning the raw 'YYYY-MM-DD' string avoids all of that entirely.
pkg.types.setTypeParser(1082, (val) => val); // 1082 = date OID

// Always use individual connection parameters, never connection string
/* 
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'gympappa_spooty',
  user: process.env.DB_USER || 'postgres',
  password: typeof process.env.DB_PASSWORD === 'string' ? process.env.DB_PASSWORD : '',
};
*/

// const isNeon = process.env.DB_HOST?.includes("neon.tech");

const useSSL =
  process.env.NODE_ENV === "production" ||
  process.env.DB_HOST?.includes("neon.tech");

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "gympappa_spooty",
  user: process.env.DB_USER || "postgres",
  password:
    typeof process.env.DB_PASSWORD === "string"
      ? process.env.DB_PASSWORD
      : "",

  ...(useSSL && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
};

console.log(`Connecting to database: ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const ensureEventSchema = async () => {
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule_photo TEXT;
    ALTER TABLE court_status ADD COLUMN IF NOT EXISTS event_id INT;
    ALTER TABLE court_status ADD COLUMN IF NOT EXISTS booking_start_date DATE;
    ALTER TABLE court_status ADD COLUMN IF NOT EXISTS booking_end_date DATE;
    ALTER TABLE court_status ADD COLUMN IF NOT EXISTS booking_start_time VARCHAR(20);
    ALTER TABLE court_status ADD COLUMN IF NOT EXISTS booking_end_time VARCHAR(20);
  `);
};

export default pool;