import assert from "node:assert/strict";
import test from "node:test";
import { endAdventureMemberSession, startAdventureDiscordLogin, startAdventureMemberLogin } from "../lib/adventure-member-login";
import { ADVENTURE_DISCORD_SCOPE, ADVENTURE_GOOGLE_SCOPE, type AdventureMemberProvider } from "../lib/adventure-member-policy";

const origin = "https://community.example.test";
const base = "/api/adventure/member-auth";
const csrfToken = "a".repeat(64);

function discordUrl() {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: "123456789012345678", redirect_uri: `${origin}${base}/callback/discord`, scope: ADVENTURE_DISCORD_SCOPE, state: "fixture-state", code_challenge: "fixture-challenge", code_challenge_method: "S256" }).toString();
  return url;
}

function googleUrl() {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: "fixture.apps.googleusercontent.com", redirect_uri: `${origin}${base}/callback/google`, scope: ADVENTURE_GOOGLE_SCOPE, response_type: "code", state: "fixture-state", code_challenge: "fixture-challenge", code_challenge_method: "S256", nonce: "fixture-nonce" }).toString();
  return url;
}

function fixture(result: unknown = { url: discordUrl().toString() }, csrf: unknown = { csrfToken }) {
  const calls: { url: string; options: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, options: init ?? {} });
    return Response.json(url.endsWith("/csrf") ? csrf : result);
  };
  return { calls, fetcher };
}

test("both auth entry pages use the isolated CSRF-protected Discord transport and retain member deep links", async () => {
  const f = fixture();
  const controller = new AbortController();
  const destination = "/adventure/marketplace?guildId=123456789012345678&view=auctions&compose=auction";
  assert.equal(await startAdventureDiscordLogin(destination, { origin, fetch: f.fetcher, signal: controller.signal }), discordUrl().toString());
  assert.equal(f.calls[0].url, `${base}/csrf`);
  assert.equal(f.calls[1].url, `${base}/signin/discord`);
  assert.equal(f.calls[1].options.method, "POST");
  const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
  assert.equal(body.get("csrfToken"), csrfToken);
  assert.equal(body.get("callbackUrl"), `${origin}${destination}`);
  for (const { options } of f.calls) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.equal(options.signal, controller.signal);
  }
});

test("both providers and sign-out call browser fetch without binding the dependency object as its receiver", async () => {
  for (const action of ["discord", "google", "signout"] as const) {
    const target = action === "discord" ? discordUrl().toString() : action === "google" ? googleUrl().toString() : `${origin}/adventure/login`;
    const f = fixture({ url: target });
    const browserFetch: typeof fetch = async function (this: unknown, input, init) {
      assert.equal(this, undefined, "native window.fetch rejects an arbitrary object receiver");
      return f.fetcher(input, init);
    };
    const dependencies = { origin, fetch: browserFetch };
    const result = action === "signout"
      ? await endAdventureMemberSession(dependencies)
      : await startAdventureMemberLogin(action, "/adventure/marketplace", dependencies);
    assert.equal(result, target);
    assert.equal(f.calls.length, 2);
  }
});

test("Google sign-in retains a safe member destination and uses the same isolated CSRF transport", async () => {
  const target = googleUrl().toString(), f = fixture({ url: target });
  const destination = "/adventure/login?returnTo=%2Fadventure%2Fmarketplace";
  assert.equal(await startAdventureMemberLogin("google", destination, { origin, fetch: f.fetcher }), target);
  assert.equal(f.calls[0].url, `${base}/csrf`);
  assert.equal(f.calls[1].url, `${base}/signin/google`);
  assert.equal(f.calls[1].options.method, "POST");
  const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
  assert.equal(body.get("csrfToken"), csrfToken);
  assert.equal(body.get("callbackUrl"), `${origin}${destination}`);
  assert.equal(body.has("intent"), false);
  for (const { options } of f.calls) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
  }
});

test("linking requires an explicit intent and cannot change the provider or callback boundary", async () => {
  for (const provider of ["discord", "google"] as const) {
    const target = (provider === "discord" ? discordUrl() : googleUrl()).toString(), f = fixture({ url: target });
    assert.equal(await startAdventureMemberLogin(provider, "https://evil.test/adventure", { origin, fetch: f.fetcher }, { link: true }), target);
    const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
    assert.equal(body.get("intent"), "link");
    assert.equal(body.get("csrfToken"), csrfToken);
    assert.equal(body.get("callbackUrl"), `${origin}/adventure`);
  }
  const f = fixture();
  await assert.rejects(startAdventureMemberLogin("github" as AdventureMemberProvider, "/adventure", { origin, fetch: f.fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  assert.equal(f.calls.length, 0);
});

test("Google redirects reject alternate endpoints, callbacks, scopes, implicit flow and missing OAuth proofs", async () => {
  const mutations: ((url: URL) => void)[] = [
    url => { url.hostname = "accounts.google.com.evil.test"; },
    url => { url.protocol = "http:"; },
    url => { url.pathname = "/o/oauth2/auth"; },
    url => { url.searchParams.set("redirect_uri", `${origin}${base}/callback/discord`); },
    url => { url.searchParams.set("redirect_uri", "https://evil.test/callback"); },
    url => { url.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/drive"); },
    url => { url.searchParams.set("scope", "openid email"); },
    url => { url.searchParams.set("response_type", "token"); },
    url => { url.searchParams.delete("state"); },
    url => { url.searchParams.delete("code_challenge"); },
    url => { url.searchParams.set("code_challenge_method", "plain"); },
    url => { url.searchParams.delete("nonce"); },
    url => { url.searchParams.delete("client_id"); },
    url => { url.searchParams.append("redirect_uri", "https://evil.test/callback"); },
    url => { url.searchParams.append("scope", "openid"); },
    url => { url.username = "user"; },
    url => { url.hash = "fragment"; },
  ];
  for (const mutate of mutations) {
    const target = googleUrl(); mutate(target);
    await assert.rejects(startAdventureMemberLogin("google", "/adventure", { origin, fetch: fixture({ url: target.toString() }).fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  }
  await assert.rejects(startAdventureMemberLogin("google", "/adventure", { origin, fetch: fixture().fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  await assert.rejects(startAdventureMemberLogin("discord", "/adventure", { origin, fetch: fixture({ url: googleUrl().toString() }).fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
});

test("a foreign requested destination is replaced before it reaches OAuth", async () => {
  const f = fixture();
  await startAdventureDiscordLogin("https://evil.test/adventure", { origin, fetch: f.fetcher });
  assert.equal(new URLSearchParams(f.calls[1].options.body as URLSearchParams).get("callbackUrl"), `${origin}/adventure`);
});

test("malformed CSRF payloads stop before submitting a sign-in request", async () => {
  for (const csrf of [null, {}, { csrfToken: "wrong" }, { csrfToken: [csrfToken] }]) {
    const f = fixture(undefined, csrf);
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: f.fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
    assert.equal(f.calls.length, 1);
  }
});

test("Discord redirects require the exact callback, scope, state and S256 challenge", async () => {
  const mutations: ((url: URL) => void)[] = [
    url => { url.hostname = "discord.com.evil.test"; },
    url => { url.searchParams.set("redirect_uri", "https://evil.test/callback"); },
    url => { url.searchParams.set("scope", "identify"); },
    url => { url.searchParams.delete("state"); },
    url => { url.searchParams.delete("code_challenge"); },
    url => { url.searchParams.set("code_challenge_method", "plain"); },
    url => { url.username = "user"; },
  ];
  for (const mutate of mutations) {
    const target = discordUrl(); mutate(target);
    const f = fixture({ url: target.toString() });
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: f.fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  }
});

test("safe member error redirects survive while Office and malformed auth responses fail closed", async () => {
  const safe = `${origin}/adventure/login?error=MemberUnavailable`;
  assert.equal(await startAdventureDiscordLogin("/adventure", { origin, fetch: fixture({ url: safe }).fetcher }), safe);
  for (const result of [null, {}, { url: 123 }, { url: `${origin}/api/auth/signin` }, { url: "https://evil.test/" }]) {
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: fixture(result).fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  }
});

test("logout sends a CSRF-protected member request and accepts only the legacy fixed login destination", async () => {
  const target = `${origin}/adventure/login`;
  const f = fixture({ url: target });
  assert.equal(await endAdventureMemberSession({ origin, fetch: f.fetcher }), target);
  assert.equal(f.calls[1].url, `${base}/signout`);
  assert.equal(f.calls[1].options.method, "POST");
  const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
  assert.equal(body.get("csrfToken"), csrfToken);
  assert.equal(body.get("callbackUrl"), target);
  for (const url of ["https://evil.test/", `${origin}/login`, `${target}?returnTo=https://evil.test/`]) {
    await assert.rejects(endAdventureMemberSession({ origin, fetch: fixture({ url }).fetcher }), /MEMBER_LOGOUT_UNAVAILABLE/);
  }
});

test("unavailable and aborted auth requests do not synthesize a navigation target", async () => {
  const unavailable: typeof fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: unavailable }), /MEMBER_LOGIN_UNAVAILABLE/);
  const controller = new AbortController(); controller.abort();
  const aborted: typeof fetch = async (_input, init) => { init?.signal?.throwIfAborted(); throw new Error("unexpected fetch"); };
  await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: aborted, signal: controller.signal }), { name: "AbortError" });
});
