import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// The runtime and Prisma CLI use this checkout's environment unless explicitly overridden.
loadEnv({ path: process.env.ME_GUILD_ENV_FILE ?? path.resolve(process.cwd(), ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
});
