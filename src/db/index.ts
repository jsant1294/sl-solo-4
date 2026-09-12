import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Real DB client (used once DATABASE_URL is set). The shell currently reads
 * from src/db/demo.ts; swap page getters to these queries to go live.
 */
const url = process.env.DATABASE_URL;
export const sql = url ? postgres(url, { prepare: false }) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
