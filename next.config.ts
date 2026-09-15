import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const sharedEnvFile = process.env.ME_GUILD_ENV_FILE ?? path.resolve(process.cwd(), ".env");
loadEnv({ path: sharedEnvFile, quiet: true });
process.env.NEXTAUTH_URL ??= process.env.ME_GUILD_URL ?? "http://localhost:3000";
const nextConfig: NextConfig = { reactStrictMode: true, allowedDevOrigins: ["127.0.0.1"], distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next" };
export default nextConfig;
