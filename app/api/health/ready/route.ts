export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!process.env.DATABASE_URL || !process.env.NEXTAUTH_URL?.startsWith("https://") ||
      (process.env.NEXTAUTH_SECRET?.length ?? 0) < 32 ||
      !process.env.ME_GUILD_BOT_API_URL?.startsWith("https://") ||
      (process.env.COMMUNITY_MEMBER_SECRET?.length ?? 0) < 32) {
    return Response.json({ status: "unavailable", code: "CONFIG_MISSING" }, { status: 503, headers });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { prisma } = await import("@/lib/prisma");
    await Promise.race([
      prisma.$runCommandRaw({ ping: 1 }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("TIMEOUT")), 4000); }),
    ]);
    return Response.json({ status: "ok", revision: process.env.APP_REVISION ?? "unknown" }, { headers });
  } catch {
    return Response.json({ status: "unavailable", code: "DATABASE_UNAVAILABLE" }, { status: 503, headers });
  } finally { clearTimeout(timer); }
}
