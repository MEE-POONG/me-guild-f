import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const sharedEnvFile = process.env.ME_GUILD_ENV_FILE ?? path.resolve(process.cwd(), "../../me-guild-b/.env");
loadEnv({ path: sharedEnvFile });

export default defineConfig({
  schema: "prisma/schema.prisma",
});
