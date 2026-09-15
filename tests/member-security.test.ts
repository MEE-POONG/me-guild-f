import assert from "node:assert/strict";
import test from "node:test";
import { challengeDigest, hashPassword, mutationError, normalizeEmail, providerEmailVerified, readJsonBody, safeReturnPath, validPassword, verifyPassword } from "../lib/member-security";

test("email normalization and password limits preserve meaningful input", () => {
  assert.equal(normalizeEmail("  Player@Example.COM "), "player@example.com");
  for (const value of ["bad", "a@b", "a b@example.com", null, 1, `${"a".repeat(250)}@example.com`]) assert.equal(normalizeEmail(value), null);
  assert.equal(validPassword("a".repeat(11)), false);
  assert.equal(validPassword("a".repeat(12)), true);
  assert.equal(validPassword("a".repeat(129)), false);
});

test("password hashes use unique salts and reject wrong or corrupt hashes", async () => {
  const password = "correct horse battery staple";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword(password, "scrypt:broken"), false);
  assert.equal(await verifyPassword(password, null), false);
});

test("OTP hashes are scoped to purpose and email and require an independent secret", () => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "isolated-test-secret-that-is-at-least-32-chars";
  try {
    const hash = challengeDigest("a@example.com", "VERIFY_EMAIL", "12345678");
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash, challengeDigest("b@example.com", "VERIFY_EMAIL", "12345678"));
    assert.notEqual(hash, challengeDigest("a@example.com", "RESET_PASSWORD", "12345678"));
  } finally { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; }
});

test("OAuth linking only trusts strict verified email flags", () => {
  assert.equal(providerEmailVerified("google", { email_verified: true }), true);
  assert.equal(providerEmailVerified("discord", { verified: true }), true);
  for (const profile of [{ email_verified: "true" }, { email_verified: false }, {}, null]) assert.equal(providerEmailVerified("google", profile), false);
  assert.equal(providerEmailVerified("discord", { verified: "true" }), false);
  assert.equal(providerEmailVerified("unknown", { verified: true }), false);
});

test("return paths reject scheme-relative redirects, backslashes, and external URLs", () => {
  for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "/\nevil", undefined]) assert.equal(safeReturnPath(value), "/member");
  assert.equal(safeReturnPath("/profile?view=music"), "/profile?view=music");
});

test("mutations require the configured origin and JSON; request URL cannot override configured origin", async () => {
  const previous = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = "https://guild.example";
  try {
    const make = (headers: Record<string, string>) => new Request("http://internal:3000/api/account/register", { method: "POST", headers, body: JSON.stringify({ email: "a@example.com" }) });
    assert.equal(mutationError(make({ origin: "https://guild.example", "content-type": "application/json" })), null);
    assert.equal(mutationError(make({ "content-type": "application/json" })), "INVALID_ORIGIN");
    assert.equal(mutationError(make({ origin: "https://attacker.example", "content-type": "application/json" })), "INVALID_ORIGIN");
    assert.equal(mutationError(make({ origin: "https://guild.example", "content-type": "text/plain" })), "JSON_REQUIRED");
    assert.equal(mutationError(make({ origin: "https://guild.example", "content-type": "application/json", "sec-fetch-site": "cross-site" })), "INVALID_ORIGIN");
    await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST", body: "[]" })), /INVALID_BODY/);
    await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST", body: JSON.stringify({ text: "a".repeat(64_001) }) })), /BODY_TOO_LARGE/);
  } finally { if (previous === undefined) delete process.env.NEXTAUTH_URL; else process.env.NEXTAUTH_URL = previous; }
});

test("JSON bodies stop streaming at the byte limit, including multibyte payloads", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode(`{"text":"${"ก".repeat(22_000)}"}`)); },
    cancel() { cancelled = true; },
  });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" });
  await assert.rejects(readJsonBody(request), /BODY_TOO_LARGE/);
  assert.equal(cancelled, true, "oversized streams must be cancelled without reading remaining input");
  await assert.rejects(readJsonBody(new Request("http://localhost", { method: "POST" })), /INVALID_BODY/);
});
