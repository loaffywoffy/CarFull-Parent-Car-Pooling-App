import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;

const initializePool = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 15000,
        max: 5,
        idleTimeoutMillis: 30000,
        retryDelay: 2000,
        ssl: {
          rejectUnauthorized: false
        }
      });
    
      // Verify connection
      await pool.connect();
      console.log("Successfully connected to database");
      return;
    } catch (error) {
      retryCount++;
      console.error(`Database connection attempt ${retryCount} failed:`, error);
      if (retryCount === maxRetries) {
        console.error("Maximum retry attempts reached. Exiting.");
        process.exit(1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

await initializePool().catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});

export { pool };
export const db = drizzle({ client: pool, schema });
