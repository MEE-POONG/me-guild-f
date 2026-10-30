import assert from "node:assert/strict";
import test from "node:test";
import { Issuer } from "openid-client";

test("Discord callback validates the configured issuer and still rejects foreign issuers and state", async () => {
  const previous = { DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET };
  process.env.DISCORD_CLIENT_ID = "111111111111111111";
  process.env.DISCORD_CLIENT_SECRET = "isolated-issuer-test-secret";
  try {
    const { authOptions } = await import("../lib/auth");
    const provider = authOptions.providers.find(provider => provider.id === "discord");
    assert.ok(provider?.type === "oauth");
    const configured = { ...provider, ...provider.options };
    const issuer = new Issuer({ issuer: configured.issuer! });
    const client = new issuer.Client({ client_id: configured.clientId! });
    const callback = "https://member.example.test/api/auth/callback/discord";
    const response = { state: "expected-state", iss: "https://discord.com", error: "access_denied" };

    // A provider denial reaches OAuth error handling only after issuer/state validation.
    // No code is exchanged and no network or database request is made.
    await assert.rejects(client.oauthCallback(callback, response, { state: response.state }), { error: "access_denied" });
    await assert.rejects(client.oauthCallback(callback, { ...response, iss: "https://attacker.example" }, { state: response.state }), /iss mismatch/);
    await assert.rejects(client.oauthCallback(callback, response, { state: "wrong-state" }), /state mismatch/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
