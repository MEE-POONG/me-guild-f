import assert from "node:assert/strict";
import test from "node:test";
import { allowedAdventureMethod, proxyAdventureRequest } from "../lib/backend-proxy";
import { adventureMemberRedirect } from "../lib/adventure-member-policy";
import { businessAuthorizationUrl, auctionBidCost, marketplaceDestination, marketplaceLoginUrl, offersEqual, parseTradeCopper, pendingTrade, tradeCopper, tradeOfferSummary, tradeConfirmationCurrent, type MarketAuction, type MarketTrade } from "../lib/marketplace-types";

test("marketplace proxy allows only board reads and POST with the existing member origin/cookie boundary", async () => {
  assert.equal(allowedAdventureMethod(["marketplace"], "GET"), true);
  assert.equal(allowedAdventureMethod(["marketplace"], "POST"), true);
  for (const method of ["DELETE", "PATCH", "PUT"]) assert.equal(allowedAdventureMethod(["marketplace"], method), false);
  for (const path of [["marketplace", "internal"], ["internal", "marketplace"], ["marketplace", "../admin"]]) assert.equal(allowedAdventureMethod(path, "POST"), false);
  let calls = 0;
  const env = { NODE_ENV: "production", ME_GUILD_FRONTEND_URL: "https://guild.test", ME_GUILD_BACKEND_URL: "https://office.test" };
  const fakeFetch: typeof fetch = async (_url, init) => {
    calls++; const headers = new Headers(init?.headers);
    assert.equal(headers.get("cookie"), "me-guild-member.session-token=member");
    assert.equal(headers.get("authorization"), null);
    assert.equal(headers.get("x-market-signature"), null);
    assert.equal(JSON.parse(String(init?.body instanceof ArrayBuffer ? Buffer.from(init.body).toString() : init?.body)).requestId, "stable-request");
    return Response.json({ result: { id: "trade" } });
  };
  const bad = await proxyAdventureRequest(new Request("https://guild.test/api/adventure/marketplace", { method: "POST", headers: { Origin: "https://evil.test" }, body: "{}" }), ["marketplace"], { env, fetch: fakeFetch });
  assert.equal(bad.status, 403); assert.equal(calls, 0);
  const valid = await proxyAdventureRequest(new Request("https://guild.test/api/adventure/marketplace", { method: "POST", headers: { Origin: env.ME_GUILD_FRONTEND_URL, "Content-Type": "application/json", Cookie: "me-guild-office.session-token=office; me-guild-member.session-token=member", Authorization: "attacker", "X-Market-Signature": "spoof" }, body: JSON.stringify({ action: "trade.lock", requestId: "stable-request" }) }), ["marketplace"], { env, fetch: fakeFetch });
  assert.equal(valid.status, 200); assert.equal(calls, 1);
});

test("business round links carry only review fields to the explicit ME Coin management page", () => {
  const auction = { businessWalletId: "a".repeat(24), id: "b".repeat(24), sellerId: "123456789012345678", currentPriceCopper: 10, endsAt: "2026-10-31T12:00:00.000Z" } as MarketAuction;
  const url = new URL(businessAuthorizationUrl(auction, "https://coins.example")!);
  assert.equal(url.pathname, `/wallet/business/${auction.businessWalletId}`);
  assert.equal(url.searchParams.get("roundId"), auction.id);
  assert.equal(url.searchParams.get("sellerDiscordId"), auction.sellerId);
  assert.equal(url.searchParams.get("startingPriceCopper"), "10");
  assert.equal(url.searchParams.get("expiresAt"), auction.endsAt);
  assert.equal(url.hash, "#business-auctions");
  assert.equal(businessAuthorizationUrl(auction, "https://user:secret@coins.example"), null);
  assert.equal(businessAuthorizationUrl({ ...auction, businessWalletId: "../admin" }), null);
});

test("Discord login retains auction and guild deep links but never allows a foreign origin", () => {
  const auction = "a".repeat(24), guild = "123456789012345678";
  const login = new URL(marketplaceLoginUrl(guild, auction), "https://guild.test");
  const destination = login.searchParams.get("returnTo")!;
  assert.equal(adventureMemberRedirect(destination, "https://guild.test"), `https://guild.test/adventure/marketplace?guildId=${guild}&auction=${auction}`);
  assert.equal(adventureMemberRedirect("https://evil.test/adventure/marketplace", "https://guild.test"), "https://guild.test/adventure");
  assert.equal(marketplaceLoginUrl("../admin", "javascript:alert(1)"), "/adventure/login?returnTo=%2Fadventure%2Fmarketplace");
});

test("community auction button survives login with its guild and an open compose form", () => {
  const destination = marketplaceDestination({ guildId: "123456789012345678", view: "auctions", compose: "auction" });
  assert.deepEqual(destination, { guildId: "123456789012345678", auctionId: "", view: "auctions", composeAuction: true });
  const login = new URL(marketplaceLoginUrl(destination.guildId, destination.auctionId, destination), "https://guild.test");
  const returnTo = login.searchParams.get("returnTo");
  assert.ok(returnTo);
  const returned = new URL(adventureMemberRedirect(returnTo, "https://guild.test"));
  assert.equal(returned.pathname, "/adventure/marketplace");
  assert.deepEqual(marketplaceDestination(Object.fromEntries(returned.searchParams)), destination);
  assert.equal(marketplaceDestination({ view: "trades", compose: "auction" }).view, "auctions");
});

test("community trade link selects trades, while malformed or repeated link parameters are ignored", () => {
  assert.equal(marketplaceDestination({ view: "trades" }).view, "trades");
  const login = new URL(marketplaceLoginUrl("", "", { view: "trades" }), "https://guild.test");
  assert.equal(login.searchParams.get("returnTo"), "/adventure/marketplace?view=trades");
  for (const query of [
    { guildId: "../admin", auction: "javascript:alert(1)", view: "https://evil.test", compose: "auction.create" },
    { guildId: ["123456789012345678", "987654321098765432"], auction: ["a".repeat(24)], view: ["trades", "auctions"], compose: ["auction"] },
  ]) assert.deepEqual(marketplaceDestination(query), { guildId: "", auctionId: "", view: "inventory", composeAuction: false });
});

test("unsaved offer changes are detected regardless of UI order; zero rows do not prevent locking", () => {
  assert.equal(offersEqual([{ itemId: "b", quantity: 0 }, { itemId: "a", quantity: 2 }], [{ itemId: "a", quantity: 2 }]), true);
  assert.equal(offersEqual([{ itemId: "a", quantity: 1 }], [{ itemId: "a", quantity: 2 }]), false);
  assert.equal(offersEqual([{ itemId: "a", quantity: 1 }], [{ itemId: "b", quantity: 1 }]), false);
});

test("bid confirmation reserves full price for a challenger and only the increase for the current leader", () => {
  assert.deepEqual(auctionBidCost({ currentPriceCopper: 10, highestBidderId: "another" }, "me"), { price: 11, priceToHold: 11, charge: 12 });
  assert.deepEqual(auctionBidCost({ currentPriceCopper: 10, highestBidderId: "me" }, "me"), { price: 11, priceToHold: 1, charge: 2 });
  assert.deepEqual(auctionBidCost({ currentPriceCopper: 0, highestBidderId: null }, "me"), { price: 1, priceToHold: 1, charge: 2 });
  assert.deepEqual(auctionBidCost({ currentPriceCopper: 999_999, highestBidderId: null }, "me"), { price: 1_000_000, priceToHold: 1_000_000, charge: 1_000_001 });
  for (const currentPriceCopper of [1.5, -1, Number.MAX_SAFE_INTEGER]) assert.throws(() => auctionBidCost({ currentPriceCopper, highestBidderId: null }, "me"), RangeError);
});

test("trade Copper is a bounded whole amount; empty or exponential inputs cannot silently become zero", () => {
  for (const [input, amount] of [["0", 0], ["42", 42], ["1000000", 1_000_000], [" 25 ", 25]] as const) assert.equal(parseTradeCopper(input), amount);
  for (const input of ["", " ", "-1", "+1", "01", "1.5", "1e3", "1,000", "1000001", "Infinity", "NaN"]) assert.equal(parseTradeCopper(input), null);
});

test("trade review exposes both Copper amounts and every item, including item-only legacy offers", () => {
  const trade = { id: "trade", revision: 7, participantIds: ["me", "peer"], offers: { me: [{ itemId: "a", name: "Sword", quantity: 2 }], peer: [] }, copperOffers: { me: 125, peer: 20 } } as unknown as MarketTrade;
  const summary = tradeOfferSummary(trade, "me");
  assert.match(summary, /คุณส่ง: 125 Copper และ Sword × 2/);
  assert.match(summary, /คู่แลก peer ส่ง: 20 Copper และ ไม่มีไอเทม/);
  const legacy = { ...trade, copperOffers: undefined };
  assert.equal(tradeCopper(legacy, "me"), 0);
  assert.match(tradeOfferSummary(legacy, "me"), /คุณส่ง: 0 Copper/);
});

test("a reviewed trade becomes unconfirmable when refresh advances its revision or removes it", () => {
  const trade = { id: "trade", revision: 7 } as MarketTrade;
  const action = { action: "trade.confirm", tradeId: "trade", expectedRevision: 7 };
  assert.equal(tradeConfirmationCurrent(action, [trade]), true);
  assert.equal(tradeConfirmationCurrent(action, [{ ...trade, revision: 8 }]), false);
  assert.equal(tradeConfirmationCurrent(action, []), false);
  for (const status of ["LOCKING", "SETTLING", "CANCELLING"]) assert.equal(pendingTrade({ status }), true);
  for (const status of ["OPEN", "COMPLETED", "CANCELLED", "EXPIRED"]) assert.equal(pendingTrade({ status }), false);
});
