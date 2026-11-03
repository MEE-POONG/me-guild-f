import assert from "node:assert/strict";
import test from "node:test";
import { invalidTradeQuantities, marketAssetPage, reconcileTradeAssets, tradeAssetLimit, type MarketAsset } from "../lib/marketplace-assets";

const flower: MarketAsset = { key: "flower", name: "ดอกไม้", quantity: 2, imageUrl: "/flower.png" };
const ticket: MarketAsset = { key: "ticket:guild", name: "ตั๋ว", quantity: 1, ticket: true };

test("an unsaved item removed by polling stays visible by name and must be removed or replenished before saving", () => {
  const quantities = { flower: "2" };
  assert.equal(invalidTradeQuantities(quantities, [flower]), false);
  assert.deepEqual(reconcileTradeAssets([], quantities, { flower }), [{ ...flower, quantity: 0 }]);
  assert.equal(invalidTradeQuantities(quantities, []), true);
  assert.equal(invalidTradeQuantities({ flower: "0" }, []), false);
  assert.deepEqual(reconcileTradeAssets([flower], quantities, { flower }), [flower]);
});

test("missing ticket balances cannot validate a positive saved ticket offer", () => {
  const quantities = { [ticket.key]: "1" };
  assert.deepEqual(reconcileTradeAssets([], quantities, { [ticket.key]: ticket }), [{ ...ticket, quantity: 0 }]);
  assert.equal(invalidTradeQuantities(quantities, []), true);
  assert.equal(invalidTradeQuantities(quantities, [ticket]), false);
  assert.equal(invalidTradeQuantities({ [ticket.key]: "0" }, []), false);
});

test("unknown draft keys and malformed quantities never bypass availability validation", () => {
  assert.equal(invalidTradeQuantities({ unknown: "1" }, [flower]), true);
  assert.equal(reconcileTradeAssets([], { unknown: "1" }, {})[0].quantity, 0);
  for (const quantity of ["", "1.5", "-1", "3"]) assert.equal(invalidTradeQuantities({ flower: quantity }, [flower]), true);
  assert.equal(invalidTradeQuantities({ flower: "02" }, [flower]), false);
});

test("picker limits honor both available quantity and the trade maximum", () => {
  assert.equal(tradeAssetLimit(flower), 2);
  assert.equal(tradeAssetLimit({ ...flower, quantity: 2_000_000 }), 1_000_000);
  assert.equal(tradeAssetLimit({ ...flower, quantity: -1 }), 0);
  assert.equal(tradeAssetLimit({ ...flower, quantity: Number.NaN }), 0);
  assert.equal(invalidTradeQuantities({ flower: "1,000,000" }, [{ ...flower, quantity: 2_000_000 }]), false);
  assert.equal(invalidTradeQuantities({ flower: "1,000,001" }, [{ ...flower, quantity: 2_000_000 }]), true);
});

test("pages do not lose assets and recover when inventory or search results shrink", () => {
  const assets = Array.from({ length: 25 }, (_, index) => ({ ...flower, key: String(index), name: `ดอกไม้ ${index}` }));
  assert.deepEqual([0, 1, 2].flatMap(page => marketAssetPage(assets, "", page).shown).map(asset => asset.key), assets.map(asset => asset.key));
  assert.deepEqual(marketAssetPage(assets.slice(0, 5), "", 2).shown, assets.slice(0, 5));
  assert.equal(marketAssetPage(assets, "ดอกไม้ 24", 2).current, 0);
  assert.equal(marketAssetPage(assets, "ไม่พบ", 2).pages, 1);
  assert.equal(marketAssetPage(assets, "", -1).current, 0);
});
