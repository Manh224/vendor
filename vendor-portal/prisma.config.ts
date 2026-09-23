import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env.local for Prisma CLI
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
