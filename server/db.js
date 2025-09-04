import pkg from "pg";
const { Pool } = pkg;
import { DATABASE_URL } from "./config.js";

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: false
});

export async function query(sql, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}
