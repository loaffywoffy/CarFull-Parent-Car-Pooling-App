import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;

const initializePool = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    max: 20,
    idleTimeoutMillis: 30000,
    retryDelay: 1000,
  });
  
  try {
    // Verify connection
    await pool.connect();
    console.log("Successfully connected to database");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};

await initializePool().catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});

export { pool };
export const db = drizzle({ client: pool, schema });
