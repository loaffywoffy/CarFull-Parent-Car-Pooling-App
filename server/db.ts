import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("\nError: DATABASE_URL environment variable is not set");
  console.error("Please set the DATABASE_URL secret in your deployment configuration");
  process.exit(1);
}

let pool: Pool;

try {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });
  
  // Verify connection
  await pool.connect();
  console.log("Successfully connected to database");
} catch (error) {
  console.error("\nFailed to connect to database:", error);
  console.error("Please verify your DATABASE_URL is correct");
  process.exit(1);
}

export { pool };
export const db = drizzle({ client: pool, schema });
