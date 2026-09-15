import assert from "node:assert/strict";
import test from "node:test";
import { completeChallenge, resolveOAuthIdentity } from "../lib/member-accounts";
import { prisma } from "../lib/prisma";
import { challengeDigest, hashPassword, verifyPassword } from "../lib/member-security";

test("email ownership completion replaces preregistered passwords and prevents replay", async () => {
  const oldSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "isolated-service-test-secret-at-least-32-chars";
  const email = "owner@example.test";
  const attackerPassword = "attacker selected password";
  const ownerPassword = "owner selected secure password";
  const identity = { id: "identity", email, isActive: true, authVersion: 0, passwordHash: await hashPassword(attackerPassword), emailVerifiedAt: null as Date | null };
  const challenge = { id: "challenge", identityId: identity.id, email, purpose: "VERIFY_EMAIL", tokenHash: challengeDigest(email, "VERIFY_EMAIL", "12345678"), authVersion: 0, attempts: 0, expiresAt: new Date(Date.now() + 60_000), consumedAt: null as Date | null };
  const tx = {
    memberAuthChallenge: {
      findUnique: async () => ({ ...challenge }),
      updateMany: async ({ data }: { data: { attempts?: { increment: number }; consumedAt?: Date } }) => {
        if (challenge.consumedAt || challenge.attempts >= 5 || challenge.expiresAt <= new Date()) return { count: 0 };
        if (data.attempts) challenge.attempts += data.attempts.increment;
        if (data.consumedAt) challenge.consumedAt = data.consumedAt;
        return { count: 1 };
      },
    },
    memberIdentity: {
      updateMany: async ({ where, data }: { where: { authVersion: number }; data: { passwordHash: string; emailVerifiedAt: Date; authVersion: { increment: number } } }) => {
        if (identity.authVersion !== where.authVersion) return { count: 0 };
        identity.passwordHash = data.passwordHash;
        identity.emailVerifiedAt = data.emailVerifiedAt;
        identity.authVersion += data.authVersion.increment;
        return { count: 1 };
      },
    },
  };
  const database = { $transaction: async (callback: (client: unknown) => unknown) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
  const complete = (code: string, password?: string) => completeChallenge(email, "VERIFY_EMAIL", code, password, database);
  try {
    assert.equal(await complete("12345678"), false, "resend cannot activate a preexisting password without ownership-time password setup");
    assert.equal(identity.emailVerifiedAt, null);
    assert.equal(await complete("00000000", ownerPassword), false);
    assert.equal(challenge.attempts, 1, "failed guesses consume the persisted attempt budget");
    assert.equal(await complete("12345678", ownerPassword), true);
    assert.equal(await verifyPassword(ownerPassword, identity.passwordHash), true);
    assert.equal(await verifyPassword(attackerPassword, identity.passwordHash), false, "attacker preregistration credentials must never become valid");
    assert.equal(identity.authVersion, 1);
    assert.ok(identity.emailVerifiedAt);
    assert.equal(await complete("12345678", "another owner password"), false, "consumed codes cannot reset the account again");
    challenge.consumedAt = null;
    assert.equal(await complete("12345678", ownerPassword), false, "outstanding older-version challenges cannot modify a recovered identity");
    challenge.consumedAt = null;
    challenge.attempts = 5;
    assert.equal(await complete("12345678", ownerPassword), false, "exhausted challenges reject even a correct code");
    challenge.attempts = 0;
    challenge.expiresAt = new Date(Date.now() - 1);
    assert.equal(await complete("12345678", ownerPassword), false, "expired challenges reject a correct code");
  } finally {
    if (oldSecret === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = oldSecret;
  }
});

test("OAuth creates stable identities, safely links verified emails, and rejects ownership changes", async () => {
  type Identity = { id: string; email: string; displayName: string; avatarUrl?: string | null; isActive: boolean; emailVerifiedAt: Date | null };
  const identities: Identity[] = [];
  const links: { identityId: string; provider: string; providerAccountId: string }[] = [];
  const tx = {
    memberIdentity: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => identities.find(identity => where.id ? identity.id === where.id : identity.email === where.email) ?? null,
      create: async ({ data }: { data: Omit<Identity, "id" | "isActive"> }) => { const identity = { ...data, id: `member-${identities.length + 1}`, isActive: true }; identities.push(identity); return identity; },
    },
    memberOAuthAccount: {
      findUnique: async ({ where }: { where: { provider_providerAccountId: { provider: string; providerAccountId: string } } }) => links.find(link => link.provider === where.provider_providerAccountId.provider && link.providerAccountId === where.provider_providerAccountId.providerAccountId) ?? null,
      create: async ({ data }: { data: { identityId: string; provider: string; providerAccountId: string } }) => { links.push(data); return data; },
    },
  };
  const database = { $transaction: async (callback: (client: unknown) => unknown) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
  const resolve = (provider: string, id: string, email: string) => resolveOAuthIdentity(provider, id, email, "Provider name", null, database);
  const member = await resolve("google", "google-1", "owner@example.test");
  assert.ok(member);
  assert.equal(identities.length, 1);
  assert.equal(links.length, 1);
  assert.ok(member.emailVerifiedAt);
  const linked = await resolve("discord", "discord-1", "owner@example.test");
  assert.equal(linked?.id, member.id, "different verified providers with one email share one identity");
  assert.equal(identities.length, 1);
  assert.equal(links.length, 2);
  const repeat = await resolve("google", "google-1", "owner@example.test");
  assert.equal(repeat?.id, member.id);
  assert.equal(links.length, 2, "repeat logins do not recreate links");
  assert.equal(await resolve("google", "google-1", "different@example.test"), null, "provider email changes cannot transfer a linked account");
  identities.push({ id: "unverified", email: "pending@example.test", displayName: "Pending", isActive: true, emailVerifiedAt: null });
  assert.equal(await resolve("google", "google-pending", "pending@example.test"), null, "an existing unverified password identity needs inbox recovery before linking");
  member.isActive = false;
  assert.equal(await resolve("google", "google-1", "owner@example.test"), null, "existing links cannot bypass deactivation");
  assert.equal(await resolve("discord", "discord-new", "owner@example.test"), null, "new providers cannot bypass deactivation");
  assert.equal(links.length, 2);
});
