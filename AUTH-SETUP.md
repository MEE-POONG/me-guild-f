# Member accounts

The public website has email/password registration, email verification, Google and Discord sign-in, password recovery, and an authenticated profile editor. Public members do not receive Office access. Office approval and permissions remain a separate authentication system.

## Configuration

Copy `.env.example` to the checkout's `.env`, or set an explicit `ME_GUILD_ENV_FILE`. Keep `NEXTAUTH_SECRET` random, at least 32 characters, and different from the Office secret. `DATABASE_URL` must use a MongoDB replica set because challenge consumption, OAuth linking, and profile replacement use transactions.

Configure `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (legacy `CLIENT_ID` / `CLIENT_SECRET` are accepted) and `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`. Register these callback URLs for the exact public origin:

- `/api/auth/google/callback`
- `/api/auth/callback/discord`

Both providers must return a verified email. Existing verified member accounts with the same email are linked to the same stable member ID; an unverified email/password account must first verify or recover its password. Provider access tokens are not persisted. A provider changing its email does not silently transfer ownership.

Configure SMTP host, port, sender and optional username/password. `SMTP_PASS` is accepted as an alias for `SMTP_PASSWORD`; the existing `MAIL_USER` / `MAIL_PASS` configuration uses Gmail SMTP with `MAIL_USER` as sender when explicit SMTP settings are absent. TLS is required by default on port 587; use implicit TLS on port 465. `SMTP_REQUIRE_TLS=false` is intended for an isolated local SMTP test sink. Unconfigured mail fails visibly before creating a new account. Authentication codes are only delivered through email; no response or application log contains codes or password hashes.

## Database rollout

The Office schema is the canonical schema for the shared database. Reconcile these additive models and the `MemberProfile.identityId` index there before applying any database changes; do not independently push a partial public schema over the shared database. Run `npm run prisma:generate` in this app after schema synchronization. Legacy `UserDB` and existing `MemberProfile.ownerEmail` records are preserved. A profile binds to the verified immutable member email and stable identity when first saved.

New collections: `MeGuildMemberIdentity`, `MeGuildMemberOAuthAccount`, `MeGuildMemberAuthChallenge`, `MeGuildMemberAuthRateLimit`. Ensure their declared unique indexes exist before enabling signups. A scheduled database maintenance job may remove expired rate-limit records and expired/consumed challenges using the `expiresAt` field; keep that job scoped to these two authentication collections.

## Behavior and validation

- Passwords use salted scrypt; new passwords must be 12–128 characters.
- Registration stores an email and display name; the inbox owner sets their password while completing email verification. A pre-registered address or resent code can never activate a password chosen by someone else before verification.
- Email codes have eight digits, expire after 15 minutes, allow five failed attempts, and can only be consumed once. Request and login limits are persisted across workers.
- Password recovery increments `authVersion`, invalidating all prior sessions and outstanding older codes. The database identity and its active/verified status are checked whenever a JWT session is read.
- All account mutations require the configured same origin and JSON. NextAuth login/sign-out also uses its CSRF protection. Member cookies are isolated from Office cookies, including when both apps use different localhost ports.
- `/profile` and `/api/profile/settings` require a current member session. Profile edits commit together, and failed saves remain visibly unsaved.

Local checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run prisma:validate`, `npm run build -- --webpack`. Real Google/Discord callbacks and SMTP inbox delivery still require the intended provider registrations and delivery environment.
