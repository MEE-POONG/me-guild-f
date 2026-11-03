import assert from "node:assert/strict";
import test from "node:test";
import { parseMemberLoginStatus, unavailableMemberLoginStatus } from "../lib/member-login-status";

const google = { configured: true, currentDisplayName: "สมาชิก Google", providers: { discord: true, google: true }, currentProvider: "google", linkedProviders: { discord: false, google: true }, discordReady: false };

test("Google member status exposes only provider availability and account-link state", () => {
  assert.deepEqual(parseMemberLoginStatus({ ...google, accessToken: "must-not-reach-browser", email: "private@example.test" }), { ...google, error: null });
});

test("Discord readiness requires a signed-in member and a linked Discord account", () => {
  assert.equal(parseMemberLoginStatus({ ...google, discordReady: true }).discordReady, false);
  const linked = { ...google, linkedProviders: { discord: true, google: true }, discordReady: true };
  assert.equal(parseMemberLoginStatus(linked).discordReady, true);
  const anonymous = parseMemberLoginStatus({ ...linked, currentDisplayName: null });
  assert.equal(anonymous.currentProvider, null);
  assert.deepEqual(anonymous.linkedProviders, { discord: false, google: false });
  assert.equal(anonymous.discordReady, false);
});

test("an older Discord-only backend does not enable Google by assumption", () => {
  const status = parseMemberLoginStatus({ configured: true, currentDisplayName: "สมาชิก Discord" });
  assert.deepEqual(status.providers, { discord: true, google: false });
  assert.equal(status.currentProvider, "discord");
  assert.equal(status.discordReady, true);
});

test("unconfigured auth disables every provider and removes member state", () => {
  const status = parseMemberLoginStatus({ ...google, configured: false });
  assert.deepEqual(status.providers, { discord: false, google: false });
  assert.equal(status.currentDisplayName, null);
  assert.equal(status.currentProvider, null);
  assert.equal(status.discordReady, false);
  assert.equal(unavailableMemberLoginStatus().configured, false);
});

test("malformed provider status fails closed", () => {
  for (const data of [null, [], {}, { ...google, providers: { google: true } }, { ...google, linkedProviders: { google: "yes", discord: true } }, { ...google, currentProvider: "office" }, { ...google, discordReady: "yes" }, { ...google, currentDisplayName: "x".repeat(121) }]) {
    assert.throws(() => parseMemberLoginStatus(data), /INVALID_MEMBER_STATUS/);
  }
});
