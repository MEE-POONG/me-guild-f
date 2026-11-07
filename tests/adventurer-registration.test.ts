import assert from "node:assert/strict";
import test from "node:test";
import { parseAdventurerRegistration, parseRegistrationSummary, registrationHref } from "../lib/adventurer-registration";
import { parseMemberLoginStatus } from "../lib/member-login-status";
import { allowedAdventureMethod, proxyAdventureRequest } from "../lib/backend-proxy";

const visitor = { status: "VISITOR", profileCompleted: false, realName: null, displayName: "สมาชิก", visitorRegisteredAt: null, adventurerRegisteredAt: null, startingLevel: 0 };
const registered = { ...visitor, status: "ADVENTURER", profileCompleted: true, realName: "สมาชิก ทดสอบ", visitorRegisteredAt: "2026-11-04T01:00:00Z", adventurerRegisteredAt: "2026-11-04T01:01:00Z", startingLevel: 1 };

test("registration states require persisted profile and registration before displaying level one", () => {
  assert.deepEqual(parseAdventurerRegistration(visitor), visitor);
  assert.deepEqual(parseAdventurerRegistration(registered), registered);
  for (const input of [{ ...visitor, startingLevel: 1 }, { ...registered, profileCompleted: false }, { ...registered, adventurerRegisteredAt: null }, { ...registered, realName: "" }, { ...registered, visitorRegisteredAt: "invalid" }]) {
    assert.throws(() => parseAdventurerRegistration(input), /INVALID_REGISTRATION/);
  }
});

test("status summary excludes private registration data and anonymous accounts expose no registration", () => {
  const summary = parseRegistrationSummary(registered);
  assert.equal("realName" in summary, false);
  assert.equal("displayName" in summary, false);
  const status = parseMemberLoginStatus({ configured: true, currentDisplayName: "สมาชิก", registration: registered });
  assert.deepEqual(status.registration, summary);
  assert.equal(parseMemberLoginStatus({ configured: true, currentDisplayName: null, registration: registered }).registration, null);
});

test("onboarding keeps allowed deep links and removes external destinations and recursive registration", () => {
  const target = "/adventure/marketplace?guildId=123&view=auctions&compose=auction";
  assert.equal(new URL(registrationHref(target), "https://community.test").searchParams.get("returnTo"), target);
  for (const input of ["https://evil.test/adventure", "//evil.test/adventure", "/office", "/adventure/register?returnTo=%2Fadventure%2Fregister"]) {
    const safe = new URL(registrationHref(input), "https://community.test").searchParams.get("returnTo");
    assert.ok(safe?.startsWith("/adventure"));
    assert.equal(safe?.includes("evil.test"), false);
    assert.equal(safe?.startsWith("/adventure/register"), false);
  }
});

test("registration transport permits only its exact endpoint and retains origin and member-cookie guards", async () => {
  const frontend = "https://community.test", backend = "https://office.test";
  const env = { NODE_ENV: "production", ME_GUILD_FRONTEND_URL: frontend, ME_GUILD_OFFICE_URL: backend };
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls += 1;
    assert.equal(String(url), `${backend}/api/adventure/registration`);
    assert.equal(new Headers(init?.headers).get("Cookie"), null);
    return Response.json(registered);
  };
  const send = (origin: string) => proxyAdventureRequest(new Request(`${frontend}/api/adventure/registration`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: "next-auth.session-token=office-secret" }, body: JSON.stringify({ action: "register-adventurer", acceptRules: true }) }), ["registration"], { env, fetch: fetcher });
  assert.equal((await send("https://evil.test")).status, 403);
  assert.equal(calls, 0);
  const response = await send(frontend);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(calls, 1);
  for (const method of ["GET", "HEAD", "POST"]) assert.equal(allowedAdventureMethod(["registration"], method), true);
  for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal(allowedAdventureMethod(["registration"], method), false);
  assert.equal(allowedAdventureMethod(["registration", "someone-else"], "POST"), false);
});
