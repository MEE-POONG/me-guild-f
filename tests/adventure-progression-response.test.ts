import assert from "node:assert/strict";
import test from "node:test";
import { readProgression } from "../container/adventure/use-adventure-progression";

// Wire fixture for a freshly registered adventurer; independent of the UI's builder.
const registered = {
  ruleVersion: "community-v1", totalXp: 0, level: 1,
  rank: { level: 1, title: "นักผจญภัยฝึกหัด" },
  levelStartXp: 0, nextLevelXp: 100, xpIntoLevel: 0, xpForNextLevel: 100,
  xpRemaining: 100, progressPercent: 0, isMaxLevel: false,
  milestones: [
    { level: 1, title: "นักผจญภัยฝึกหัด", totalXp: 0, reached: true },
    { level: 5, title: "นักสำรวจ", totalXp: 700, reached: false },
    { level: 10, title: "นักผจญภัย", totalXp: 2700, reached: false },
    { level: 20, title: "ผู้ร่วมสร้าง", totalXp: 10450, reached: false },
    { level: 35, title: "ผู้จารึกเรื่องราว", totalXp: 31450, reached: false },
    { level: 50, title: "ตำนานแห่ง Me Guild", totalXp: 63700, reached: false },
  ],
  metrics: { participatedEvents: 0, approvedEvents: 0, earnedAchievements: 0 },
  recentCredits: [],
};

function fetchResponse(body: unknown, status = 200): typeof fetch {
  return async (url, options) => {
    assert.equal(url, "/api/adventure/progression");
    assert.equal(options?.credentials, "same-origin");
    assert.equal(options?.cache, "no-store");
    return Response.json(body, { status });
  };
}

test("registered level-one response accepts the backend's adventurer rank", async () => {
  const result = await readProgression(new AbortController().signal, fetchResponse(registered));
  assert.deepEqual(result, { status: "ready", snapshot: registered });
});

test("registration-required response offers onboarding without a fake progression snapshot", async () => {
  const result = await readProgression(new AbortController().signal, fetchResponse({ code: "ADVENTURER_REGISTRATION_REQUIRED" }, 403));
  assert.deepEqual(result, { status: "visitor", snapshot: null });
  const denied = await readProgression(new AbortController().signal, fetchResponse({ code: "MEMBER_FORBIDDEN" }, 403));
  assert.deepEqual(denied, { status: "error", snapshot: null });
});

test("a mismatched rank or milestone still fails closed", async () => {
  for (const snapshot of [
    { ...registered, rank: { level: 1, title: "ผู้มาเยือน" } },
    { ...registered, milestones: registered.milestones.map((entry, index) => index === 0 ? { ...entry, title: "ผู้มาเยือน" } : entry) },
  ]) {
    await assert.rejects(readProgression(new AbortController().signal, fetchResponse(snapshot)), /progression-shape/);
  }
});
