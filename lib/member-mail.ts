import nodemailer from "nodemailer";

function mailSettings() {
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.MAIL_PASS;
  return { host: process.env.SMTP_HOST || (user && pass ? "smtp.gmail.com" : undefined), from: process.env.SMTP_FROM || user, user, pass };
}

export function emailDeliveryConfigured() {
  const settings = mailSettings();
  return Boolean(settings.host && settings.from && (!settings.user || settings.pass));
}

export async function sendMemberCode(email: string, code: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  if (!emailDeliveryConfigured()) throw new Error("EMAIL_DELIVERY_UNAVAILABLE");
  const settings = mailSettings();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const transport = nodemailer.createTransport({
    host: settings.host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    requireTLS: process.env.SMTP_REQUIRE_TLS !== "false" && process.env.SMTP_SECURE !== "true" && port !== 465,
    auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    logger: false,
    debug: false,
  });
  const action = purpose === "VERIFY_EMAIL" ? "ยืนยันอีเมล" : "ตั้งรหัสผ่านใหม่";
  await transport.sendMail({
    from: settings.from,
    to: email,
    subject: `Me Guild — ${action}`,
    text: `รหัส${action}ของคุณคือ ${code}\n\nรหัสนี้ใช้ได้ครั้งเดียวภายใน 15 นาที\nหากคุณไม่ได้ขอรหัสนี้ ไม่ต้องดำเนินการใด ๆ และอย่าส่งรหัสให้ผู้อื่น`,
  });
}
