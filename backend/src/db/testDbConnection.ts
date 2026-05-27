import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool(env.db);

export async function testDbConnection(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    console.log("Db connected");
  } catch {
    console.error("Db connection failed");
    process.exit(1);
  }
}
