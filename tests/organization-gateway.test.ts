import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import { forwardOrganization, organizationPath, readOrganizationCommand } from "../lib/organization-gateway";
const id = "a".repeat(24), actor = "111111111111111111";
test("organization paths bind kind, identifiers and cursor without allowing path injection", () => {
  assert.equal(organizationPath(new Request("https://web.test/api/organization-wallets")), "/organization-wallets");
  assert.equal(organizationPath(new Request("https://web.test/api/organization-wallets?kind=GUILD&id=" + id + "&cursor=" + id)), "/organization-wallets/GUILD/" + id + "?cursor=" + id);
  for (const query of ["kind=GUILD&id=../admin", "kind=PERSONAL&id=" + actor, "kind=DISCORD_SERVER&id=" + id, "kind=GUILD&id=" + id + "&cursor=invalid"])
    assert.throws(() => organizationPath(new Request("https://web.test/api/organization-wallets?" + query)));
});
test("mutations require origin, JSON, bounded streamed body and stable operation key", async () => {
  const req = (body: string, origin = "https://web.test") => new Request("https://web.test/api", { method: "POST", headers: { origin, "content-type": "application/json", "idempotency-key": "operation-test-123" }, body });
  await assert.rejects(readOrganizationCommand(req("{}", "https://evil.test"), "https://web.test"), { status: 403 });
  await assert.rejects(readOrganizationCommand(req(JSON.stringify({ reason: "x".repeat(9000) })), "https://web.test"), { status: 413 });
  await assert.rejects(readOrganizationCommand(req("[]"), "https://web.test"), { status: 400 });
  const parsed = await readOrganizationCommand(req('{"action":"deposit","amountCopper":10}'), "https://web.test");
  assert.equal(parsed.key, "operation-test-123");
});
test("gateway signs the authenticated identity and exact cursor/body; browser actor and roles confer no authority", async () => {
  const body = { action: "transfer", actorDiscordId: "999999999999999999", administrator: true };
  const request = new Request("https://web.test/api/organization-wallets?kind=GUILD&id=" + id, { method: "POST",
    headers: { origin: "https://web.test", "content-type": "application/json", "idempotency-key": "operation-test-123" }, body: JSON.stringify(body) });
  const secret = "s".repeat(32);
  const response = await forwardOrganization(request, actor, "member", { base: "https://bot.test", secret, origin: "https://web.test", production: true }, (async (url, init) => {
    assert.equal(String(url), "https://bot.test/organization-wallets/GUILD/" + id + "/commands");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-community-actor"), actor);
    assert.equal(headers.get("idempotency-key"), "operation-test-123");
    const expected = createHmac("sha256", secret).update(["POST", new URL(String(url)).pathname, actor, headers.get("x-community-time"), headers.get("x-community-nonce"), createHash("sha256").update(String(init?.body)).digest("hex")].join("\n")).digest("hex");
    assert.equal(headers.get("x-community-signature"), expected);
    assert.equal(init?.redirect, "error");
    return Response.json({ transactionId: "ORG_TEST" });
  }) as typeof fetch);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  await assert.rejects(forwardOrganization(new Request("https://web.test/api"), actor, "member", { base: "http://bot.test", secret, origin: "https://web.test", production: true }), { status: 503 });
});

test("dropdown searches encode names and enforce source scope without forwarding identity", () => {
  const input = new URL("https://web.test/api?options=1&kind=PERSONAL&sourceKind=GUILD&sourceId=" + "a".repeat(24));
  input.searchParams.set("q", "เพื่อน & #/"); input.searchParams.set("actor", "999999999999999999");
  const result = new URL(organizationPath(new Request(input)), "https://bot.test");
  assert.equal(result.pathname, "/organization-wallets/options");
  assert.equal(result.searchParams.get("q"), "เพื่อน & #/");
  assert.equal(result.searchParams.get("sourceId"), "a".repeat(24));
  assert.equal(result.searchParams.has("actor"), false);
  for (const query of ["kind=PERSONAL", "kind=GUILD&cursor=../admin", "kind=GUILD&q=" + "x".repeat(81)])
    assert.throws(() => organizationPath(new Request("https://web.test/api?options=1&" + query)));
  assert.throws(() => organizationPath(new Request(input, { method: "POST" })));
});
