import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "singlestore",
  dbCredentials: {
    host: env.SINGLE_STORE_HOST as string,
    port: Number(env.SINGLE_STORE_PORT) || 3306, // Default SingleStore port (same as MySQL)
    user: env.SINGLE_STORE_USER as string,
    password: env.SINGLE_STORE_PASSWORD as string,
    database: env.SINGLE_STORE_DATABASE_NAME as string,
    ssl: {},
  },
  tablesFilter: ["ntheo_*"],
} satisfies Config;
