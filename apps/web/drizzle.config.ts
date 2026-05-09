import { config } from "dotenv";
import { join } from "node:path";
import type { Config } from "drizzle-kit";

config({ path: join(__dirname, "..", "..", ".env") });

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;
