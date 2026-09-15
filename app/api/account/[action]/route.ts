import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { completeChallenge, consumeRateLimit, sendChallenge } from "@/lib/member-accounts";
import { emailDeliveryConfigured } from "@/lib/member-mail";
import { mutationError, normalizeEmail, readJsonBody, validPassword } from "@/lib/member-security";

export const runtime = "nodejs";
const genericMessage = "หากอีเมลนี้สามารถดำเนินการได้ ระบบจะส่งรหัสให้ กรุณาตรวจสอบกล่องจดหมายและสแปม";
const result = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const error = mutationError(request);
  if (error) return result({ error }, error === "JSON_REQUIRED" ? 415 : error === "BODY_TOO_LARGE" ? 413 : 403);
  const { action } = await context.params;
  if (!["register", "resend-verification", "verify-email", "forgot-password", "reset-password"].includes(action)) return result({ error: "NOT_FOUND" }, 404);
  const body = await readJsonBody(request).catch(() => null);
  if (!body) return result({ error: "INVALID_BODY" }, 400);
  const email = normalizeEmail(body.email);
  if (!email) return result({ error: "INVALID_EMAIL" }, 400);
  if ((action === "verify-email" || action === "reset-password") && !validPassword(body.password)) return result({ error: "PASSWORD_TOO_SHORT" }, 400);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (action === "register" && (!name || name.length > 80)) return result({ error: "INVALID_NAME" }, 400);
  if (["verify-email", "reset-password"].includes(action) && (typeof body.code !== "string" || !/^\d{8}$/.test(body.code))) return result({ error: "INVALID_CODE" }, 400);
  try {
    if (!await consumeRateLimit(`request:${action}`, email, action === "verify-email" || action === "reset-password" ? 10 : 4) || !await consumeRateLimit("requests-global", "all", 500)) return result({ error: "TOO_MANY_ATTEMPTS" }, 429);
    if (action === "verify-email" || action === "reset-password") {
      const ok = await completeChallenge(email, action === "verify-email" ? "VERIFY_EMAIL" : "RESET_PASSWORD", body.code as string, body.password as string);
      return ok ? result({ message: action === "verify-email" ? "ยืนยันอีเมลแล้ว เข้าสู่ระบบได้เลย" : "ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง" }) : result({ error: "INVALID_OR_EXPIRED_CODE" }, 400);
    }
    if (!emailDeliveryConfigured()) return result({ error: "EMAIL_DELIVERY_UNAVAILABLE" }, 503);
    let identity = await prisma.memberIdentity.findUnique({ where: { email } });
    if (action === "register" && !identity) {
      // Passwords are chosen only after inbox ownership is proven. A pre-registered
      // address must never activate an attacker's previously submitted password.
      try { identity = await prisma.memberIdentity.create({ data: { email, displayName: name, passwordHash: null } }); }
      catch (creationError) {
        if (!(creationError instanceof Prisma.PrismaClientKnownRequestError) || creationError.code !== "P2002") throw creationError;
        identity = await prisma.memberIdentity.findUnique({ where: { email } });
      }
    }
    if (identity?.isActive) {
      if ((action === "register" || action === "resend-verification") && !identity.emailVerifiedAt) await sendChallenge(identity, "VERIFY_EMAIL");
      if (action === "forgot-password") await sendChallenge(identity, "RESET_PASSWORD");
    }
    return result({ message: genericMessage });
  } catch {
    return result({ error: "AUTH_UNAVAILABLE" }, 503);
  }
}
