import { createHash, createHmac, randomUUID } from "node:crypto";

export class OrganizationGatewayError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export function organizationPath(request: Request, prefix = "/organization-wallets") {
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind"), id = q.get("id");
  if (!kind && !id && request.method === "GET") return prefix;
  if (!kind || !id || !["GUILD", "DISCORD_SERVER", "PERSONAL"].includes(kind) ||
    !(kind === "GUILD" ? /^[a-f0-9]{24}$/.test(id) : /^\d{15,22}$/.test(id)))
    throw new OrganizationGatewayError("รหัสองค์กรหรือผู้รับไม่ถูกต้อง");
  const recipient = q.get("recipient") === "1";
  if (kind === "PERSONAL" && !recipient) throw new OrganizationGatewayError("เลือกกระเป๋าองค์กร");
  if (recipient && request.method !== "GET") throw new OrganizationGatewayError("คำขอไม่ถูกต้อง");
  const cursor = q.get("cursor");
  if (cursor && !/^[a-f0-9]{24}$/.test(cursor)) throw new OrganizationGatewayError("รหัสหน้าประวัติไม่ถูกต้อง");
  return prefix + (recipient ? "/recipients" : "") + "/" + kind + "/" + id +
    (request.method === "POST" ? "/commands" : cursor && !recipient ? "?cursor=" + cursor : "");
}
export async function readOrganizationCommand(request: Request, expectedOrigin: string) {
  if (request.headers.get("origin") !== new URL(expectedOrigin).origin)
    throw new OrganizationGatewayError("กรุณาทำรายการจากเว็บไซต์นี้", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
    throw new OrganizationGatewayError("รูปแบบข้อมูลต้องเป็น JSON", 415);
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[A-Za-z0-9:_-]{8,120}$/.test(key)) throw new OrganizationGatewayError("ไม่พบรหัสรายการ");
  const reader = request.body?.getReader();
  if (!reader) throw new OrganizationGatewayError("กรุณาระบุข้อมูล");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new OrganizationGatewayError("ข้อมูลใหญ่เกินไป", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new OrganizationGatewayError("ข้อมูล JSON ไม่ถูกต้อง"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new OrganizationGatewayError("ข้อมูลคำสั่งไม่ถูกต้อง");
  return { body, key };
}
export async function forwardOrganization(request: Request, actor: string, audience: "office" | "member", config: { base?: string; secret?: string; origin: string; production: boolean }, transport: typeof fetch = fetch) {
  if (!/^\d{15,22}$/.test(actor)) throw new OrganizationGatewayError("กรุณาเชื่อมบัญชี Discord ก่อน", 403);
  if (!config.base || !config.secret || config.secret.length < 32) throw new OrganizationGatewayError("ยังไม่ได้ตั้งค่าการเชื่อมกระเป๋าองค์กร", 503);
  let base: URL;
  try { base = new URL(config.base); } catch { throw new OrganizationGatewayError("ที่อยู่บอตไม่ถูกต้อง", 503); }
  if (base.username || base.password || base.pathname !== "/" || base.search || base.hash ||
    !(base.protocol === "https:" || (!config.production && base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))))
    throw new OrganizationGatewayError("ที่อยู่บอตต้องเป็น HTTPS origin", 503);
  const path = organizationPath(request);
  const command = request.method === "POST" ? await readOrganizationCommand(request, config.origin) : null;
  const body = command ? JSON.stringify(command.body) : "";
  const time = String(Date.now()), nonce = randomUUID();
  const signature = createHmac("sha256", config.secret).update([request.method, path, actor, time, nonce, createHash("sha256").update(body).digest("hex")].join("\n")).digest("hex");
  const upstream = await transport(new URL(path, base), {
    method: request.method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { "content-type": "application/json", "x-community-audience": audience, "x-community-actor": actor,
      "x-community-time": time, "x-community-nonce": nonce, "x-community-signature": signature,
      ...(command ? { "idempotency-key": command.key } : {}) },
    ...(command ? { body } : {}),
  }).catch(() => null);
  if (!upstream) throw new OrganizationGatewayError("ยังยืนยันผลไม่ได้ กรุณาลองรายการเดิมอีกครั้ง", 503);
  const payload: unknown = await upstream.json().catch(() => null);
  if (!payload || typeof payload !== "object") throw new OrganizationGatewayError("ระบบตอบกลับไม่สมบูรณ์", 502);
  return Response.json(payload, { status: upstream.status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export function organizationError(error: unknown) {
  return Response.json({ error: error instanceof OrganizationGatewayError ? error.message : "ไม่สามารถเชื่อมต่อกระเป๋าได้ กรุณาลองอีกครั้ง" },
    { status: error instanceof OrganizationGatewayError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
}
