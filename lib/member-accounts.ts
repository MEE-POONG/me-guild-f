import { randomInt } from "node:crypto";
import { Prisma, type MemberIdentity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMemberCode } from "@/lib/member-mail";
import { challengeDigest, hashPassword, MAX_CHALLENGE_ATTEMPTS, privateDigest, validPassword } from "@/lib/member-security";

export async function consumeRateLimit(scope: string, subject: string, limit: number, windowMs = 15 * 60_000) {
  const window = Math.floor(Date.now() / windowMs);
  const bucket = privateDigest(`member-rate:${scope}:${subject}:${window}`);
  const input = { where: { bucket }, create: { bucket, count: 1, expiresAt: new Date((window + 1) * windowMs) }, update: { count: { increment: 1 } } };
  let record;
  try { record = await prisma.memberAuthRateLimit.upsert(input); }
  catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    record = await prisma.memberAuthRateLimit.update({ where: { bucket }, data: { count: { increment: 1 } } });
  }
  return record.count <= limit;
}

export async function sendChallenge(identity: MemberIdentity, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const code = String(randomInt(10_000_000, 100_000_000));
  const tokenHash = challengeDigest(identity.email, purpose, code);
  const data = { identityId: identity.id, email: identity.email, purpose, tokenHash, authVersion: identity.authVersion, attempts: 0, expiresAt: new Date(Date.now() + 15 * 60_000), consumedAt: null, createdAt: new Date() };
  await prisma.memberAuthChallenge.upsert({ where: { email_purpose: { email: identity.email, purpose } }, create: data, update: data });
  try { await sendMemberCode(identity.email, code, purpose); }
  catch {
    await prisma.memberAuthChallenge.deleteMany({ where: { email: identity.email, purpose, tokenHash } });
    throw new Error("EMAIL_DELIVERY_UNAVAILABLE");
  }
}

/** Consume and apply in one MongoDB transaction: a raced or replayed code never succeeds twice. */
export async function completeChallenge(email: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD", code: string, password?: string, database: Pick<typeof prisma, "$transaction"> = prisma) {
  if (!validPassword(password)) return false;
  const tokenHash = challengeDigest(email, purpose, code);
  const passwordHash = await hashPassword(password);
  return database.$transaction(async (tx) => {
    const challenge = await tx.memberAuthChallenge.findUnique({ where: { email_purpose: { email, purpose } } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) return false;
    // Count failed attempts without throwing; the transaction must commit the counter.
    if (challenge.tokenHash !== tokenHash) {
      await tx.memberAuthChallenge.updateMany({ where: { id: challenge.id, tokenHash: challenge.tokenHash, consumedAt: null, attempts: { lt: MAX_CHALLENGE_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
      return false;
    }
    const consumed = await tx.memberAuthChallenge.updateMany({ where: { id: challenge.id, tokenHash, consumedAt: null, attempts: { lt: MAX_CHALLENGE_ATTEMPTS }, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) return false;
    const updated = await tx.memberIdentity.updateMany({
      where: { id: challenge.identityId, email, isActive: true, authVersion: challenge.authVersion },
      data: { passwordHash, emailVerifiedAt: new Date(), authVersion: { increment: 1 } },
    });
    return updated.count === 1;
  });
}

export async function resolveOAuthIdentity(provider: string, providerAccountId: string, email: string, name: string, avatarUrl?: string | null, database: Pick<typeof prisma, "$transaction"> = prisma) {
  return database.$transaction(async (tx) => {
    const linked = await tx.memberOAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } } });
    if (linked) {
      const identity = await tx.memberIdentity.findUnique({ where: { id: linked.identityId } });
      // Provider address changes require explicit account recovery; never silently migrate ownership.
      return identity?.isActive && identity.emailVerifiedAt && identity.email === email ? identity : null;
    }
    const existing = await tx.memberIdentity.findUnique({ where: { email } });
    if (existing && (!existing.isActive || !existing.emailVerifiedAt)) return null;
    const identity = existing ?? await tx.memberIdentity.create({ data: { email, displayName: name.slice(0, 80), avatarUrl, emailVerifiedAt: new Date() } });
    await tx.memberOAuthAccount.create({ data: { identityId: identity.id, provider, providerAccountId } });
    return identity;
  });
}
