import { defineConfig, type Config } from "drizzle-kit";

export default defineConfig({
  schema: "src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",

  dbCredentials: {
    url: "kora_db.db",
  },
}) satisfies Config;
