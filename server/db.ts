import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;

const initializePool = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    console.error("Please add your database connection string to Secrets:");
    console.error("1. Go to Tools > Secrets");
    console.error("2. Add a new secret with key 'DATABASE_URL'");
    console.error("3. Set the value to your Neon database connection string");
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
    


// Run migrations
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// After db initialization, run migrations
try {
  await migrate(db, { migrationsFolder: './migrations' });
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Error running migrations:", error);
  process.exit(1);
}


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
