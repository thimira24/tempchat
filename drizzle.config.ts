import { defineConfig } from "drizzle-kit";

// Note: This project now uses MongoDB instead of PostgreSQL
// You can remove this file if you're not using Drizzle anymore

/*
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
*/
