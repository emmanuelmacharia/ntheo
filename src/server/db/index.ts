import { drizzle } from "drizzle-orm/singlestore";
import mysql from "mysql2/promise";
import fs from "fs";
import { env } from "~/env";
import * as schema from "./schema";
import path from "path";

const SSL_CERT_PATH = path.join(
  process.cwd(),
  "public",
  "singlestore_bundle.pem",
);

const globalForDb = globalThis as unknown as {
  client: mysql.Connection | undefined;
};

async function createDbConnection() {
  try {
    // Pre-connection checks
    console.log("=== Database Connection Attempt ===");
    console.log("Certificate path:", SSL_CERT_PATH);
    console.log("Certificate exists:", fs.existsSync(SSL_CERT_PATH));
    console.log("Current directory:", process.cwd());

    if (!fs.existsSync(SSL_CERT_PATH)) {
      throw new Error(`SSL certificate not found at ${SSL_CERT_PATH}`);
    }

    const certContent = fs.readFileSync(SSL_CERT_PATH, "utf8");
    console.log("Certificate loaded, length:", certContent.length);

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
