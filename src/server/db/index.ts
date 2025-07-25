import { drizzle } from "drizzle-orm/singlestore";
import mysql from "mysql2/promise";
import { env } from "~/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  client: mysql.Connection | undefined;
};

async function createDbConnection() {
  try {
    // Pre-connection checks

    const connection = await mysql.createConnection({
      host: env.SINGLE_STORE_HOST,
      port: parseInt(env.SINGLE_STORE_PORT),
      user: env.SINGLE_STORE_USER,
      password: env.SINGLE_STORE_PASSWORD,
      database: env.SINGLE_STORE_DATABASE_NAME,
      ssl: {},
      maxIdle: 0,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("Connection successful!");
    return connection;
  } catch (error) {
    console.error("=== Database Connection Error ===");
    console.error("Error details:", error);
    throw error;
  }
}

// Initialize connection
let client: mysql.Connection;
try {
  client = globalForDb.client ?? (await createDbConnection());

  if (env.NODE_ENV !== "production") {
    globalForDb.client = client;
  }

  client.addListener("error", (err) => {
    console.error("Database runtime error:", err);
  });
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

export { client };
export const db = drizzle(client, { schema });
