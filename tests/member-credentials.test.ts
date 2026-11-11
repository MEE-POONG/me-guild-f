import assert from "node:assert/strict";
import test from "node:test";
import { credentialInputError, getMemberCredentialStatus, memberAccountHref, memberCredentialError, parseMemberCredentialChallenge, parseMemberCredentialStatus, requestMemberCredentialCode, submitMemberCredentials } from "../lib/member-credentials";
import { allowedAdventureMethod, proxyAdventureRequest } from "../lib/backend-proxy";

const origin = "https://community.example.test";
const env = { NODE_ENV: "production", NEXTAUTH_URL: origin, ME_GUILD_OFFICE_URL: "https://office.example.test" };
const challenge = { challengeId: "0123456789abcdef0123456789abcdef", expiresAt: "2026-11-11T09:10:00.000Z", reference: "ABCD12", emailHint: null };
const status = { authenticated: true, username: "guild.member", passwordConfigured: true, emailHint: "m***@example.test" };
const login = { action: "login", identifier: "guild.member", password: " unchanged password ", returnTo: "/adventure/skills" } as const;

test("credentials status exposes only own minimal fields and hides anonymous account information", () => {
  assert.deepEqual(parseMemberCredentialStatus({ ...status, email: "private@example.test", passwordHash: "private" }), status);
  assert.deepEqual(parseMemberCredentialStatus({ ...status, authenticated: false }), { authenticated: false, username: null, passwordConfigured: false, emailHint: null });
  for (const value of [null, [], {}, { ...status, username: "a".repeat(33) }, { ...status, passwordConfigured: "yes" }, { ...status, emailHint: "a\nb" }]) assert.throws(() => parseMemberCredentialStatus(value), /MEMBER_SERVICE_UNAVAILABLE/);
});

test("recovery challenge rejects malformed responses without exposing backend details", () => {
  assert.deepEqual(parseMemberCredentialChallenge({ ...challenge, secret: "private" }), challenge);
  for (const value of [null, {}, { ...challenge, challengeId: "short" }, { ...challenge, expiresAt: "invalid" }, { ...challenge, reference: "" }, { ...challenge, emailHint: 2 }]) assert.throws(() => parseMemberCredentialChallenge(value), /MEMBER_SERVICE_UNAVAILABLE/);
  assert.match(memberCredentialError(new Error("MEMBER_CODE_INVALID")), /หมดอายุ/);
  assert.match(memberCredentialError(new Error("MEMBER_CREDENTIALS_INVALID")), /ไม่ถูกต้อง/);
  for (const code of ["<script>private</script>", "__proto__", "constructor"]) assert.equal(memberCredentialError(new Error(code)), "ยังตรวจสอบบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
});

test("credential input allows password-manager passphrases while respecting username and UTF-8 limits", () => {
  assert.equal(credentialInputError("Member.one-2", " unchanged password "), null);
  assert.equal(credentialInputError("abc", "a".repeat(15)), null);
  assert.equal(credentialInputError("abc", "ก".repeat(24)), null);
  for (const username of ["ab", ".abc", "abc-", "a b", "กิลด์", "a".repeat(33)]) assert.ok(credentialInputError(username, "a".repeat(20)));
  for (const password of ["a".repeat(14), "a".repeat(73), "ก".repeat(25), "🙂".repeat(19)]) assert.ok(credentialInputError("member", password));
});

test("same-origin transport keeps passwords unchanged, limits return targets, and never binds native fetch", async () => {
  let body: unknown;
  const fetcher: typeof fetch = async function (this: unknown, input, options) {
    assert.equal(this, undefined);
    assert.equal(input, "/api/adventure/member-credentials");
    assert.equal(options?.credentials, "same-origin");
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.redirect, "error");
    body = JSON.parse(String(options?.body));
    return Response.json({ ok: true, url: "/adventure/skills" });
  };
  assert.equal(await submitMemberCredentials({ ...login, returnTo: "https://attacker.test/" }, { origin, fetch: fetcher }), `${origin}/adventure/skills`);
  assert.deepEqual(body, { ...login, returnTo: "/adventure" });
  const account = new URL(memberAccountHref("https://attacker.test/"), origin);
  assert.equal(account.pathname, "/adventure/account");
  assert.equal(account.searchParams.get("returnTo"), "/adventure");
});

test("recovery requests own email by session or trims a supplied identifier without assuming existence", async () => {
  const bodies: unknown[] = [];
  const fetcher: typeof fetch = async (_input, options) => { bodies.push(JSON.parse(String(options?.body))); return Response.json(challenge); };
  assert.deepEqual(await requestMemberCredentialCode(undefined, { origin, fetch: fetcher }), challenge);
  assert.deepEqual(await requestMemberCredentialCode(" member@example.test ", { origin, fetch: fetcher }), challenge);
  assert.deepEqual(bodies, [{ action: "request-code" }, { action: "request-code", identifier: "member@example.test" }]);
  const read: typeof fetch = async (_input, options) => { assert.equal(options?.method, "GET"); assert.equal(options?.body, undefined); return Response.json(status); };
  assert.deepEqual(await getMemberCredentialStatus({ origin, fetch: read }), status);
});

test("credential success refuses external, Office, or credential-bearing navigation", async () => {
  for (const url of ["https://attacker.test/adventure", "/office", "/api/auth/signin", "https://user:password@community.example.test/adventure", "javascript:alert(1)"]) {
    await assert.rejects(submitMemberCredentials(login, { origin, fetch: async () => Response.json({ ok: true, url }) }), /MEMBER_SERVICE_UNAVAILABLE/);
  }
  for (const code of ["MEMBER_CREDENTIALS_INVALID", "MEMBER_AUTH_RATE_LIMIT", "<private stack trace>", "__proto__"]) {
    await assert.rejects(submitMemberCredentials(login, { origin, fetch: async () => Response.json({ code, error: "private data" }, { status: 400 }) }), new RegExp(code.startsWith("MEMBER_") ? code : "MEMBER_SERVICE_UNAVAILABLE"));
  }
});

test("credential proxy permits only the exact endpoint and rejects cross-site mutation before transport", async () => {
  for (const method of ["GET", "HEAD", "POST"]) assert.equal(allowedAdventureMethod(["member-credentials"], method), true);
  for (const method of ["PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(allowedAdventureMethod(["member-credentials"], method), false);
  for (const path of [["member-credentials", "login"], ["member-credentials", ".."], ["member-credentials/private"]]) assert.equal(allowedAdventureMethod(path, "POST"), false);
  let fetched = false;
  const response = await proxyAdventureRequest(new Request(`${origin}/api/adventure/member-credentials`, { method: "POST", body: "{}", headers: { Origin: "https://attacker.test" } }), ["member-credentials"], { env, fetch: async () => { fetched = true; return Response.json({}); } });
  assert.equal(response.status, 403);
  assert.equal(fetched, false);
});

test("credential proxy carries only member cookies and sets private no-store on authenticated responses", async () => {
  const incoming = new Request(`${origin}/api/adventure/member-credentials`, { method: "POST", body: JSON.stringify(login), headers: { Origin: origin, "Content-Type": "application/json", Cookie: "next-auth.session-token=office; me-guild-member.session-token=member", "Sec-Fetch-Site": "same-origin" } });
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(String(url), `${env.ME_GUILD_OFFICE_URL}/api/adventure/member-credentials`);
    assert.equal(new Headers(options?.headers).get("Cookie"), "me-guild-member.session-token=member");
    assert.deepEqual(JSON.parse(new TextDecoder().decode(options?.body as ArrayBuffer)), login);
    return Response.json({ ok: true, url: `${origin}/adventure` }, { headers: { "Set-Cookie": "me-guild-member.session-token=new-member; HttpOnly; Path=/" } });
  };
  const response = await proxyAdventureRequest(incoming, ["member-credentials"], { env, fetch: fetcher });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.match(response.headers.get("Set-Cookie") ?? "", /new-member/);
});
