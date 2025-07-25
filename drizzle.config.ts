import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "singlestore",
  dbCredentials: {
    host: env.SINGLE_STORE_HOST,
    port: Number(env.SINGLE_STORE_PORT) || 3306, // Default SingleStore port (same as MySQL)
    user: env.SINGLE_STORE_USER,
    password: env.SINGLE_STORE_PASSWORD,
    database: env.SINGLE_STORE_DATABASE_NAME,
    ssl: {},
  },
  tablesFilter: ["ntheo_*"],
} satisfies Config;
