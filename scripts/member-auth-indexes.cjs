/* eslint-disable @typescript-eslint/no-require-imports -- standalone additive migration */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

// Create only the indexes owned by member authentication. Never push the shared schema.
const plans = [
  ["MeGuildMemberIdentity", [{ key: { email: 1 }, name: "MeGuildMemberIdentity_email_key", unique: true }]],
  ["MeGuildMemberOAuthAccount", [
    { key: { provider: 1, providerAccountId: 1 }, name: "MeGuildMemberOAuthAccount_provider_providerAccountId_key", unique: true },
    { key: { identityId: 1 }, name: "MeGuildMemberOAuthAccount_identityId_idx" },
  ]],
  ["MeGuildMemberAuthChallenge", [
    { key: { email: 1, purpose: 1 }, name: "MeGuildMemberAuthChallenge_email_purpose_key", unique: true },
    { key: { expiresAt: 1 }, name: "MeGuildMemberAuthChallenge_expiresAt_idx" },
  ]],
  ["MeGuildMemberAuthRateLimit", [
    { key: { bucket: 1 }, name: "MeGuildMemberAuthRateLimit_bucket_key", unique: true },
    { key: { expiresAt: 1 }, name: "MeGuildMemberAuthRateLimit_expiresAt_idx" },
  ]],
];
(async () => {
  for (const [collection, indexes] of plans) {
    await db.$runCommandRaw({ createIndexes: collection, indexes });
    console.log(`${collection}: indexes ready`);
  }
})().catch(() => {
  console.error("Member index migration failed; verify connectivity, privileges and duplicate identities.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
