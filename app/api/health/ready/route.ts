export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { status: "ok", revision: process.env.APP_REVISION ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
