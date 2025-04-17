import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("Database connection error: DATABASE_URL environment variable is not set");
  process.exit(1);
}

let pool: Pool;

try {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} catch (error) {
  console.error("Failed to connect to database:", error);
  process.exit(1);
}

export { pool };
export const db = drizzle({ client: pool, schema });
