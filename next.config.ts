import path from "node:path";
import { createHash } from "node:crypto";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const sharedEnvFile = process.env.ME_GUILD_ENV_FILE ?? path.resolve(process.cwd(), "../../me-guild-b/.env");
loadEnv({ path: sharedEnvFile });
process.env.NEXTAUTH_URL ??= process.env.ME_GUILD_URL ?? "http://localhost:3000";
if (!process.env.NEXTAUTH_SECRET && process.env.GOOGLE_CLIENT_SECRET && process.env.DISCORD_CLIENT_SECRET) {
  process.env.NEXTAUTH_SECRET = createHash("sha256").update(`me-guild:${process.env.GOOGLE_CLIENT_SECRET}:${process.env.DISCORD_CLIENT_SECRET}`).digest("base64");
}
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
